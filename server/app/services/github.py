"""GitHub access: parse repo URLs, fetch metadata, and download a repo as in-memory text files."""

import io
import re
import zipfile

import httpx

from app.core.config import get_settings
from app.schemas.repo import RepoMeta

_REPO_URL = re.compile(
    r"^https?://(?:www\.)?github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+?)(?:\.git)?/?$"
)

API = "https://api.github.com"
MAX_ARCHIVE_BYTES = 80 * 1024 * 1024  # refuse to download huge repos
MAX_FILE_BYTES = 200 * 1024  # skip big files (generated, minified, data)
MAX_FILES = 1500
MAX_TOTAL_BYTES = 40 * 1024 * 1024  # cap on decompressed text kept in memory

SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", "__pycache__", ".venv", "venv",
    "env", ".idea", ".vscode", "vendor", "target", "coverage", ".cache", ".turbo", "bower_components",
    ".gradle", ".pytest_cache", ".mypy_cache", "site-packages",
}
SKIP_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", "Cargo.lock",
    "composer.lock", "Gemfile.lock", "go.sum", "bun.lockb", ".DS_Store",
}
BINARY_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".svgz", ".pdf", ".zip", ".gz", ".tar",
    ".tgz", ".7z", ".rar", ".jar", ".war", ".class", ".exe", ".dll", ".so", ".dylib", ".o", ".a",
    ".pyc", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4", ".mov", ".avi", ".wav",
    ".onnx", ".pt", ".pth", ".bin", ".pkl", ".parquet", ".sqlite", ".db", ".lock",
}


class InvalidRepoUrl(ValueError):
    pass


class GitHubError(Exception):
    """A failure talking to GitHub, with an HTTP status and a message safe to show users."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def parse_repo_url(url: str) -> tuple[str, str]:
    match = _REPO_URL.match(url.strip())
    if not match:
        raise InvalidRepoUrl("Enter a valid GitHub URL, e.g. https://github.com/owner/repo")
    return match["owner"], match["repo"]


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    token = get_settings().github_token
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _raise_for_status(resp: httpx.Response) -> None:
    if resp.status_code < 400:
        return
    if resp.status_code == 404:
        raise GitHubError(404, "Repository not found. It may not exist or may be private.")
    if resp.status_code in (403, 429):
        if resp.headers.get("x-ratelimit-remaining") == "0" or resp.status_code == 429:
            raise GitHubError(429, "GitHub API rate limit reached. Set GITHUB_TOKEN in server/.env, or try again later.")
        raise GitHubError(403, "GitHub denied access to this repository.")
    raise GitHubError(502, f"GitHub returned an error ({resp.status_code}).")


def fetch_meta(client: httpx.Client, owner: str, repo: str) -> tuple[RepoMeta, int]:
    """Repo metadata plus its size in KB (as reported by GitHub)."""
    resp = client.get(f"{API}/repos/{owner}/{repo}", headers=_headers())
    _raise_for_status(resp)
    data = resp.json()
    meta = RepoMeta(
        owner=data["owner"]["login"],
        repo=data["name"],
        description=data.get("description") or "",
        html_url=data["html_url"],
        default_branch=data.get("default_branch") or "main",
        stars=data.get("stargazers_count", 0),
        forks=data.get("forks_count", 0),
        license=(data.get("license") or {}).get("spdx_id"),
    )
    return meta, data.get("size", 0)


def _download_zipball(client: httpx.Client, owner: str, repo: str) -> bytes:
    chunks: list[bytes] = []
    total = 0
    with client.stream("GET", f"{API}/repos/{owner}/{repo}/zipball", headers=_headers()) as resp:
        _raise_for_status(resp)
        for chunk in resp.iter_bytes():
            total += len(chunk)
            if total > MAX_ARCHIVE_BYTES:
                raise GitHubError(413, "Repository is too large to analyse (over 80 MB).")
            chunks.append(chunk)
    return b"".join(chunks)


def _keep(path: str) -> bool:
    parts = path.split("/")
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return False
    name = parts[-1]
    if name in SKIP_FILES or name.endswith((".min.js", ".min.css", ".map")):
        return False
    if "." not in name:
        return True
    return "." + name.rsplit(".", 1)[-1].lower() not in BINARY_EXTS


def _extract_text_files(archive: bytes) -> dict[str, str]:
    """Unzip into {path: text}, dropping the top-level folder, binaries, junk dirs and huge files."""
    files: dict[str, str] = {}
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        candidates = []
        for info in zf.infolist():
            if info.is_dir() or info.file_size > MAX_FILE_BYTES:
                continue
            _, _, path = info.filename.partition("/")  # GitHub wraps everything in "<repo>-<sha>/"
            if path and _keep(path):
                candidates.append((path, info))

        # Read shallowest files first (most structure), bounded by file count and total size,
        # so a crafted archive can't make us decompress gigabytes.
        candidates.sort(key=lambda c: (c[0].count("/"), c[0]))
        total = 0
        for path, info in candidates:
            if len(files) >= MAX_FILES or total + info.file_size > MAX_TOTAL_BYTES:
                break
            raw = zf.read(info)
            if b"\x00" in raw[:8000]:  # binary
                continue
            total += len(raw)
            files[path] = raw.decode("utf-8", errors="replace")
    return dict(sorted(files.items()))


def fetch_repo(owner: str, repo: str) -> tuple[RepoMeta, dict[str, str]]:
    """Fetch metadata and every analysable text file of a public repo. Raises GitHubError."""
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            meta, size_kb = fetch_meta(client, owner, repo)
            if size_kb * 1024 > MAX_ARCHIVE_BYTES:
                raise GitHubError(413, "Repository is too large to analyse (over 80 MB).")
            archive = _download_zipball(client, owner, repo)
    except httpx.TimeoutException as exc:
        raise GitHubError(504, "GitHub took too long to respond. Try again.") from exc
    except httpx.HTTPError as exc:
        raise GitHubError(502, "Could not reach GitHub.") from exc

    try:
        files = _extract_text_files(archive)
    except zipfile.BadZipFile as exc:
        raise GitHubError(502, "GitHub returned an invalid archive.") from exc

    meta.file_count = len(files)
    return meta, files
