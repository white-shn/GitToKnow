"""Flag the files a newcomer should read first: entry points, routing, key configs, the README."""

import re

MAX_IMPORTANT = 30

ENTRY_STEMS = {"main", "app", "server", "index", "manage", "__main__", "cli", "wsgi", "asgi", "program", "startup"}
CODE_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".java", ".kt", ".rs", ".rb", ".php", ".cs", ".vue", ".svelte", ".swift"}
ENTRY_DIRS = {"src", "app", "cmd", "server", "client", "backend", "frontend", "api", "lib"}  # where an entry file may live
NOISE_DIRS = {"examples", "example", "samples", "sample", "demo", "demos", "docs", "doc", "test", "tests", "__tests__", "fixtures", "e2e", "benchmarks", "scripts"}
ROUTE_STEMS = {"index", "router", "routes", "routing", "urls"}
ROUTING = re.compile(r"(^|/)(routes?|routers?|routing|urls|controllers?|endpoints?|handlers?)(/|\.|$)", re.I)

CONFIG_REASONS = {
    "package.json": "Node project manifest: scripts and dependencies",
    "requirements.txt": "Python dependencies",
    "pyproject.toml": "Python project config and dependencies",
    "go.mod": "Go module and dependencies",
    "cargo.toml": "Rust crate manifest",
    "pom.xml": "Maven build and dependencies",
    "build.gradle": "Gradle build and dependencies",
    "dockerfile": "Container build definition",
    "docker-compose.yml": "Multi-service container setup",
    "docker-compose.yaml": "Multi-service container setup",
    ".env.example": "Required environment variables",
    "makefile": "Build and task commands",
}
CONFIG_STEMS = {"vite.config": "Vite build config", "next.config": "Next.js config", "webpack.config": "Webpack build config",
                "tailwind.config": "Tailwind config", "tsconfig": "TypeScript config", "nuxt.config": "Nuxt config"}


def _stem_ext(name: str) -> tuple[str, str]:
    if "." not in name:
        return name, ""
    stem, _, ext = name.rpartition(".")
    return stem, "." + ext.lower()


def important_reason(path: str) -> tuple[int, str] | None:
    """(priority, reason) if the file is important, else None. Lower priority number = more important."""
    parts = path.split("/")
    name = parts[-1]
    lower = name.lower()
    stem, ext = _stem_ext(lower)
    depth = len(parts) - 1

    if depth == 0 and stem == "readme":
        return 1, "Project overview and setup instructions"
    if NOISE_DIRS & {p.lower() for p in parts[:-1]}:  # examples, tests, docs: never "start here" files
        return None
    if lower in CONFIG_REASONS and (depth <= 1 and lower != "makefile" or depth == 0):
        return 3, CONFIG_REASONS[lower]
    if ext and depth <= 1:
        for prefix, reason in CONFIG_STEMS.items():
            if stem.startswith(prefix):
                return 3, reason

    if ext in CODE_EXTS:
        if stem in ENTRY_STEMS and (depth == 0 or (depth <= 2 and parts[0].lower() in ENTRY_DIRS)):
            return 2, "Application entry point"
        if depth <= 4 and stem in ROUTE_STEMS and ROUTING.search(path if stem != "index" else "/".join(parts[:-1]) + "/"):
            return 2, "Routing / API endpoints"
    return None


def mark_important(paths: list[str]) -> dict[str, str]:
    """{path: reason} for at most MAX_IMPORTANT files, most important (and shallowest) first."""
    candidates = []
    for path in paths:
        hit = important_reason(path)
        if hit:
            candidates.append((hit[0], path.count("/"), path, hit[1]))
    candidates.sort()
    return {path: reason for _, _, path, reason in candidates[:MAX_IMPORTANT]}
