"""GitHub access. Repo fetching (API / clone, file tree, file contents) goes here."""

import re

_REPO_URL = re.compile(
    r"^https?://(?:www\.)?github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+?)(?:\.git)?/?$"
)


class InvalidRepoUrl(ValueError):
    pass


def parse_repo_url(url: str) -> tuple[str, str]:
    match = _REPO_URL.match(url.strip())
    if not match:
        raise InvalidRepoUrl("Enter a valid GitHub URL, e.g. https://github.com/owner/repo")
    return match["owner"], match["repo"]
