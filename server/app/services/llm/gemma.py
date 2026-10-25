"""Gemini API client: Gemma 4 for text generation and a Gemini embedding model for RAG retrieval.

Everything the rest of the server needs from the model lives here: `generate()` and `embed()`.
Failures surface as LLMError (status code + a message safe to show users).
"""

import logging
import re
import threading
import time
from collections.abc import Callable, Iterator
from functools import lru_cache

import httpx
import numpy as np
from google import genai
from google.genai import errors, types

from app.core.config import get_settings

log = logging.getLogger(__name__)

EMBED_DIMENSIONS = 768  # gemini-embedding-001 supports truncating its 3072-dim output
# The free tier allows 100 *embedded texts* per minute (every text in a batch counts), so index in batches
# of 90 spaced a minute apart, leaving headroom for question embeddings made while indexing.
EMBED_BATCH_SIZE = 90
EMBED_BATCH_INTERVAL = 61.0  # seconds between batch starts
RETRY_DELAYS = (2.0, 6.0, 15.0)  # fallback waits before each retry on rate-limit / overload
MAX_RETRY_WAIT = 65.0
EMPTY_RESPONSE_ATTEMPTS = 3


class LLMError(Exception):
    """A failure calling the Gemini API, with an HTTP status and a user-safe message."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@lru_cache
def _build_client() -> genai.Client:
    key = get_settings().gemini_api_key
    if not key:
        raise LLMError(503, "GEMINI_API_KEY is not set. Add it to server/.env and restart the server.")
    return genai.Client(api_key=key)


_client_lock = threading.Lock()


def _client() -> genai.Client:
    """The shared client. The lock matters: indexing and the overview start together in two threads, and an
    unlocked lru_cache can build two clients on that first call. The loser is garbage-collected right after
    `.models` is read from it, and its destructor closes the connection the call is still using."""
    with _client_lock:
        return _build_client()


def _retry_after(exc: errors.APIError) -> float | None:
    """Seconds Google asks us to wait, from the error's "Please retry in 48.9s" hint, if present."""
    match = re.search(r"retry in ([\d.]+)s", exc.message or "")
    return float(match.group(1)) if match else None


def _call(fn: Callable, *args, **kwargs):
    """Run a Gemini API call, retrying rate limits/overload with backoff and translating errors."""
    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            return fn(*args, **kwargs)
        except errors.APIError as exc:
            retryable = exc.code in (429, 500, 502, 503, 504)
            if retryable and attempt < len(RETRY_DELAYS):
                hinted = _retry_after(exc)
                time.sleep(min(hinted + 1, MAX_RETRY_WAIT) if hinted else RETRY_DELAYS[attempt])
                continue
            if exc.code == 429:
                raise LLMError(429, "The Gemini API rate limit was reached. Wait a minute and try again.") from exc
            if exc.code in (400, 401, 403):
                raise LLMError(502, f"The Gemini API rejected the request ({exc.code}). Check GEMINI_API_KEY and model names.") from exc
            raise LLMError(502, "The Gemini API is unavailable right now. Try again shortly.") from exc
        except Exception as exc:  # noqa: BLE001 - connection resets, timeouts and other network errors are transient
            log.warning("Gemini API call failed (attempt %d): %r", attempt + 1, exc)
            if attempt < len(RETRY_DELAYS):
                time.sleep(RETRY_DELAYS[attempt])
                continue
            raise LLMError(502, "Could not reach the Gemini API.") from exc
    raise LLMError(502, "The Gemini API is unavailable right now. Try again shortly.")  # pragma: no cover


def _generate_gemma(prompt: str, system: str | None, temperature: float, max_output_tokens: int) -> str:
    """One Gemma 4 completion. Reasoning ("thought") parts are excluded by `response.text`.

    Thinking is set to MINIMAL (the only level Gemma 4 accepts besides its default): in testing, answers
    grounded in provided excerpts were as good and about 3x faster than with the default adaptive thinking.
    """
    settings = get_settings()
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        thinking_config=types.ThinkingConfig(thinking_level="MINIMAL"),
    )
    for _ in range(EMPTY_RESPONSE_ATTEMPTS):  # Gemma occasionally returns only its reasoning and no answer
        response = _call(
            _client().models.generate_content, model=settings.gemma_model, contents=prompt, config=config
        )
        text = (response.text or "").strip()
        if text:
            return text
    raise LLMError(502, "The model returned an empty response. Try asking again.")


