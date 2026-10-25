"""BM25 keyword search over code chunks. Needs no API, so chat works instantly and keeps working when the
embedding quota is used up. Identifiers are split (camelCase, snake_case) so `getUserName` matches "user name"."""

import math
import re
from collections import Counter

import numpy as np

_TOKEN = re.compile(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+")
_STOP = {
    "the", "and", "for", "that", "this", "with", "from", "what", "where", "when", "does", "how", "are", "was",
    "which", "who", "why", "can", "you", "not", "use", "used", "uses", "file", "files", "code", "work", "works",
    "return", "import", "const", "let", "var", "def", "class", "function", "self", "none", "true", "false",
}


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN.findall(text) if len(t) > 1]


class Bm25:
    def __init__(self, texts: list[str], k1: float = 1.4, b: float = 0.75):
        self.k1, self.b = k1, b
        self.docs = [Counter(t for t in tokenize(text) if t not in _STOP) for text in texts]
        self.lengths = np.array([sum(d.values()) for d in self.docs], dtype=np.float32)
        self.avg_length = float(self.lengths.mean()) if len(self.docs) else 1.0
        doc_freq: Counter = Counter()
        for d in self.docs:
            doc_freq.update(d.keys())
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in doc_freq.items()}

    def scores(self, query: str) -> np.ndarray:
        terms = {t for t in tokenize(query) if t not in _STOP and t in self.idf}
        out = np.zeros(len(self.docs), dtype=np.float32)
        for i, doc in enumerate(self.docs):
            norm = self.k1 * (1 - self.b + self.b * self.lengths[i] / self.avg_length)
            for t in terms:
                f = doc.get(t)
                if f:
                    out[i] += self.idf[t] * f * (self.k1 + 1) / (f + norm)
        return out
