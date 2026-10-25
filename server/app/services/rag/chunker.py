"""Split source files into overlapping line-window chunks that remember where they came from."""

from dataclasses import dataclass

WINDOW_LINES = 60
OVERLAP_LINES = 10
MAX_CHUNK_CHARS = 2400  # keeps every chunk well under the embedding model's input limit
MAX_AVG_LINE_LENGTH = 250  # minified / generated files make poor chunks


@dataclass(frozen=True)
class Chunk:
    id: int
    path: str
    start_line: int  # 1-based, inclusive
    end_line: int
    text: str

    @property
    def embedding_text(self) -> str:
        """What gets embedded: the path helps retrieval for questions that name a file or folder."""
        return f"{self.path}\n{self.text}"


def chunk_file(path: str, content: str, first_id: int = 0) -> list[Chunk]:
    lines = content.splitlines()
    if not lines or sum(map(len, lines)) / len(lines) > MAX_AVG_LINE_LENGTH:
        return []

    chunks: list[Chunk] = []
    i = 0
    while i < len(lines):
        j, size = i, 0
        while j < len(lines) and j - i < WINDOW_LINES and (size < MAX_CHUNK_CHARS or j == i):
            size += len(lines[j]) + 1
            j += 1
        text = "\n".join(lines[i:j])[:MAX_CHUNK_CHARS]
        if text.strip():
            chunks.append(Chunk(first_id + len(chunks), path, i + 1, j, text))
        if j >= len(lines):
            break
        i = max(j - OVERLAP_LINES, i + 1)  # always advance, even for very long lines
    return chunks
