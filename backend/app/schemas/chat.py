from pydantic import BaseModel, Field


class CreateConversationRequest(BaseModel):
    otherUserId: str
    pgId: str | None = None


class SendMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class DeleteMessageRequest(BaseModel):
    mode: str = Field(default="me")
