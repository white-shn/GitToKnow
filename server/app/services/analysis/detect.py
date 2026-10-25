"""Detect dependencies and frameworks from package manifests (also in monorepo subfolders)."""

import json
import re
import tomllib

from app.schemas.repo import Dependency

MAX_DEPENDENCIES = 120
NOISE_DIRS = {"examples", "example", "samples", "sample", "demo", "demos", "docs", "test", "tests", "__tests__", "fixtures", "benchmarks"}

# dependency name (lowercase) -> framework / tool label
NPM_FRAMEWORKS = {
    "react": "React", "next": "Next.js", "vue": "Vue", "nuxt": "Nuxt", "@angular/core": "Angular",
    "svelte": "Svelte", "@sveltejs/kit": "SvelteKit", "solid-js": "SolidJS", "preact": "Preact",
    "express": "Express", "fastify": "Fastify", "koa": "Koa", "@nestjs/core": "NestJS", "hapi": "hapi",
    "vite": "Vite", "webpack": "Webpack", "parcel": "Parcel", "tailwindcss": "Tailwind CSS",
    "react-native": "React Native", "electron": "Electron", "expo": "Expo", "gatsby": "Gatsby",
    "astro": "Astro", "remix": "Remix", "@remix-run/react": "Remix", "prisma": "Prisma",
    "mongoose": "Mongoose", "sequelize": "Sequelize", "typeorm": "TypeORM", "socket.io": "Socket.IO",
    "jest": "Jest", "vitest": "Vitest", "mocha": "Mocha", "cypress": "Cypress", "playwright": "Playwright",
    "@playwright/test": "Playwright", "redux": "Redux", "@reduxjs/toolkit": "Redux Toolkit",
    "typescript": "TypeScript", "gsap": "GSAP", "three": "Three.js", "graphql": "GraphQL",
}
PY_FRAMEWORKS = {
    "fastapi": "FastAPI", "flask": "Flask", "django": "Django", "starlette": "Starlette",
    "streamlit": "Streamlit", "gradio": "Gradio", "tornado": "Tornado", "aiohttp": "aiohttp",
    "torch": "PyTorch", "tensorflow": "TensorFlow", "keras": "Keras", "transformers": "Hugging Face Transformers",
    "langchain": "LangChain", "llama-index": "LlamaIndex", "scikit-learn": "scikit-learn",
    "pandas": "pandas", "numpy": "NumPy", "sqlalchemy": "SQLAlchemy", "pydantic": "Pydantic",
    "celery": "Celery", "pytest": "pytest", "google-genai": "Google GenAI SDK", "openai": "OpenAI SDK",
}
GO_FRAMEWORKS = {
    "github.com/gin-gonic/gin": "Gin", "github.com/labstack/echo": "Echo", "github.com/gofiber/fiber": "Fiber",
    "github.com/gorilla/mux": "Gorilla Mux", "gorm.io/gorm": "GORM",
}
RUST_FRAMEWORKS = {"actix-web": "Actix Web", "axum": "Axum", "rocket": "Rocket", "tokio": "Tokio", "serde": "Serde"}
JAVA_FRAMEWORKS = {"spring-boot": "Spring Boot", "hibernate": "Hibernate", "junit": "JUnit", "quarkus": "Quarkus"}

# marker files -> framework / tool label (matched on file basename)
MARKER_FILES = {
    "Dockerfile": "Docker", "docker-compose.yml": "Docker Compose", "docker-compose.yaml": "Docker Compose",
    "manage.py": "Django", "next.config.js": "Next.js", "next.config.mjs": "Next.js",
    "vite.config.js": "Vite", "vite.config.ts": "Vite", "tailwind.config.js": "Tailwind CSS",
    "tailwind.config.ts": "Tailwind CSS", "angular.json": "Angular", "svelte.config.js": "SvelteKit",
    "nuxt.config.ts": "Nuxt", "nuxt.config.js": "Nuxt", "terraform.tf": "Terraform", "main.tf": "Terraform",
}


