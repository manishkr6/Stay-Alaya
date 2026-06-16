from app.core.exceptions import AppError
from app.models import collections
from app.services.notification_service import unread_count_for_actor
from app.utils.bson_utils import serialize_doc, serialize_many, to_object_id
from app.utils.response import paginated_response
from app.utils.datetime_utils import utc_now


async def get_notifications_controller(db, current_user, query):
    filter_query = {}
    user_oid = to_object_id(current_user["id"])

    if current_user["role"] == "admin":
        filter_query["isAdminNotification"] = True
    else:
        filter_query["isAdminNotification"] = False
        filter_query["userId"] = user_oid

    # Chat unread is shown in Messages, not Notifications.
    filter_query["type"] = {"$ne": "CHAT_MESSAGE"}

    if query.type and query.type != "ALL":
        filter_query["type"] = query.type
    if query.isRead is not None:
        filter_query["isRead"] = query.isRead

    page = query.page
    limit = query.limit
    skip = (page - 1) * limit

    cursor = db[collections.NOTIFICATIONS].find(filter_query).sort("createdAt", -1).skip(skip).limit(limit)
    notifications = await cursor.to_list(length=limit)
    total = await db[collections.NOTIFICATIONS].count_documents(filter_query)
    unread = await db[collections.NOTIFICATIONS].count_documents({**filter_query, "isRead": False})

    return paginated_response(
        data=serialize_many(notifications),
        total=total,
        page=page,
        limit=limit,
        extra={"unreadCount": unread},
    )


async def mark_all_read_controller(db, current_user):
    query = {"isRead": False, "type": {"$ne": "CHAT_MESSAGE"}}
    if current_user["role"] == "admin":
        query["isAdminNotification"] = True
    else:
        query["isAdminNotification"] = False
        query["userId"] = to_object_id(current_user["id"])

    await db[collections.NOTIFICATIONS].update_many(query, {"$set": {"isRead": True, "updatedAt": utc_now()}})
    return {"success": True, "message": "All notifications marked as read"}


async def mark_one_read_controller(db, notification_id: str, current_user):
    notification = await db[collections.NOTIFICATIONS].find_one({"_id": to_object_id(notification_id)})
    if not notification:
        raise AppError(status_code=404, message="Notification not found")

    if current_user["role"] != "admin" and str(notification.get("userId")) != current_user["id"]:
        raise AppError(status_code=403, message="Not authorized to modify this notification")

    await db[collections.NOTIFICATIONS].update_one(
        {"_id": notification["_id"]},
        {"$set": {"isRead": True, "updatedAt": utc_now()}},
    )
    updated = await db[collections.NOTIFICATIONS].find_one({"_id": notification["_id"]})
    return {"success": True, "data": serialize_doc(updated)}


async def get_unread_count_controller(db, current_user):
    count = await unread_count_for_actor(
        db,
        role=current_user["role"],
        user_object_id=to_object_id(current_user["id"]),
    )
    return {"success": True, "count": count}
