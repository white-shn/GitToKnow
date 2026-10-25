"""Extract import statements from source files and resolve them to other files in the same repo.

Supported: JavaScript/TypeScript (+ Vue/Svelte), Python, Java. Anything that doesn't resolve to a repo file
(third-party packages, stdlib) is simply ignored, so every returned dependency is a real file in the repo.
"""

import ast
import json
import posixpath
import re

JS_EXTS = (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".vue", ".svelte")
JS_RESOLVE_EXTS = (*JS_EXTS, ".json")

_JS_IMPORT = re.compile(
    r"""(?:\bimport|\bexport)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"\n]+)['"]"""  # import x from 'a' / import 'a' / export * from 'a'
    r"""|\brequire\(\s*['"]([^'"\n]+)['"]\s*\)"""  # require('a')
    r"""|\bimport\(\s*['"]([^'"\n]+)['"]\s*\)"""  # import('a')
)
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
_LINE_COMMENT = re.compile(r"^\s*//.*$", re.M)
_PY_FALLBACK = re.compile(r"^\s*(?:from\s+(\.*[\w.]*)\s+import\s+([\w, *]+)|import\s+([\w.]+))", re.M)
_JAVA_IMPORT = re.compile(r"^\s*import\s+(?:static\s+)?([\w.]+)\s*(?:\.\*)?;", re.M)


def _dirs_up(path: str):
    """Directories containing `path`, nearest first, ending with the repo root ('')."""
    d = posixpath.dirname(path)
    while d:
        yield d
        d = posixpath.dirname(d)
    yield ""


# ----------------------------------------------------------------------------------------------- JS/TS


def _norm(path: str) -> str:
    n = posixpath.normpath(path)
    return "" if n == "." else n


class JsAliases:
    """tsconfig/jsconfig `baseUrl` + `paths`, applied to files under the config's directory."""

    def __init__(self, files: dict[str, str]):
        # config dir -> (directory that `paths`/baseUrl resolve against, baseUrl set?, [(pattern, targets)])
        self.configs: dict[str, tuple[str, bool, list[tuple[str, list[str]]]]] = {}
        for path in files:
            if posixpath.basename(path) not in ("tsconfig.json", "jsconfig.json"):
                continue
            try:
                text = _BLOCK_COMMENT.sub("", files[path])
                text = re.sub(r"(?m)^\s*//.*$", "", text)
                text = re.sub(r",(\s*[}\]])", r"\1", text)  # trailing commas are legal in tsconfig
                opts = json.loads(text).get("compilerOptions") or {}
                paths = [(pat, t) for pat, t in (opts.get("paths") or {}).items() if isinstance(t, list)]
            except (ValueError, AttributeError):
                continue
            cfg_dir = posixpath.dirname(path)
            has_base = "baseUrl" in opts
            base = _norm(posixpath.join(cfg_dir, opts["baseUrl"])) if has_base else cfg_dir
            self.configs.setdefault(cfg_dir, (base, has_base, paths))

    def candidates(self, spec: str, src: str) -> list[str]:
        """Possible repo paths (extension not yet resolved) for a non-relative specifier."""
        out: list[str] = []
        for d in _dirs_up(src):
            if d not in self.configs:
                continue
            base, has_base, paths = self.configs[d]
            for pattern, targets in paths:
                if pattern.endswith("*") and spec.startswith(pattern[:-1]):
                    rest = spec[len(pattern) - 1:]
                    out += [_norm(posixpath.join(base, t.replace("*", rest))) for t in targets]
                elif spec == pattern:
                    out += [_norm(posixpath.join(base, t)) for t in targets]
            if has_base:
                out.append(_norm(posixpath.join(base, spec)))  # baseUrl-relative import
            break  # nearest config wins
        if spec.startswith(("@/", "~/")):  # common bundler alias for <package>/src
            out += [_norm(posixpath.join(d, "src", spec[2:])) for d in _dirs_up(src)]
        return out


def js_specifiers(content: str) -> list[str]:
    content = _LINE_COMMENT.sub("", _BLOCK_COMMENT.sub("", content))
    return [next(g for g in m.groups() if g) for m in _JS_IMPORT.finditer(content)]


