"""AI overview of a repo: collect compact facts from the analysis, then let Gemma 4 write it up."""

import logging
import threading

from app.schemas.repo import TreeNode
from app.services import store
from app.services.llm import gemma, prompts

log = logging.getLogger(__name__)

MAX_FACTS_CHARS = 9000
README_CHARS = 3000
EXCERPT_LINES = 60
EXCERPT_CHARS = 1500
MAX_EXCERPTS = 3
TREE_LINE_LIMIT = 60
TREE_CHILDREN_PER_DIR = 8


def _layout(tree: list[TreeNode]) -> str:
    """Top-level folders/files plus the first few children of each folder."""
    lines: list[str] = []
    for node in tree:
        if node.type == "file":
            lines.append(node.name)
            continue
        lines.append(f"{node.name}/")
        kids = node.children[:TREE_CHILDREN_PER_DIR]
        lines += [f"  {k.name}{'/' if k.type == 'dir' else ''}" for k in kids]
        if len(node.children) > len(kids):
            lines.append(f"  ... (+{len(node.children) - len(kids)} more)")
    return "\n".join(lines[:TREE_LINE_LIMIT])


def build_facts(record: store.RepoRecord) -> str:
    a = record.analysis
    meta = a.meta
    parts = [f"Repository: {meta.owner}/{meta.repo}", f"Description: {meta.description or 'none'}"]
    if meta.license:
        parts.append(f"License: {meta.license}")
    if a.languages:
        parts.append("Languages: " + ", ".join(f"{l.language} {l.percent}%" for l in a.languages[:6]))
    if a.frameworks:
        parts.append("Frameworks/tools: " + ", ".join(a.frameworks))
    runtime = [d.name for d in a.dependencies if not d.dev][:15]
    if runtime:
        parts.append("Main dependencies: " + ", ".join(runtime))

    parts.append("Folder layout:\n" + _layout(a.tree))

    important = [f for f in a.files if f.important]
    if important:
        parts.append("Important files:\n" + "\n".join(f"- {f.path}: {f.reason}" for f in important[:15]))

    hubs = sorted(a.graph.nodes, key=lambda n: len(n.imported_by), reverse=True)[:6]
    hubs = [n for n in hubs if n.imported_by]
    if hubs:
        parts.append("Most depended-on modules:\n" + "\n".join(f"- {n.path or n.label} (used by {len(n.imported_by)})" for n in hubs))

    readme = next((p for p in record.files if p.lower() in ("readme.md", "readme.rst", "readme.txt", "readme")), None)
    if readme:
        parts.append(f"README excerpt:\n{record.files[readme][:README_CHARS]}")

    entry_points = [f for f in important if f.reason and f.reason.startswith(("Application entry", "Routing"))]
    for f in entry_points[:MAX_EXCERPTS]:
        code = "\n".join(record.files.get(f.path, "").splitlines()[:EXCERPT_LINES])[:EXCERPT_CHARS]
        parts.append(f"Excerpt of {f.path}:\n{code}")

    return "\n\n".join(parts)[:MAX_FACTS_CHARS]


def generate_overview(record: store.RepoRecord) -> str:
    """Raises gemma.LLMError on API failures."""
    return gemma.generate(
        prompts.OVERVIEW_TEMPLATE.format(facts=build_facts(record)),
        system=prompts.OVERVIEW_SYSTEM,
        temperature=0.3,
    )


def get_overview(record: store.RepoRecord) -> str:
    """The cached overview, generating it if needed. Concurrent callers wait for one generation instead of repeating it."""
    with record.overview_lock:
        if record.overview is None:
            record.overview = generate_overview(record)
        return record.overview


def prefetch_overview(record: store.RepoRecord) -> None:
    """Warm the overview cache in the background so the AI Summary tab opens instantly."""

    def run() -> None:
        try:
            get_overview(record)
        except gemma.LLMError:
            pass  # the overview endpoint retries (and reports the error) when the user opens the tab
        except Exception:  # noqa: BLE001
            log.exception("Overview prefetch failed")

    threading.Thread(target=run, daemon=True, name="overview-prefetch").start()
