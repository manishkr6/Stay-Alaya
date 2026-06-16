from fastapi import APIRouter, Depends, Query

from app.config.db import get_database
from app.controllers.chat_controller import (
    create_or_get_conversation_controller,
    delete_message_controller,
    list_conversations_controller,
    list_messages_controller,
    mark_conversation_read_controller,
    send_message_controller,
)
from app.core.dependencies import get_current_user
from app.schemas.chat import CreateConversationRequest, DeleteMessageRequest, SendMessageRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/conversations")
async def create_conversation(payload: CreateConversationRequest, current_user=Depends(get_current_user), db=Depends(get_database)):
    return await create_or_get_conversation_controller(db, payload, current_user)


@router.get("/conversations")
async def list_conversations(current_user=Depends(get_current_user), db=Depends(get_database)):
    return await list_conversations_controller(db, current_user)


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    return await list_messages_controller(db, conversation_id, current_user, page, limit)


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    payload: SendMessageRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    return await send_message_controller(db, conversation_id, payload, current_user)


@router.put("/conversations/{conversation_id}/read")
async def mark_read(conversation_id: str, current_user=Depends(get_current_user), db=Depends(get_database)):
    return await mark_conversation_read_controller(db, conversation_id, current_user)


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    payload: DeleteMessageRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    return await delete_message_controller(db, message_id, payload, current_user)