def _normalise(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.where(norms == 0, 1, norms)


def embed_batches(texts: list[str], task: str = "RETRIEVAL_DOCUMENT") -> Iterator[tuple[int, np.ndarray]]:
    """Yield (start_index, L2-normalised vectors) one paced batch at a time, so callers can use results early.

    task: "RETRIEVAL_DOCUMENT" for indexed chunks, "RETRIEVAL_QUERY" for questions.
    """
    config = types.EmbedContentConfig(task_type=task, output_dimensionality=EMBED_DIMENSIONS)
    model = get_settings().embedding_model
    last_start: float | None = None
    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        if last_start is not None:
            time.sleep(max(0.0, EMBED_BATCH_INTERVAL - (time.monotonic() - last_start)))
        last_start = time.monotonic()
        batch = texts[start : start + EMBED_BATCH_SIZE]
        result = _call(_client().models.embed_content, model=model, contents=batch, config=config)
        yield start, _normalise(np.array([e.values for e in result.embeddings], dtype=np.float32))


def embed(texts: list[str], task: str = "RETRIEVAL_QUERY") -> np.ndarray:
    """All embeddings at once, shape (len(texts), EMBED_DIMENSIONS); a dot product of two rows is cosine similarity."""
    parts = [vectors for _, vectors in embed_batches(texts, task)]
    return np.vstack(parts) if parts else np.zeros((0, EMBED_DIMENSIONS), dtype=np.float32)


def _generate_fallback(prompt: str, system: str | None, max_output_tokens: int) -> str:
    """One completion from the optional fallback model (OpenAI-compatible chat API)."""
    settings = get_settings()
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
    try:
        resp = httpx.post(
            f"{settings.fallback_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.fallback_api_key}"},
            json={
                "model": settings.fallback_model,
                "messages": messages,
                "max_completion_tokens": max_output_tokens,
                # GPT-OSS uses part of its completion budget for reasoning. Low effort
                # leaves enough room for the concise response this UI needs.
                "reasoning_effort": "low",
                "include_reasoning": False,
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        text = (resp.json()["choices"][0]["message"]["content"] or "").strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        log.warning("Fallback model call failed: %r", exc)
        raise LLMError(502, "Both Gemma 4 and the fallback model are unavailable right now. Try again shortly.") from exc
    if not text:
        raise LLMError(502, "The fallback model returned an empty response.")
    return text


def generate_with_fallback_model(prompt: str, system: str | None = None, max_output_tokens: int = 4096) -> str:
    """Call the configured OpenAI-compatible provider directly (Groq by default).

    This is for features that intentionally select the fallback provider rather than
    using Gemma first. It shares the same environment configuration as `generate()`.
    """
    if not get_settings().fallback_api_key:
        raise LLMError(503, "FALLBACK_API_KEY is not set. Add a Groq API key to server/.env and restart the server.")
    return _generate_fallback(prompt, system, max_output_tokens)


def generate(prompt: str, system: str | None = None, temperature: float = 0.2, max_output_tokens: int = 4096) -> str:
    """Gemma 4 first. If it fails (rate limit, outage, empty reply) and a fallback model is configured, use that
    and say so in the answer, so the source of every answer is clear."""
    try:
        return _generate_gemma(prompt, system, temperature, max_output_tokens)
    except LLMError as gemma_error:
        settings = get_settings()
        if not settings.fallback_api_key:
            raise
        log.warning("Gemma 4 failed (%s); using fallback model %s", gemma_error.detail, settings.fallback_model)
        text = _generate_fallback(prompt, system, max_output_tokens)
        return f"{text}" + chr(10) * 2 + f"_Answered by the fallback model ({settings.fallback_model}) because Gemma 4 was unavailable._"
