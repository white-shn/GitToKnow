from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = Field(default_factory=list)  # previous turns, for follow-ups


class Citation(BaseModel):
    id: int  # matches the [n] markers in the answer text
    path: str
    start_line: int
    end_line: int
    snippet: str = ""


class ChatResponse(BaseModel):
    answer: str  # markdown, with [n] markers pointing at citations
    citations: list[Citation] = Field(default_factory=list)
