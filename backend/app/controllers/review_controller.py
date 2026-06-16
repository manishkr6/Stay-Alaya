from app.core.exceptions import AppError
from app.models import collections
from app.services.notification_service import create_notification
from app.utils.bson_utils import serialize_doc, to_object_id
from app.utils.datetime_utils import utc_now


async def recalculate_pg_rating(db, pg_object_id):
    pipeline = [
        {"$match": {"pg": pg_object_id}},
        {
            "$group": {
                "_id": "$pg",
                "avgRating": {"$avg": "$rating"},
                "count": {"$sum": 1},
            }
        },
    ]
    stats = await db[collections.REVIEWS].aggregate(pipeline).to_list(length=1)
    if stats:
        avg = round(float(stats[0]["avgRating"]), 1)
        count = int(stats[0]["count"])
    else:
        avg = 0.0
        count = 0

    await db[collections.PGS].update_one(
        {"_id": pg_object_id},
        {"$set": {"averageRating": avg, "totalReviews": count, "updatedAt": utc_now()}},
    )


async def get_pg_reviews_controller(db, pg_id: str):
    pg_object_id = to_object_id(pg_id)
    reviews = await db[collections.REVIEWS].find({"pg": pg_object_id}).sort("createdAt", -1).to_list(length=500)

    user_ids = [item.get("user") for item in reviews if item.get("user")]
    user_map = {}
    if user_ids:
        users = await db[collections.USERS].find({"_id": {"$in": user_ids}}, {"name": 1}).to_list(length=500)
        user_map = {str(user["_id"]): serialize_doc(user) for user in users}

    payload = []
    for item in reviews:
        row = serialize_doc(item)
        key = str(item.get("user")) if item.get("user") else None
        if key and key in user_map:
            row["user"] = user_map[key]
        payload.append(row)

    return {"success": True, "count": len(payload), "data": payload}


async def add_review_controller(db, pg_id: str, payload, current_user):
    pg_object_id = to_object_id(pg_id)
    pg = await db[collections.PGS].find_one({"_id": pg_object_id})
    if not pg or pg.get("isDeleted"):
        raise AppError(status_code=404, message="PG not found")
    if pg.get("status") != "approved":
        raise AppError(status_code=400, message="Can only review approved PGs")

    user_object_id = to_object_id(current_user["id"])
    if str(pg.get("owner")) == current_user["id"]:
        raise AppError(status_code=403, message="You can't review your own PG")

    existing = await db[collections.REVIEWS].find_one({"pg": pg_object_id, "user": user_object_id})
    if existing:
        raise AppError(status_code=400, message="You have already reviewed this PG")

    now = utc_now()
    doc = {
        "pg": pg_object_id,
        "user": user_object_id,
        "rating": int(payload.rating),
        "comment": payload.comment.strip(),
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db[collections.REVIEWS].insert_one(doc)
    doc["_id"] = result.inserted_id

    await recalculate_pg_rating(db, pg_object_id)
    await create_notification(
        db,
        message=f"New feedback on \"{pg.get('title', 'PG')}\": {payload.comment.strip()[:80]}",
        notification_type="FEEDBACK",
        user_id=user_object_id,
        related_id=pg_object_id,
        is_admin_notification=True,
    )

    user = await db[collections.USERS].find_one({"_id": user_object_id}, {"name": 1})
    row = serialize_doc(doc)
    row["user"] = serialize_doc(user) if user else None

    return {"success": True, "message": "Review submitted", "data": row}


async def delete_review_controller(db, review_id: str, current_user):
    review = await db[collections.REVIEWS].find_one({"_id": to_object_id(review_id)})
    if not review:
        raise AppError(status_code=404, message="Review not found")

    is_owner = str(review.get("user")) == current_user["id"]
    is_admin = current_user.get("role") == "admin"
    if not is_owner and not is_admin:
        raise AppError(status_code=403, message="Not authorized to delete this review")

    await db[collections.REVIEWS].delete_one({"_id": review["_id"]})
    await recalculate_pg_rating(db, review["pg"])

    return {"success": True, "message": "Review deleted"}
