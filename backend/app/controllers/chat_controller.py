from datetime import datetime, timezone

from app.core.exceptions import AppError
from app.models import collections
from app.services.notification_service import create_notification
from app.utils.bson_utils import serialize_doc, serialize_many, to_object_id
from app.utils.datetime_utils import utc_now


def _conversation_access_check(conversation: dict, user_id: str):
    participant_ids = [str(pid) for pid in conversation.get("participants", [])]
    if user_id not in participant_ids:
        raise AppError(status_code=403, message="You are not part of this conversation")


async def _touch_user_presence(db, user_id: str):
    await db[collections.USERS].update_one(
        {"_id": to_object_id(user_id)},
        {"$set": {"lastSeenAt": utc_now(), "updatedAt": utc_now()}},
    )


async def create_or_get_conversation_controller(db, payload, current_user):
    await _touch_user_presence(db, current_user["id"])
    user_oid = to_object_id(current_user["id"])
    other_oid = to_object_id(payload.otherUserId)
    if str(user_oid) == str(other_oid):
        raise AppError(status_code=400, message="Cannot start a conversation with yourself")

    other_user = await db[collections.USERS].find_one({"_id": other_oid})
    if not other_user:
        raise AppError(status_code=404, message="Other user not found")

    participant_key = ":".join(sorted([str(user_oid), str(other_oid)]))
    pg_oid = to_object_id(payload.pgId) if payload.pgId else None
    conversation = await db[collections.CONVERSATIONS].find_one(
        {
            "participantKey": participant_key,
            "pg": pg_oid,
            "isDeleted": False,
        }
    )
    if not conversation:
        # Backward-compatible fallback for older rows without participantKey.
        conversation = await db[collections.CONVERSATIONS].find_one(
            {
                "participants": {"$all": [user_oid, other_oid], "$size": 2},
                "pg": pg_oid,
                "isDeleted": False,
            }
        )
    if conversation:
        return {"success": True, "message": "Conversation ready", "data": serialize_doc(conversation)}

    now = utc_now()
    doc = {
        "participants": [user_oid, other_oid],
        "participantKey": participant_key,
        "pg": pg_oid,
        "lastMessage": "",
        "lastMessageAt": now,
        "lastMessageSender": user_oid,
        "unreadCounts": {str(user_oid): 0, str(other_oid): 0},
        "isDeleted": False,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db[collections.CONVERSATIONS].insert_one(doc)
    conversation = await db[collections.CONVERSATIONS].find_one({"_id": result.inserted_id})
    return {"success": True, "message": "Conversation created", "data": serialize_doc(conversation)}


async def list_conversations_controller(db, current_user):
    await _touch_user_presence(db, current_user["id"])
    user_oid = to_object_id(current_user["id"])
    rows = await db[collections.CONVERSATIONS].find(
        {"participants": user_oid, "isDeleted": False}
    ).sort("updatedAt", -1).to_list(length=200)

    if not rows:
        return {"success": True, "count": 0, "data": []}

    user_ids = set()
    pg_ids = set()
    for c in rows:
        for p in c.get("participants", []):
            user_ids.add(p)
        if c.get("pg"):
            pg_ids.add(c["pg"])

    users = await db[collections.USERS].find({"_id": {"$in": list(user_ids)}}, {"name": 1, "email": 1, "lastSeenAt": 1}).to_list(length=500)
    user_map = {str(u["_id"]): serialize_doc(u) for u in users}

    pg_map = {}
    if pg_ids:
        pgs = await db[collections.PGS].find({"_id": {"$in": list(pg_ids)}}, {"title": 1}).to_list(length=500)
        pg_map = {str(pg["_id"]): serialize_doc(pg) for pg in pgs}

    payload = []
    seen_keys = set()
    for c in rows:
        # Hide threads that have not started yet.
        if not (c.get("lastMessage") or "").strip():
            continue

        item = serialize_doc(c)
        participant_ids = [str(pid) for pid in c.get("participants", [])]
        other_id = next((pid for pid in participant_ids if pid != current_user["id"]), None)
        dedupe_key = f"{other_id}:{str(c.get('pg') or '')}"
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        item["otherUser"] = user_map.get(other_id) if other_id else None
        if item["otherUser"]:
            last_seen = item["otherUser"].get("lastSeenAt")
            is_online = False
            if last_seen:
                last_seen_dt = None
                if isinstance(last_seen, datetime):
                    last_seen_dt = last_seen
                elif isinstance(last_seen, str):
                    try:
                        last_seen_dt = datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
                    except ValueError:
                        last_seen_dt = None
                if last_seen_dt is not None:
                    now_dt = datetime.now(timezone.utc)
                    if last_seen_dt.tzinfo is None:
                        last_seen_dt = last_seen_dt.replace(tzinfo=timezone.utc)
                    delta = (now_dt - last_seen_dt).total_seconds()
                    is_online = delta <= 120
            item["otherUser"]["isOnline"] = is_online
        item["pg"] = pg_map.get(str(c.get("pg"))) if c.get("pg") else None
        item["unreadCount"] = (c.get("unreadCounts") or {}).get(current_user["id"], 0)
        payload.append(item)

    return {"success": True, "count": len(payload), "data": payload}


async def list_messages_controller(db, conversation_id: str, current_user, page: int, limit: int):
    await _touch_user_presence(db, current_user["id"])
    conversation = await db[collections.CONVERSATIONS].find_one({"_id": to_object_id(conversation_id), "isDeleted": False})
    if not conversation:
        raise AppError(status_code=404, message="Conversation not found")
    _conversation_access_check(conversation, current_user["id"])

    skip = (page - 1) * limit
    docs = await db[collections.MESSAGES].find(
        {
            "conversationId": to_object_id(conversation_id),
            "isDeleted": False,
            "isDeletedForEveryone": {"$ne": True},
            "deletedFor": {"$ne": to_object_id(current_user["id"])},
        }
    ).sort("createdAt", 1).skip(skip).limit(limit).to_list(length=limit)

    user_ids = list({msg["senderId"] for msg in docs if msg.get("senderId")})
    user_map = {}
    if user_ids:
        users = await db[collections.USERS].find({"_id": {"$in": user_ids}}, {"name": 1, "email": 1}).to_list(length=500)
        user_map = {str(u["_id"]): serialize_doc(u) for u in users}

    payload = []
    for msg in docs:
        item = serialize_doc(msg)
        sender_id = str(msg["senderId"]) if msg.get("senderId") else None
        item["sender"] = user_map.get(sender_id)
        item["isMine"] = sender_id == current_user["id"]
        read_by = [str(uid) for uid in msg.get("readBy", [])]
        item["isSeenByOther"] = item["isMine"] and any(uid != current_user["id"] for uid in read_by)
        payload.append(item)

    return {"success": True, "count": len(payload), "data": payload}


async def send_message_controller(db, conversation_id: str, payload, current_user):
    await _touch_user_presence(db, current_user["id"])
    conversation = await db[collections.CONVERSATIONS].find_one({"_id": to_object_id(conversation_id), "isDeleted": False})
    if not conversation:
        raise AppError(status_code=404, message="Conversation not found")
    _conversation_access_check(conversation, current_user["id"])

    text = payload.text.strip()
    if not text:
        raise AppError(status_code=400, message="Message cannot be empty")

    now = utc_now()
    sender_oid = to_object_id(current_user["id"])
    msg_doc = {
        "conversationId": to_object_id(conversation_id),
        "senderId": sender_oid,
        "text": text,
        "readBy": [sender_oid],
        "deletedFor": [],
        "isDeletedForEveryone": False,
        "isDeleted": False,
        "createdAt": now,
        "updatedAt": now,
    }
    msg_result = await db[collections.MESSAGES].insert_one(msg_doc)

    unread_counts = dict(conversation.get("unreadCounts") or {})
    participant_ids = [str(pid) for pid in conversation.get("participants", [])]
    for pid in participant_ids:
        unread_counts[pid] = 0 if pid == current_user["id"] else int(unread_counts.get(pid, 0)) + 1

    await db[collections.CONVERSATIONS].update_one(
        {"_id": conversation["_id"]},
        {
            "$set": {
                "lastMessage": text[:500],
                "lastMessageAt": now,
                "lastMessageSender": sender_oid,
                "unreadCounts": unread_counts,
                "updatedAt": now,
            }
        },
    )

    # User notification for other participant(s).
    for pid in conversation.get("participants", []):
        if str(pid) == current_user["id"]:
            continue
        await create_notification(
            db,
            message=f"New message from {current_user['name']}: {text[:80]}",
            notification_type="CHAT_MESSAGE",
            user_id=pid,
            related_id=conversation["_id"],
            is_admin_notification=False,
        )

    saved = await db[collections.MESSAGES].find_one({"_id": msg_result.inserted_id})
    item = serialize_doc(saved)
    item["isMine"] = True
    item["sender"] = {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}
    return {"success": True, "message": "Message sent", "data": item}


async def mark_conversation_read_controller(db, conversation_id: str, current_user):
    await _touch_user_presence(db, current_user["id"])
    conversation = await db[collections.CONVERSATIONS].find_one({"_id": to_object_id(conversation_id), "isDeleted": False})
    if not conversation:
        raise AppError(status_code=404, message="Conversation not found")
    _conversation_access_check(conversation, current_user["id"])

    unread_counts = dict(conversation.get("unreadCounts") or {})
    unread_counts[current_user["id"]] = 0
    await db[collections.CONVERSATIONS].update_one(
        {"_id": conversation["_id"]},
        {"$set": {"unreadCounts": unread_counts, "updatedAt": utc_now()}},
    )
    await db[collections.MESSAGES].update_many(
        {
            "conversationId": conversation["_id"],
            "senderId": {"$ne": to_object_id(current_user["id"])},
            "readBy": {"$ne": to_object_id(current_user["id"])},
            "isDeleted": False,
        },
        {"$addToSet": {"readBy": to_object_id(current_user["id"])}, "$set": {"updatedAt": utc_now()}},
    )
    await db[collections.NOTIFICATIONS].update_many(
        {
            "type": "CHAT_MESSAGE",
            "userId": to_object_id(current_user["id"]),
            "relatedId": conversation["_id"],
            "isRead": False,
        },
        {"$set": {"isRead": True, "updatedAt": utc_now()}},
    )
    return {"success": True, "message": "Conversation marked as read"}


async def delete_message_controller(db, message_id: str, payload, current_user):
    await _touch_user_presence(db, current_user["id"])
    message = await db[collections.MESSAGES].find_one({"_id": to_object_id(message_id), "isDeleted": False})
    if not message:
        raise AppError(status_code=404, message="Message not found")

    conversation = await db[collections.CONVERSATIONS].find_one({"_id": message["conversationId"], "isDeleted": False})
    if not conversation:
        raise AppError(status_code=404, message="Conversation not found")
    _conversation_access_check(conversation, current_user["id"])

    mode = (payload.mode or "me").strip().lower()
    user_oid = to_object_id(current_user["id"])

    if mode == "everyone":
        if str(message.get("senderId")) != current_user["id"]:
            raise AppError(status_code=403, message="Only sender can delete for everyone")
        await db[collections.MESSAGES].update_one(
            {"_id": message["_id"]},
            {"$set": {"isDeletedForEveryone": True, "updatedAt": utc_now()}},
        )
        return {"success": True, "message": "Message deleted for everyone"}

    await db[collections.MESSAGES].update_one(
        {"_id": message["_id"]},
        {"$addToSet": {"deletedFor": user_oid}, "$set": {"updatedAt": utc_now()}},
    )
    return {"success": True, "message": "Message deleted for you"}
