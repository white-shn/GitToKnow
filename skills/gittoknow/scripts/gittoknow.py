#!/usr/bin/env python3
"""Command-line client for the GitToKnow API (Python standard library only).

Commands:
  analyze  <repo-url>                 fetch + analyse a repo, wait until chat is ready
  onboard  <repo-url>                 markdown onboarding brief: overview, start-here files, import hubs
  ask      <repo-url> "<question>"    grounded answer with file:line citations
  file     <repo-url> <path> [--lines A-B]   print a file (or a line range) from the repo

The server is read from GITTOKNOW_API_URL (default http://localhost:8000).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API_URL = os.environ.get("GITTOKNOW_API_URL", "http://localhost:8000").rstrip("/")
REPO_URL = re.compile(r"^https?://(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?$")
READY_TIMEOUT = 300  # seconds to wait for the chat index (large repos take a few minutes)


def fail(message: str) -> "NoReturn":  # noqa: F821
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def request(method: str, path: str, body: dict | None = None, timeout: int = 180):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{API_URL}{path}", data=data, method=method, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.load(res)
    except urllib.error.HTTPError as exc:
        try:
            detail = json.load(exc).get("detail", exc.reason)
        except Exception:
            detail = exc.reason
        fail(f"{exc.code} from {path}: {detail}")
    except urllib.error.URLError as exc:
        fail(f"cannot reach the GitToKnow API at {API_URL} ({exc.reason}). Set GITTOKNOW_API_URL or start the server.")


def split_repo(url: str) -> tuple[str, str]:
    match = REPO_URL.match(url.strip())
    if not match:
        fail("expected a GitHub URL like https://github.com/owner/repo")
    return match[1], match[2]


def analyze(url: str) -> dict:
    return request("POST", "/api/repos/analyze", {"repo_url": url})


def wait_until_ready(owner: str, repo: str) -> None:
    """Chat answers need the retrieval index; poll until it is ready."""
    deadline = time.time() + READY_TIMEOUT
    last = -1
    while time.time() < deadline:
        status = request("GET", f"/api/repos/{owner}/{repo}/status")
        state = status["index_status"]
        if state == "ready":
            return
        if state == "failed":
            fail(f"indexing failed: {status.get('error') or 'unknown error'}")
        percent = int(status.get("progress", 0) * 100)
        if percent != last:
            print(f"indexing {owner}/{repo}: {percent}%", file=sys.stderr)
            last = percent
        time.sleep(3)
    fail("timed out waiting for the index; try again in a minute")


def cmd_analyze(args) -> None:
    owner, repo = split_repo(args.repo_url)
    result = analyze(args.repo_url)
    wait_until_ready(owner, repo)
    meta = result["meta"]
    langs = ", ".join(f"{lang['language']} {lang['percent']:.0f}%" for lang in result["languages"][:5])
    print(f"{result['repo_id']} analysed and ready for questions.")
    print(f"{meta.get('description') or '(no description)'}")
    print(f"files: {meta['file_count']} | languages: {langs or 'n/a'}")
    print(f"frameworks: {', '.join(result['frameworks']) or 'none detected'}")


def cmd_onboard(args) -> None:
    owner, repo = split_repo(args.repo_url)
    result = analyze(args.repo_url)
    overview = request("GET", f"/api/repos/{owner}/{repo}/overview")["overview"]

    start_here = [f for f in result["files"] if f["important"]]
    nodes = result["graph"]["nodes"]
    hubs = sorted(nodes, key=lambda n: len(n["imported_by"]), reverse=True)
    hubs = [n for n in hubs if n["imported_by"]][:5]

    print(f"# Onboarding: {result['repo_id']}\n")
    print(overview.strip(), "\n")
    print("## Start here (reading order)\n")
    for i, f in enumerate(start_here[:8], 1):
        print(f"{i}. `{f['path']}`: {f.get('reason') or f['category']}")
    if hubs:
        print("\n## Most depended-on files (change these carefully)\n")
        for n in hubs:
            print(f"- `{n['path']}`: imported by {len(n['imported_by'])} other files")
    deps = [d for d in result["dependencies"] if not d["dev"]][:10]
    if deps:
        print("\n## Key dependencies\n")
        print(", ".join(f"{d['name']}" for d in deps))
    print(f"\nSource: {result['meta']['html_url']}")


def cmd_ask(args) -> None:
    owner, repo = split_repo(args.repo_url)
    analyze(args.repo_url)  # cheap if the repo is already loaded server-side
    wait_until_ready(owner, repo)
    reply = request("POST", f"/api/repos/{owner}/{repo}/chat", {"question": args.question, "history": []})
    print(reply["answer"].strip())
    if reply["citations"]:
        print("\nSources:")
        base = f"https://github.com/{owner}/{repo}/blob/HEAD"
        for c in reply["citations"]:
            print(f"[{c['id']}] {c['path']}:{c['start_line']}-{c['end_line']}  {base}/{c['path']}#L{c['start_line']}-L{c['end_line']}")


def cmd_file(args) -> None:
    owner, repo = split_repo(args.repo_url)
    analyze(args.repo_url)
    quoted = urllib.parse.quote(args.path.lstrip("/"))
    content = request("GET", f"/api/repos/{owner}/{repo}/files/{quoted}")["content"]
    if args.lines:
        match = re.fullmatch(r"(\d+)-(\d+)", args.lines)
        if not match:
            fail("--lines must look like 10-40")
        start, end = int(match[1]), int(match[2])
        lines = content.splitlines()[start - 1 : end]
        content = "\n".join(f"{start + i:>5}  {line}" for i, line in enumerate(lines))
    print(content)


def main() -> None:
    parser = argparse.ArgumentParser(prog="gittoknow", description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("analyze", help="analyse a repo and wait until it is ready")
    p.add_argument("repo_url")
    p.set_defaults(func=cmd_analyze)

    p = sub.add_parser("onboard", help="print a markdown onboarding brief")
    p.add_argument("repo_url")
    p.set_defaults(func=cmd_onboard)

    p = sub.add_parser("ask", help="ask a question about the repo")
    p.add_argument("repo_url")
    p.add_argument("question")
    p.set_defaults(func=cmd_ask)

    p = sub.add_parser("file", help="print a file from the repo")
    p.add_argument("repo_url")
    p.add_argument("path")
    p.add_argument("--lines", help="line range, e.g. 10-40")
    p.set_defaults(func=cmd_file)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