def _basename(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def _dep(name: str, version: str, ecosystem: str, dev: bool = False) -> Dependency:
    return Dependency(name=name, version=version.strip(), ecosystem=ecosystem, dev=dev)


def _parse_package_json(text: str) -> list[Dependency]:
    data = json.loads(text)
    deps = [_dep(n, str(v or ""), "npm") for n, v in (data.get("dependencies") or {}).items()]
    deps += [_dep(n, str(v or ""), "npm", True) for n, v in (data.get("devDependencies") or {}).items()]
    return deps


_REQ_LINE = re.compile(r"^([A-Za-z0-9_.\-]+)(?:\[[^\]]*\])?\s*(.*)$")


def _split_requirement(spec: str) -> tuple[str, str] | None:
    spec = spec.split("#")[0].split(";")[0].strip()
    if not spec or spec.startswith(("-", "git+", "http")):
        return None
    m = _REQ_LINE.match(spec)
    return (m.group(1), m.group(2).strip()) if m else None


def _parse_requirements(text: str) -> list[Dependency]:
    out = []
    for line in text.splitlines():
        parsed = _split_requirement(line)
        if parsed:
            out.append(_dep(parsed[0], parsed[1], "pypi"))
    return out


def _parse_pyproject(text: str) -> list[Dependency]:
    data = tomllib.loads(text)
    out = []
    for spec in (data.get("project") or {}).get("dependencies", []):
        parsed = _split_requirement(spec)
        if parsed:
            out.append(_dep(parsed[0], parsed[1], "pypi"))
    poetry = (data.get("tool") or {}).get("poetry") or {}
    for name, ver in (poetry.get("dependencies") or {}).items():
        if name.lower() != "python":
            out.append(_dep(name, ver if isinstance(ver, str) else "", "pypi"))
    for name, ver in ((poetry.get("group") or {}).get("dev", {}).get("dependencies") or {}).items():
        out.append(_dep(name, ver if isinstance(ver, str) else "", "pypi", True))
    return out


def _parse_go_mod(text: str) -> list[Dependency]:
    out = []
    in_block = False
    for line in text.splitlines():
        line = line.split("//")[0].strip()
        if line.startswith("require ("):
            in_block = True
        elif in_block and line == ")":
            in_block = False
        elif in_block and line:
            parts = line.split()
            out.append(_dep(parts[0], parts[1] if len(parts) > 1 else "", "go"))
        elif line.startswith("require ") and "(" not in line:
            parts = line.split()
            if len(parts) >= 3:
                out.append(_dep(parts[1], parts[2], "go"))
    return out


def _parse_cargo(text: str) -> list[Dependency]:
    data = tomllib.loads(text)
    out = []
    for table, dev in (("dependencies", False), ("dev-dependencies", True)):
        for name, ver in (data.get(table) or {}).items():
            version = ver if isinstance(ver, str) else (ver.get("version", "") if isinstance(ver, dict) else "")
            out.append(_dep(name, version, "cargo", dev))
    return out


def _parse_pom(text: str) -> list[Dependency]:
    out = []
    for block in re.findall(r"<dependency>(.*?)</dependency>", text, re.S):
        artifact = re.search(r"<artifactId>(.*?)</artifactId>", block)
        version = re.search(r"<version>(.*?)</version>", block)
        scope = re.search(r"<scope>(.*?)</scope>", block)
        if artifact:
            out.append(_dep(artifact.group(1), version.group(1) if version else "", "maven",
                            bool(scope and scope.group(1) == "test")))
    return out


PARSERS = {
    "package.json": _parse_package_json,
    "requirements.txt": _parse_requirements,
    "pyproject.toml": _parse_pyproject,
    "go.mod": _parse_go_mod,
    "Cargo.toml": _parse_cargo,
    "pom.xml": _parse_pom,
}
FRAMEWORK_TABLES = {
    "npm": NPM_FRAMEWORKS, "pypi": PY_FRAMEWORKS, "cargo": RUST_FRAMEWORKS,
}


def _framework_for(dep: Dependency) -> str | None:
    name = dep.name.lower()
    if dep.ecosystem in FRAMEWORK_TABLES:
        return FRAMEWORK_TABLES[dep.ecosystem].get(name)
    if dep.ecosystem == "go":
        return next((label for prefix, label in GO_FRAMEWORKS.items() if name.startswith(prefix)), None)
    if dep.ecosystem == "maven":
        return next((label for key, label in JAVA_FRAMEWORKS.items() if key in name), None)
    return None


def detect_dependencies(files: dict[str, str]) -> list[Dependency]:
    """All declared dependencies across every manifest, de-duplicated (runtime deps first)."""
    found: dict[tuple[str, str], Dependency] = {}
    for path in sorted(files, key=lambda p: (p.count("/"), p)):  # root manifests win over nested ones
        parser = PARSERS.get(_basename(path))
        if not parser or NOISE_DIRS & set(path.lower().split("/")[:-1]):
            continue  # not a manifest, or one belonging to an example/test app
        try:
            deps = parser(files[path])
        except Exception:  # noqa: BLE001 - manifests are untrusted input: any parse failure just skips that file
            continue
        for dep in deps:
            found.setdefault((dep.ecosystem, dep.name), dep)
    ordered = sorted(found.values(), key=lambda d: (d.dev, d.ecosystem, d.name.lower()))
    return ordered[:MAX_DEPENDENCIES]


def _own_package_names(files: dict[str, str]) -> list[Dependency]:
    """The repo's own root package (e.g. flask in pallets/flask), so a framework repo lists itself."""
    own = []
    try:
        if "package.json" in files:
            own.append(_dep(json.loads(files["package.json"]).get("name", ""), "", "npm"))
        if "pyproject.toml" in files:
            own.append(_dep((tomllib.loads(files["pyproject.toml"]).get("project") or {}).get("name", ""), "", "pypi"))
        if "Cargo.toml" in files:
            own.append(_dep((tomllib.loads(files["Cargo.toml"]).get("package") or {}).get("name", ""), "", "cargo"))
    except Exception:  # noqa: BLE001 - same reasoning as detect_dependencies
        pass
    return [d for d in own if d.name]


def detect_frameworks(files: dict[str, str], dependencies: list[Dependency]) -> list[str]:
    """Frameworks/tools from dependency names plus marker files (Dockerfile, next.config.js, ...)."""
    labels: list[str] = []
    for dep in [*_own_package_names(files), *dependencies]:
        label = _framework_for(dep)
        if label and label not in labels:
            labels.append(label)
    for path in files:
        label = MARKER_FILES.get(_basename(path))
        if label and label not in labels:
            labels.append(label)
    return labels