def _resolve_js_path(base: str, fileset: set[str]) -> str | None:
    base = base.lstrip("/")
    if base in fileset and posixpath.splitext(base)[1] in JS_RESOLVE_EXTS:
        return base
    stem, ext = posixpath.splitext(base)
    if ext in (".js", ".jsx", ".mjs", ".cjs"):  # TypeScript imports like './a.js' point at a.ts
        for alt in (".ts", ".tsx"):
            if stem + alt in fileset:
                return stem + alt
    for e in JS_RESOLVE_EXTS:
        if base + e in fileset:
            return base + e
    for e in JS_EXTS:
        if f"{base}/index{e}" in fileset:
            return f"{base}/index{e}"
    return None


def resolve_js(content: str, src: str, fileset: set[str], aliases: JsAliases) -> set[str]:
    found: set[str] = set()
    for spec in js_specifiers(content):
        spec = spec.split("?")[0]
        if spec.startswith("."):
            candidates = [posixpath.normpath(posixpath.join(posixpath.dirname(src), spec))]
        elif spec.startswith(("http:", "https:", "data:", "node:")):
            continue
        else:
            candidates = aliases.candidates(spec, src)
        for cand in candidates:
            target = _resolve_js_path(cand, fileset)
            if target:
                found.add(target)
                break
    return found


# ----------------------------------------------------------------------------------------------- Python


def _py_imports(content: str) -> list[tuple[int, str, list[str]]]:
    """(relative level, dotted module, imported names) for every import statement."""
    out: list[tuple[int, str, list[str]]] = []
    try:
        tree = ast.parse(content)
    except (SyntaxError, ValueError):
        for m in _PY_FALLBACK.finditer(content):
            if m.group(3):
                out.append((0, m.group(3), []))
            else:
                mod = m.group(1)
                level = len(mod) - len(mod.lstrip("."))
                out.append((level, mod.lstrip("."), [n.strip() for n in m.group(2).split(",") if n.strip()]))
        return out
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            out += [(0, a.name, []) for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            out.append((node.level, node.module or "", [a.name for a in node.names]))
    return out


def _py_module_file(parts: list[str], root: str, fileset: set[str]) -> str | None:
    if not parts:
        return f"{root}/__init__.py" if f"{root}/__init__.py" in fileset else (
            "__init__.py" if not root and "__init__.py" in fileset else None)
    base = posixpath.join(root, *parts)
    for cand in (f"{base}.py", f"{base}/__init__.py"):
        if cand in fileset:
            return cand
    return None


def resolve_python(content: str, src: str, fileset: set[str]) -> set[str]:
    found: set[str] = set()
    for level, module, names in _py_imports(content):
        parts = [p for p in module.split(".") if p]
        if level:  # relative import: climb `level - 1` packages from the importing file's folder
            root = posixpath.dirname(src)
            for _ in range(level - 1):
                root = posixpath.dirname(root)
            roots = [root]
        else:
            roots = list(_dirs_up(src))  # nearest ancestor first: finds `app.main` from inside server/app/...
        for root in roots:
            hit = _py_module_file(parts, root, fileset)
            subs = [f for n in names if (f := _py_module_file([*parts, n], root, fileset))]
            if hit or subs:
                found.update(subs)
                if hit:
                    found.add(hit)
                break
    found.discard(src)
    return found


# ----------------------------------------------------------------------------------------------- Java


def build_java_index(files: dict[str, str]) -> dict[str, str]:
    """Every '/'-boundary path suffix of every .java file -> the file (lets 'a/b/C.java' find src/main/java/a/b/C.java)."""
    index: dict[str, str] = {}
    for path in files:
        if path.endswith(".java"):
            parts = path.split("/")
            for i in range(len(parts)):
                index.setdefault("/".join(parts[i:]), path)
    return index


def resolve_java(content: str, src: str, index: dict[str, str]) -> set[str]:
    found: set[str] = set()
    for m in _JAVA_IMPORT.finditer(content):
        parts = m.group(1).split(".")
        for end in (len(parts), len(parts) - 1):  # `import static a.B.method` -> a/B.java
            if end <= 0:
                break
            target = index.get("/".join(parts[:end]) + ".java")
            if target:
                found.add(target)
                break
    found.discard(src)
    return found
