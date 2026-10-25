"""Answer a question about an indexed repo: rewrite follow-ups, retrieve code, ask Gemma 4, attach citations."""

import re

from app.schemas.chat import ChatMessage, ChatResponse, Citation
from app.services import store
from app.services.llm import gemma, prompts
from app.services.rag.chunker import Chunk
from app.services.rag.retriever import retrieve

_MARKER = re.compile(r"\[(\d+(?:\s*[,;]\s*\d+)*)\]")


def _search_query(question: str, history: list[ChatMessage]) -> str:
    """Make a follow-up like "what calls it?" searchable by adding the user's previous question.

    (An LLM rewrite is more precise but costs a full Gemma round trip, ~10-15s.)
    """
    previous = next((m.content for m in reversed(history) if m.role == "user"), "")
    return f"{previous} {question}".strip() if previous else question


def _excerpts(hits: list[tuple[Chunk, float]]) -> str:
    blocks = [
        f"[{n}] {chunk.path} (lines {chunk.start_line}-{chunk.end_line})\n```\n{chunk.text}\n```"
        for n, (chunk, _) in enumerate(hits, start=1)
    ]
    return "\n\n".join(blocks)


def _normalise_markers(text: str, count: int) -> tuple[str, list[int]]:
    """Rewrite "[1, 3]" as "[1][3]", drop markers that point at nothing, and list the cited numbers in order."""
    cited: list[int] = []

    def repl(match: re.Match) -> str:
        ids = [int(x) for x in re.split(r"\s*[,;]\s*", match.group(1))]
        valid = [i for i in ids if 1 <= i <= count]
        cited.extend(i for i in valid if i not in cited)
        return "".join(f"[{i}]" for i in valid)

    return _MARKER.sub(repl, text), cited


def _citation(number: int, chunk: Chunk) -> Citation:
    first_line = next((ln.strip() for ln in chunk.text.splitlines() if ln.strip()), "")
    return Citation(id=number, path=chunk.path, start_line=chunk.start_line, end_line=chunk.end_line, snippet=first_line[:160])


def answer(record: store.RepoRecord, question: str, history: list[ChatMessage]) -> ChatResponse:
    """Raises gemma.LLMError on API failures. The record's index must be ready."""
    hits = retrieve(record.index, _search_query(question, history))

    meta = record.analysis.meta
    prompt = prompts.CHAT_TEMPLATE.format(
        repo=f"{meta.owner}/{meta.repo}",
        description=meta.description or "no description",
        excerpts=_excerpts(hits),
        history=f"Conversation so far:\n{prompts.format_history(history)}\n\n" if history else "",
        question=question,
    )
    text, cited = _normalise_markers(gemma.generate(prompt, system=prompts.CHAT_SYSTEM), len(hits))

    # Only what the model actually cited: an answer like "this isn't in the code" shouldn't show sources
    return ChatResponse(answer=text, citations=[_citation(n, hits[n - 1][0]) for n in sorted(cited)])
