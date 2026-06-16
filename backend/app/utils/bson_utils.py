from typing import Any
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import AppError


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise AppError(status_code=400, message=f"Invalid ID: {value}") from exc


def serialize_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return None

    def _convert(value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        if isinstance(value, list):
            return [_convert(item) for item in value]
        if isinstance(value, dict):
            return {k: _convert(v) for k, v in value.items()}
        return value

    result = dict(doc)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    return {key: _convert(value) for key, value in result.items()}


def serialize_many(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [serialize_doc(doc) for doc in docs]
