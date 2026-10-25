from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import mock

router = APIRouter()


@router.post("/{owner}/{repo}/chat", response_model=ChatResponse)
def chat(owner: str, repo: str, payload: ChatRequest) -> ChatResponse:
    """Answer a question about the repo. TODO(real): rag/chat.py (retrieve -> Gemma 4 -> citations)."""
    if get_settings().use_mock_data:
        return mock.mock_chat(payload)
    raise HTTPException(status_code=501, detail="Not implemented yet")
