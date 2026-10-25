"""Classify each file as frontend / backend / config / tests / docs / other from its path and extension."""

import re

from app.schemas.repo import Category

FRONTEND_FRAMEWORKS = {
    "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit", "SolidJS", "Preact", "Gatsby",
    "Astro", "Remix", "React Native", "Expo", "Vite", "Tailwind CSS",
}
BACKEND_FRAMEWORKS = {
    "Express", "Fastify", "Koa", "NestJS", "hapi", "FastAPI", "Flask", "Django", "Starlette", "Tornado",
    "aiohttp", "Spring Boot", "Gin", "Echo", "Fiber", "Actix Web", "Axum", "Rocket", "Quarkus",
}

FRONTEND_DIRS = {"client", "frontend", "web", "webapp", "ui", "public", "components", "pages", "views", "styles", "assets", "static"}
BACKEND_DIRS = {
    "server", "backend", "api", "routes", "controllers", "models", "services", "middleware", "handlers",
    "db", "database", "migrations", "cmd", "internal", "pkg", "app",
}
FRONTEND_EXTS = {".jsx", ".tsx", ".vue", ".svelte", ".html", ".htm", ".css", ".scss", ".sass", ".less", ".svg"}
BACKEND_EXTS = {".py", ".go", ".java", ".kt", ".rb", ".php", ".rs", ".cs", ".scala", ".sql", ".c", ".cpp", ".h"}
SCRIPT_EXTS = {".js", ".mjs", ".cjs", ".ts"}  # ambiguous, decided by path/frameworks
DOC_EXTS = {".md", ".mdx", ".rst", ".txt"}
CONFIG_EXTS = {".json", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".env", ".properties", ".xml", ".lock"}
CONFIG_NAMES = {
    "dockerfile", "makefile", "docker-compose.yml", "docker-compose.yaml", ".gitignore", ".dockerignore",
    ".editorconfig", ".npmrc", ".nvmrc", ".prettierrc", ".eslintrc", ".env.example", "procfile",
    "requirements.txt", "pipfile", "go.mod", "go.sum", "gemfile", "license", "jsconfig.json", "components.json",
}
CONFIG_STEMS = re.compile(r"^(vite|webpack|rollup|next|nuxt|tailwind|postcss|babel|jest|vitest|eslint|prettier|tsconfig|svelte|playwright|cypress)(\.|$)", re.I)
TEST_NAME = re.compile(r"(^test_|_test\.|\.test\.|\.spec\.|^conftest\.py$|^tests?\.\w+$)", re.I)
TEST_DIRS = {"test", "tests", "__tests__", "spec", "specs", "e2e", "cypress", "__mocks__", "fixtures"}


def _ext(name: str) -> str:
    return "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""


def classify_file(path: str, frameworks: list[str]) -> Category:
    parts = path.split("/")
    name = parts[-1]
    lower = name.lower()
    dirs = {p.lower() for p in parts[:-1]}
    ext = _ext(name)

    if dirs & TEST_DIRS or TEST_NAME.search(name):
        return "tests"
    if lower in CONFIG_NAMES and not lower.startswith("license") or CONFIG_STEMS.match(name):
        return "config"  # before docs, so requirements.txt is config rather than a .txt document
    if ext in DOC_EXTS or "docs" in dirs or "doc" in dirs or lower.startswith(("license", "readme", "changelog", "contributing")):
        return "docs"
    if ext in CONFIG_EXTS and len(parts) <= 2:
        return "config"
    if dirs & {".github", ".circleci", ".vscode", ".husky"}:
        return "config"

    if ext in FRONTEND_EXTS:
        return "frontend"
    if ext in BACKEND_EXTS:
        return "backend"

    if ext in SCRIPT_EXTS:
        if dirs & FRONTEND_DIRS and not dirs & BACKEND_DIRS:
            return "frontend"
        if dirs & BACKEND_DIRS and not dirs & FRONTEND_DIRS:
            return "backend"
        has_front = bool(FRONTEND_FRAMEWORKS & set(frameworks))
        has_back = bool(BACKEND_FRAMEWORKS & set(frameworks))
        if has_front and not has_back:
            return "frontend"
        if has_back and not has_front:
            return "backend"
        if not has_front and not has_back:
            return "backend"  # plain Node/TS code with no UI framework: library or server code
        return "other"

    if ext in CONFIG_EXTS:
        return "config"
    return "other"
