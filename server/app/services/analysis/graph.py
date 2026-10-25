"""Import/dependency graph built from real import statements (see imports.py for the parsing).

Nodes are source files. Test, docs and config files are left out (they're not architecture). If the repo has
more than MAX_NODES connected files, files are grouped into folder-level components so the graph stays readable;
a component node lists its member files in `files`.
"""

import posixpath
from collections import Counter, defaultdict

from app.schemas.repo import Category, FileInfo, Graph, GraphEdge, GraphNode
from app.services.analysis.imports import (
    JS_EXTS,
    JsAliases,
    build_java_index,
    resolve_java,
    resolve_js,
    resolve_python,
)

MAX_NODES = 150
GRAPH_CATEGORIES = {"frontend", "backend", "other"}
NOISE_DIRS = {"examples", "example", "samples", "sample", "demo", "demos", "benchmark", "benchmarks", "fixtures", "scripts", "docs_src"}
GENERIC_NAMES ={"index", "__init__", "main", "app", "mod", "utils", "types"}


def _extract_edges(files: dict[str, str], paths: set[str]) -> set[tuple[str, str]]:
    """(importer, imported) pairs between files in `paths`."""
    fileset = set(files)
    aliases = JsAliases(files)
    java_index = build_java_index(files)
    edges: set[tuple[str, str]] = set()
    for src in paths:
        content = files[src]
        ext = posixpath.splitext(src)[1].lower()
        if ext in JS_EXTS:
            targets = resolve_js(content, src, fileset, aliases)
        elif ext == ".py":
            targets = resolve_python(content, src, fileset)
        elif ext == ".java":
            targets = resolve_java(content, src, java_index)
        else:
            continue
        edges.update((src, t) for t in targets if t in paths and t != src)
    return edges


def _group(path: str) -> str:
    return path.split("/")[0] if "/" in path else "root"


def _labels(paths: list[str]) -> dict[str, str]:
    """Basename as label; 'parent/basename' when the basename is generic or not unique."""
    base = Counter(posixpath.basename(p) for p in paths)
    labels = {}
    for p in paths:
        name = posixpath.basename(p)
        stem = posixpath.splitext(name)[0]
        parent = posixpath.basename(posixpath.dirname(p))
        labels[p] = f"{parent}/{name}" if parent and (base[name] > 1 or stem in GENERIC_NAMES) else name
    return labels


def _majority(categories: list[Category]) -> Category:
    return Counter(categories).most_common(1)[0][0]


def _file_graph(edges: set[tuple[str, str]], keep: list[str], info: dict[str, FileInfo]) -> Graph:
    imports: dict[str, list[str]] = defaultdict(list)
    imported_by: dict[str, list[str]] = defaultdict(list)
    for src, dst in sorted(edges):
        imports[src].append(dst)
        imported_by[dst].append(src)
    labels = _labels(keep)
    nodes = [
        GraphNode(
            id=p, label=labels[p], path=p, category=info[p].category, group=_group(p), files=[p],
            imports=imports[p], imported_by=imported_by[p],
        )
        for p in keep
    ]
    return Graph(nodes=nodes, edges=[GraphEdge(source=s, target=t) for s, t in sorted(edges)])


def _component_graph(edges: set[tuple[str, str]], keep: list[str], info: dict[str, FileInfo]) -> Graph:
    """Collapse files into folder components, shortening folder paths until at most MAX_NODES remain."""
    dir_depths = [p.count("/") for p in keep]
    comp_of: dict[str, str] = {}
    for depth in range(max(dir_depths, default=0), 0, -1):  # try the deepest folders first
        comp_of = {p: "/".join(p.split("/")[:-1][:depth]) or "(root)" for p in keep}
        if len(set(comp_of.values())) <= MAX_NODES:
            break
    else:
        comp_of = {p: p.split("/")[0] if "/" in p else "(root)" for p in keep}

    members: dict[str, list[str]] = defaultdict(list)
    for p in keep:
        members[comp_of[p]].append(p)
    comp_edges = {(comp_of[s], comp_of[t]) for s, t in edges if comp_of[s] != comp_of[t]}

    imports: dict[str, list[str]] = defaultdict(list)
    imported_by: dict[str, list[str]] = defaultdict(list)
    for src, dst in sorted(comp_edges):
        imports[src].append(dst)
        imported_by[dst].append(src)

    nodes = [
        GraphNode(
            id=cid, label=posixpath.basename(cid) or cid, path="" if cid == "(root)" else cid,
            category=_majority([info[p].category for p in files]), group=_group(cid) if cid != "(root)" else "root",
            files=sorted(files), imports=imports[cid], imported_by=imported_by[cid],
        )
        for cid, files in sorted(members.items())
    ]
    connected = {n for e in comp_edges for n in e}
    nodes = [n for n in nodes if n.id in connected or any(info[f].important for f in n.files)]
    return Graph(nodes=nodes, edges=[GraphEdge(source=s, target=t) for s, t in sorted(comp_edges)])


def _is_noise(path: str) -> bool:
    return bool(NOISE_DIRS & {p.lower() for p in path.split("/")[:-1]})


def build_graph(files: dict[str, str], infos: list[FileInfo]) -> Graph:
    info = {i.path: i for i in infos}
    candidates = {p for p, i in info.items() if i.category in GRAPH_CATEGORIES}

    # Example/demo apps clutter the architecture picture; use them only if nothing else is connected.
    core = {p for p in candidates if not _is_noise(p)}
    edges = _extract_edges(files, core)
    if edges:
        candidates = core
    else:
        edges = _extract_edges(files, candidates)

    connected = {n for e in edges for n in e}
    keep = sorted(p for p in candidates if p in connected or info[p].important)
    if not keep:
        return Graph()
    if len(keep) <= MAX_NODES:
        return _file_graph(edges, keep, info)
    return _component_graph(edges, keep, info)
