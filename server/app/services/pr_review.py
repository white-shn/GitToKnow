"""Lightweight, explainable review of open GitHub pull requests."""

import re
import json
from collections import Counter, defaultdict

import httpx

from app.services.github import API, GitHubError, _headers, _raise_for_status
from app.services.llm import gemma

MAX_PULLS = 20
ISSUE_REF = re.compile(r"(?:\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#|#)(\d+)", re.I)
TEST_PATH = re.compile(r"(^|/)(test|tests|__tests__|spec)(/|_|\.)|\.(test|spec)\.", re.I)


def _issues(pr: dict) -> list[int]:
    text = f"{pr.get('title', '')}\n{pr.get('body') or ''}"
    return sorted({int(value) for value in ISSUE_REF.findall(text)})


def _review_pr(pr: dict, files: list[str], all_file_counts: Counter) -> dict:
    notes: list[str] = []
    score = 100
    additions, deletions = pr.get("additions", 0), pr.get("deletions", 0)
    changed = len(files)
    shared = sorted(path for path in files if all_file_counts[path] > 1)

    if pr.get("draft"):
        score -= 45
        notes.append("Draft PR — do not merge until the author marks it ready.")
    if pr.get("mergeable") is False:
        score -= 40
        notes.append("GitHub reports merge conflicts; rebase or resolve conflicts first.")
    if changed > 35 or additions + deletions > 1200:
        score -= 15
        notes.append("Large change set — split it or request a focused manual review.")
    if not any(TEST_PATH.search(path) for path in files):
        score -= 12
        notes.append("No test files changed — add or update tests for the behaviour change.")
    if shared:
        score -= min(20, len(shared) * 4)
        notes.append(f"Overlaps with another PR in {len(shared)} file(s): {', '.join(shared[:3])}{'…' if len(shared) > 3 else ''}.")
    if not notes:
        notes.append("Focused, mergeable change with no detected overlap or test-gap warning.")

    return {
        "number": pr["number"], "title": pr["title"], "url": pr["html_url"],
        "author": pr["user"]["login"], "draft": pr.get("draft", False),
        "updated_at": pr.get("updated_at"), "additions": additions, "deletions": deletions,
        "changed_files": changed, "issues": _issues(pr), "score": max(score, 0),
        "recommendations": notes, "overlapping_files": shared,
    }


def _ai_review(owner: str, repo: str, groups: list[dict]) -> tuple[str | None, str]:
    """Ask Groq for a concise senior-reviewer perspective over bounded PR metadata."""
    evidence = [
        {
            "issue": group["issue"],
            "recommended_pr": group["best_pr_number"],
            "candidates": [
                {
                    "number": pr["number"], "title": pr["title"], "score": pr["score"],
                    "draft": pr["draft"], "changed_files": pr["changed_files"],
                    "additions": pr["additions"], "deletions": pr["deletions"],
                    "warnings": pr["recommendations"], "overlap": pr["overlapping_files"][:10],
                }
                for pr in group["pull_requests"]
            ],
        }
        for group in groups
    ]
    prompt = (
        f"You are a senior maintainer reviewing open pull requests for {owner}/{repo}. "
        "Use only the supplied metadata; do not claim you inspected source code or diffs. "
        "Write concise Markdown with: (1) merge recommendation for each issue group, "
        "(2) blockers before merge, and (3) the highest-value test or verification to request. "
        "If an issue has only one PR, assess its readiness rather than inventing a comparison.\n\n"
        f"Review evidence:\n{json.dumps(evidence, ensure_ascii=False)}"
    )
    try:
        return gemma.generate_with_fallback_model(
            prompt,
            system="Be precise, practical, and conservative. Never invent facts beyond the provided pull-request metadata.",
            max_output_tokens=1200,
        ), "Groq AI review"
    except gemma.LLMError as exc:
        return None, exc.detail


def review_pull_requests(owner: str, repo: str) -> dict:
    """Fetch open PRs and return reviewable, bounded data for the UI."""
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(f"{API}/repos/{owner}/{repo}/pulls", params={"state": "open", "per_page": MAX_PULLS}, headers=_headers())
            _raise_for_status(response)
            pulls = response.json()
            file_lists: dict[int, list[str]] = {}
            for pr in pulls:
                detail = client.get(f"{API}/repos/{owner}/{repo}/pulls/{pr['number']}", headers=_headers())
                _raise_for_status(detail)
                pr.update(detail.json())
                files_response = client.get(f"{API}/repos/{owner}/{repo}/pulls/{pr['number']}/files", params={"per_page": 100}, headers=_headers())
                _raise_for_status(files_response)
                file_lists[pr["number"]] = [item["filename"] for item in files_response.json()]
    except httpx.TimeoutException as exc:
        raise GitHubError(504, "GitHub took too long to return the pull requests. Try again.") from exc
    except httpx.HTTPError as exc:
        raise GitHubError(502, "Could not reach GitHub for pull-request review.") from exc

    file_counts = Counter(path for paths in file_lists.values() for path in paths)
    reviews = [_review_pr(pr, file_lists[pr["number"]], file_counts) for pr in pulls]
    reviews.sort(key=lambda item: (-item["score"], item["number"]))

    grouped: dict[str, list[dict]] = defaultdict(list)
    for review in reviews:
        keys = [f"Issue #{issue}" for issue in review["issues"]] or ["No linked issue"]
        for key in keys:
            grouped[key].append(review)

    groups = []
    for issue, candidates in grouped.items():
        winner = max(candidates, key=lambda item: item["score"])
        groups.append({
            "issue": issue,
            "best_pr_number": winner["number"],
            "reason": f"Highest review score ({winner['score']}/100) among {len(candidates)} PR(s) for this issue.",
            "pull_requests": sorted(candidates, key=lambda item: (-item["score"], item["number"])),
        })
    groups.sort(key=lambda item: (item["issue"] == "No linked issue", item["issue"]))
    ai_review, ai_status = _ai_review(owner, repo, groups) if reviews else (None, "No open pull requests to review.")
    return {
        "repo_id": f"{owner}/{repo}", "open_pr_count": len(reviews), "groups": groups,
        "truncated": len(pulls) == MAX_PULLS, "ai_review": ai_review, "ai_status": ai_status,
    }
