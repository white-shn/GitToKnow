"""Mock data matching the real response shapes, so the client can be built before the pipeline exists.

Delete the pieces as the real implementations replace them (see USE_MOCK_DATA in config).
"""

from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.schemas.repo import (
    AnalyzeResponse,
    Dependency,
    FileContent,
    FileInfo,
    Graph,
    GraphEdge,
    GraphNode,
    LanguageStat,
    RepoMeta,
    TreeNode,
)

_FILES = [
    # path, size, language, category, important reason
    ("README.md", 2100, "Markdown", "docs", None),
    ("package.json", 900, "JSON", "config", "Project manifest and dependencies"),
    ("server.js", 1800, "JavaScript", "backend", "Application entry point"),
    ("src/routes/index.js", 1200, "JavaScript", "backend", "Route registration"),
    ("src/routes/users.js", 2400, "JavaScript", "backend", None),
    ("src/controllers/userController.js", 3100, "JavaScript", "backend", None),
    ("src/models/user.js", 1500, "JavaScript", "backend", None),
    ("src/db/connection.js", 800, "JavaScript", "backend", "Database setup"),
    ("src/middleware/auth.js", 1100, "JavaScript", "backend", None),
    ("client/src/App.jsx", 1600, "JavaScript", "frontend", "Frontend entry component"),
    ("client/src/pages/Home.jsx", 2200, "JavaScript", "frontend", None),
    ("tests/users.test.js", 1900, "JavaScript", "tests", None),
    (".env.example", 120, None, "config", None),
]

_EDGES = [
    ("server.js", "src/routes/index.js"),
    ("server.js", "src/db/connection.js"),
    ("src/routes/index.js", "src/routes/users.js"),
    ("src/routes/users.js", "src/controllers/userController.js"),
    ("src/routes/users.js", "src/middleware/auth.js"),
    ("src/controllers/userController.js", "src/models/user.js"),
    ("src/models/user.js", "src/db/connection.js"),
    ("client/src/pages/Home.jsx", "client/src/App.jsx"),
]


def _tree() -> list[TreeNode]:
    root: dict = {}
    for path, *_ in _FILES:
        node = root
        for part in path.split("/"):
            node = node.setdefault(part, {})

    def build(level: dict, prefix: str) -> list[TreeNode]:
        out = []
        for name, children in sorted(level.items(), key=lambda kv: (not kv[1], kv[0])):
            path = f"{prefix}{name}"
            if children:
                out.append(TreeNode(name=name, path=path, type="dir", children=build(children, path + "/")))
            else:
                out.append(TreeNode(name=name, path=path, type="file"))
        return out

    return build(root, "")


def mock_analysis(owner: str, repo: str) -> AnalyzeResponse:
    files = [
        FileInfo(path=p, size=s, language=lang, category=cat, important=bool(why), reason=why)
        for p, s, lang, cat, why in _FILES
    ]
    cats = {f.path: f.category for f in files}
    nodes = [
        GraphNode(
            id=f.path,
            label=f.path.rsplit("/", 1)[-1],
            path=f.path,
            category=f.category,
            group=f.path.split("/")[0] if "/" in f.path else "root",
            files=[f.path],
            imports=[t for s, t in _EDGES if s == f.path],
            imported_by=[s for s, t in _EDGES if t == f.path],
        )
        for f in files
        if f.language == "JavaScript" and f.category != "tests"
    ]
    return AnalyzeResponse(
        repo_id=f"{owner}/{repo}",
        meta=RepoMeta(
            owner=owner,
            repo=repo,
            description="(mock) Example Express + React app",
            html_url=f"https://github.com/{owner}/{repo}",
            stars=128,
            forks=14,
            license="MIT",
            file_count=len(files),
        ),
        tree=_tree(),
        languages=[
            LanguageStat(language="JavaScript", files=10, percent=83.3),
            LanguageStat(language="Markdown", files=1, percent=8.3),
            LanguageStat(language="JSON", files=1, percent=8.3),
        ],
        frameworks=["Express", "React", "Vite"],
        dependencies=[
            Dependency(name="express", version="^4.19.2", ecosystem="npm"),
            Dependency(name="mongoose", version="^8.4.0", ecosystem="npm"),
            Dependency(name="react", version="^19.0.0", ecosystem="npm"),
            Dependency(name="jest", version="^29.7.0", ecosystem="npm", dev=True),
        ],
        files=files,
        graph=Graph(
            nodes=nodes,
            edges=[GraphEdge(source=s, target=t) for s, t in _EDGES if s in cats and t in cats],
        ),
        index_status="ready",
    )


def mock_overview(owner: str, repo: str) -> str:
    return (
        f"## {owner}/{repo} (mock overview)\n\n"
        "A small **Express** REST API with a **React** client.\n\n"
        "- `server.js` boots the app, connects the database and mounts the routes.\n"
        "- `src/routes` map URLs to controllers; `src/controllers` hold the request logic.\n"
        "- `src/models` define the data layer on top of `src/db/connection.js`.\n"
    )


def mock_file(path: str) -> FileContent:
    lines = [f"// {path} (mock content)"] + [f"const line{i} = {i}; // placeholder" for i in range(2, 41)]
    return FileContent(path=path, language="JavaScript", content="\n".join(lines))


def mock_chat(req: ChatRequest) -> ChatResponse:
    return ChatResponse(
        answer=(
            f"(mock) You asked: \"{req.question}\". Requests enter through `server.js` [1], "
            "are routed in `src/routes/users.js` [2] and handled by the user controller."
        ),
        citations=[
            Citation(id=1, path="server.js", start_line=5, end_line=12, snippet="const app = express()"),
            Citation(id=2, path="src/routes/users.js", start_line=1, end_line=10, snippet="router.get('/')"),
        ],
    )
