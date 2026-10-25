from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import mock, store
from app.services.llm.gemma import LLMError
from app.services.rag import chat as rag_chat
from app.services.rag.index import start_indexing

router = APIRouter()


@router.post("/{owner}/{repo}/chat", response_model=ChatResponse)
def chat(owner: str, repo: str, payload: ChatRequest) -> ChatResponse:
    """Answer a question about the repo using retrieved code and Gemma 4, with source citations."""
    if get_settings().use_mock_data:
        return mock.mock_chat(payload)

    record = store.get(f"{owner}/{repo}")
    if not record:
        raise HTTPException(status_code=404, detail="Repository has not been analysed yet.")

    status = record.analysis.index_status
    if status == "failed":  # e.g. a rate limit while indexing: try again in the background
        reason = record.index_error or "unknown error"
        start_indexing(record)
        raise HTTPException(status_code=409, detail=f"Indexing failed earlier ({reason}). Retrying now, ask again in a minute.")
    if status != "ready":
        percent = int(record.index_progress * 100)
        raise HTTPException(status_code=409, detail=f"Still indexing this repository ({percent}%). Ask again in a moment.")

    try:
        return rag_chat.answer(record, payload.question.strip(), payload.history)
    except LLMError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
