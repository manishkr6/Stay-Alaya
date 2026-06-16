from datetime import timedelta, timezone

from app.core.exceptions import AppError
from app.core.security import create_access_token, hash_password, verify_password
from app.core.settings import get_settings
from app.models import collections
from app.services.auth_service import generate_otp, hash_value, otp_expiry_datetime, reset_token
from app.services.email_service import send_email
from app.services.notification_service import create_notification
from app.utils.bson_utils import serialize_doc, to_object_id
from app.utils.datetime_utils import utc_now


async def signup_controller(db, payload):
    email = payload.email.lower()
    user = await db[collections.USERS].find_one({"email": email})

    if user and user.get("isVerified", True):
        raise AppError(status_code=400, message="Email already registered")

    now = utc_now()
    base_fields = {
        "name": payload.name,
        "email": email,
        "password": hash_password(payload.password),
        "isVerified": False,
        "updatedAt": now,
    }

    if not user:
        base_fields.update(
            {
                "role": "user",
                "ownerRequestStatus": "none",
                "savedPGs": [],
                "isBlocked": False,
                "createdAt": now,
            }
        )
        insert_res = await db[collections.USERS].insert_one(base_fields)
        user = await db[collections.USERS].find_one({"_id": insert_res.inserted_id})
    else:
        await db[collections.USERS].update_one({"_id": user["_id"]}, {"$set": base_fields})
        user = await db[collections.USERS].find_one({"_id": user["_id"]})

    otp = generate_otp()
    await db[collections.USERS].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "otpCode": hash_value(otp),
                "otpPurpose": "signup",
                "otpExpiresAt": otp_expiry_datetime(now),
                "updatedAt": utc_now(),
            }
        },
    )

    html = build_otp_email_html(user.get("name"), otp, "signup")
    email_sent = True
    try:
        await send_email(to=email, subject="Stay Alaya - Signup OTP", html=html)
    except Exception:
        email_sent = False

    return {
        "success": True,
        "requiresOtp": True,
        "purpose": "signup",
        "email": email,
        "message": f"OTP sent to {email}." if email_sent else "OTP generated but email could not be sent.",
    }


async def login_controller(db, payload):
    email = payload.email.lower()
    user = await db[collections.USERS].find_one({"email": email})
    if not user or not verify_password(payload.password, user["password"]):
        raise AppError(status_code=401, message="Invalid email or password")
    if user.get("isBlocked"):
        raise AppError(status_code=403, message="Your account has been blocked by admin. Please contact support.")
    if user.get("isVerified") is False:
        raise AppError(status_code=403, message="Please verify your signup OTP first.")

    token = create_access_token(str(user["_id"]), user["role"])
    safe_user = sanitize_user(user)
    return token, safe_user


async def verify_otp_controller(db, payload):
    email = payload.email.lower()
    user = await db[collections.USERS].find_one({"email": email})
    if not user or not user.get("otpCode") or not user.get("otpExpiresAt"):
        raise AppError(status_code=400, message="No active OTP. Please request a new one.")

    if user.get("otpPurpose") != payload.purpose.value:
        raise AppError(status_code=400, message="OTP purpose mismatch. Please request a new OTP.")

    otp_expires_at = user["otpExpiresAt"]
    if getattr(otp_expires_at, "tzinfo", None) is not None:
        otp_expires_at = otp_expires_at.astimezone(timezone.utc).replace(tzinfo=None)

    if otp_expires_at < utc_now():
        await db[collections.USERS].update_one(
            {"_id": user["_id"]},
            {"$unset": {"otpCode": "", "otpExpiresAt": "", "otpPurpose": ""}},
        )
        raise AppError(status_code=400, message="OTP has expired. Please request a new OTP.")

    if hash_value(payload.otp.strip()) != user["otpCode"]:
        raise AppError(status_code=400, message="Invalid OTP")

    updates = {"updatedAt": utc_now()}
    unset_fields = {"otpCode": "", "otpExpiresAt": "", "otpPurpose": ""}

    if payload.purpose.value == "signup" and user.get("isVerified") is False:
        updates["isVerified"] = True
        await create_notification(
            db,
            message=f"New user registered: {user['name']} ({user['email']})",
            notification_type="USER_SIGNUP",
            user_id=user["_id"],
            related_id=user["_id"],
        )

    await db[collections.USERS].update_one(
        {"_id": user["_id"]},
        {"$set": updates, "$unset": unset_fields},
    )
    updated_user = await db[collections.USERS].find_one({"_id": user["_id"]})

    token = create_access_token(str(updated_user["_id"]), updated_user["role"])
    safe_user = sanitize_user(updated_user)
    return token, safe_user


