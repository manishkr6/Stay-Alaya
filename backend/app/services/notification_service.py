from app.models import collections
from app.utils.datetime_utils import utc_now


async def create_notification(
    db,
    *,
    message: str,
    notification_type: str,
    user_id=None,
    related_id=None,
    is_admin_notification: bool = True,
):
    payload = {
        "message": message,
        "type": notification_type,
        "isAdminNotification": is_admin_notification,
        "isRead": False,
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
    }
    if user_id is not None:
        payload["userId"] = user_id
    if related_id is not None:
        payload["relatedId"] = related_id
    result = await db[collections.NOTIFICATIONS].insert_one(payload)
    payload["_id"] = result.inserted_id
    return payload


async def unread_count_for_actor(db, *, role: str, user_object_id=None) -> int:
    query = {"isRead": False, "type": {"$ne": "CHAT_MESSAGE"}}
    if role == "admin":
        query["isAdminNotification"] = True
    else:
        query["isAdminNotification"] = False
        query["userId"] = user_object_id
    return await db[collections.NOTIFICATIONS].count_documents(query)
