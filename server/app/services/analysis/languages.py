from collections import defaultdict

from app.schemas.repo import LanguageStat

EXTENSIONS = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript", ".java": "Java", ".kt": "Kotlin", ".go": "Go",
    ".rs": "Rust", ".rb": "Ruby", ".php": "PHP", ".cs": "C#", ".c": "C", ".h": "C",
    ".cpp": "C++", ".cc": "C++", ".hpp": "C++", ".swift": "Swift", ".scala": "Scala", ".dart": "Dart",
    ".lua": "Lua", ".r": "R", ".sh": "Shell", ".bash": "Shell", ".ps1": "PowerShell", ".sql": "SQL",
    ".html": "HTML", ".htm": "HTML", ".css": "CSS", ".scss": "SCSS", ".sass": "SCSS", ".less": "Less",
    ".vue": "Vue", ".svelte": "Svelte", ".ipynb": "Jupyter Notebook",
    ".md": "Markdown", ".mdx": "Markdown", ".rst": "reStructuredText", ".txt": "Text",
    ".json": "JSON", ".yml": "YAML", ".yaml": "YAML", ".toml": "TOML", ".xml": "XML", ".ini": "INI",
    ".svg": "SVG",
}
NAMES = {"Dockerfile": "Dockerfile", "Makefile": "Makefile"}

# Shown per file, but left out of the language breakdown (docs and data, not "what it's written in")
NON_CODE = {"Markdown", "reStructuredText", "Text", "JSON", "YAML", "TOML", "XML", "INI", "SVG", "Jupyter Notebook"}


def language_of(path: str) -> str | None:
    name = path.rsplit("/", 1)[-1]
    if name in NAMES:
        return NAMES[name]
    if "." not in name:
        return None
    return EXTENSIONS.get("." + name.rsplit(".", 1)[-1].lower())


def language_stats(files: dict[str, str]) -> list[LanguageStat]:
    """Per-language file count and share of code, by size. Docs/data languages are excluded unless nothing else exists."""
    sizes: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    for path, content in files.items():
        lang = language_of(path)
        if lang:
            sizes[lang] += max(len(content), 1)
            counts[lang] += 1

    code = {lang for lang in sizes if lang not in NON_CODE} or set(sizes)
    total = sum(sizes[lang] for lang in code) or 1
    stats = [
        LanguageStat(language=lang, files=counts[lang], percent=round(sizes[lang] * 100 / total, 1))
        for lang in code
    ]
    return sorted(stats, key=lambda s: s.percent, reverse=True)