async def resend_otp_controller(db, payload):
    email = payload.email.lower()
    user = await db[collections.USERS].find_one({"email": email})
    if not user:
        raise AppError(status_code=404, message="User not found")
    if user.get("isBlocked"):
        raise AppError(status_code=403, message="Your account has been blocked by admin. Please contact support.")
    if payload.purpose.value == "signup" and user.get("isVerified", True):
        raise AppError(status_code=400, message="Account is already verified. Please login.")

    otp = generate_otp()
    now = utc_now()
    await db[collections.USERS].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "otpCode": hash_value(otp),
                "otpPurpose": payload.purpose.value,
                "otpExpiresAt": otp_expiry_datetime(now),
                "updatedAt": now,
            }
        },
    )

    html = build_otp_email_html(user.get("name"), otp, payload.purpose.value)
    email_sent = True
    try:
        await send_email(
            to=email,
            subject=f"Stay Alaya - {payload.purpose.value.capitalize()} OTP",
            html=html,
        )
    except Exception:
        email_sent = False

    return {
        "success": True,
        "requiresOtp": True,
        "purpose": payload.purpose.value,
        "email": email,
        "message": f"OTP sent to {email}." if email_sent else "OTP generated but email could not be sent.",
    }


async def get_me_controller(db, current_user):
    user = await db[collections.USERS].find_one({"_id": to_object_id(current_user["id"])})
    if not user:
        raise AppError(status_code=404, message="User not found")

    saved_docs = []
    if user.get("savedPGs"):
        cursor = db[collections.PGS].find({"_id": {"$in": user.get("savedPGs", [])}})
        saved_docs = await cursor.to_list(length=500)

    payload = sanitize_user(user)
    payload["savedPGsData"] = [serialize_doc(doc) for doc in saved_docs]
    return {"success": True, "user": payload}


async def forgot_password_controller(db, payload):
    email = payload.email.lower()
    user = await db[collections.USERS].find_one({"email": email})
    if not user:
        return {"success": True, "message": "If that email exists, a reset link has been sent."}

    raw_token = reset_token()
    hashed_token = hash_value(raw_token)
    expire_at = utc_now() + timedelta(minutes=10)
    await db[collections.USERS].update_one(
        {"_id": user["_id"]},
        {"$set": {"resetPasswordToken": hashed_token, "resetPasswordExpire": expire_at, "updatedAt": utc_now()}},
    )

    settings = get_settings()
    reset_url = f"{settings.client_url}/reset-password/{raw_token}"
    html = f"""
    <div style=\"font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;\">
        <h2 style=\"color: #4F46E5;\">Reset Your Password</h2>
        <p>You requested a password reset for your Stay Alaya account.</p>
        <a href=\"{reset_url}\" style=\"display:inline-block;background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;\">Reset Password</a>
        <p style=\"color:#666;font-size:13px;\">If you didn't request this, ignore this email.</p>
    </div>
    """

    try:
        await send_email(to=email, subject="Stay Alaya - Password Reset", html=html)
    except Exception as exc:
        await db[collections.USERS].update_one(
            {"_id": user["_id"]},
            {"$unset": {"resetPasswordToken": "", "resetPasswordExpire": ""}},
        )
        raise AppError(status_code=500, message="Email could not be sent. Please try again later.") from exc

    return {"success": True, "message": "If that email exists, a reset link has been sent."}


async def reset_password_controller(db, token: str, password: str):
    hashed_token = hash_value(token)
    user = await db[collections.USERS].find_one(
        {
            "resetPasswordToken": hashed_token,
            "resetPasswordExpire": {"$gt": utc_now()},
        }
    )
    if not user:
        raise AppError(status_code=400, message="Invalid or expired reset token")

    await db[collections.USERS].update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hash_password(password), "updatedAt": utc_now()},
            "$unset": {"resetPasswordToken": "", "resetPasswordExpire": ""},
        },
    )
    updated = await db[collections.USERS].find_one({"_id": user["_id"]})
    token_value = create_access_token(str(updated["_id"]), updated["role"])
    return token_value, sanitize_user(updated)


def build_otp_email_html(name: str | None, otp: str, purpose: str) -> str:
    heading = "Verify your account" if purpose == "signup" else "Verify your login"
    body = "Use this OTP to complete your signup." if purpose == "signup" else "Use this OTP to complete your login."
    ttl = get_settings().otp_expires_minutes
    return f"""
    <div style=\"font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;\">
        <h2 style=\"color: #4F46E5;\">{heading}</h2>
        <p>Hi {name or 'there'},</p>
        <p>{body}</p>
        <div style=\"font-size:30px;font-weight:700;letter-spacing:8px;margin:20px 0;color:#111827;\">{otp}</div>
        <p>This OTP is valid for <strong>{ttl} minutes</strong>.</p>
        <p style=\"color:#666;font-size:13px;margin-top:12px;\">This message is from Stay Alaya.</p>
    </div>
    """


def sanitize_user(user_doc: dict) -> dict:
    user = serialize_doc(user_doc) or {}
    user.pop("password", None)
    user.pop("otpCode", None)
    user.pop("otpExpiresAt", None)
    user.pop("otpPurpose", None)
    user.pop("resetPasswordToken", None)
    user.pop("resetPasswordExpire", None)
    user.setdefault("savedPGs", [])
    user.setdefault("ownerRequestStatus", "none")
    user.setdefault("isBlocked", False)
    return user
