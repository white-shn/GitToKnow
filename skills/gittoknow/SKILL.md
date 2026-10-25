---
name: gittoknow
description: Onboards a developer to an unfamiliar public GitHub repository. Use when the user wants to understand, explore or start contributing to a repo, asks "how does this codebase work", "where do I start", "what does this repo do", or "where is X implemented", or pastes a github.com/owner/repo URL. Returns an AI overview, a reading order of the important files, the most depended-on files, and answers to code questions with file and line citations. Do not use for private repositories or for editing code.
license: MIT
compatibility: Requires Python 3.9+ (standard library only) and network access to a running GitToKnow API (set GITTOKNOW_API_URL; defaults to http://localhost:8000). Public GitHub repositories only.
metadata:
  author: GitToKnow team
  version: "1.0"
---

# GitToKnow: onboard to a repository

GitToKnow analyses a public GitHub repository (file tree, languages, real import graph) and answers questions about it using retrieval over the actual code and **Gemma 4** (open-weight, Apache 2.0). Every answer cites the files and lines it came from, so you can verify it.

All commands go through `scripts/gittoknow.py`, which only needs the Python standard library. Run it from this skill's directory, or use its full path.

## Setup

The skill talks to a GitToKnow server. Before the first call, check that one is reachable:

- Local: `cd server && uvicorn app.main:app` (serves http://localhost:8000), or
- Hosted: `export GITTOKNOW_API_URL=https://gittoknow-api.onrender.com` (the free instance sleeps; the first call can take about a minute).

If a command says it cannot reach the API, tell the user and ask for the server URL. Do not guess.

## Workflow: "help me get started with this repo"

1. Run the onboarding brief:
   ```
   python scripts/gittoknow.py onboard https://github.com/owner/repo
   ```
   It prints an overview, a numbered reading order of the important files (with the reason each matters), the most depended-on files, and key dependencies.
2. Present it to the user as a short plan: what the project is, the 3 to 5 files to read first, and what to be careful changing. Keep the file paths exact.
3. Offer follow-up questions. Answer them with the `ask` command below rather than from memory.

## Commands

| Task | Command |
| --- | --- |
| Analyse and wait until questions can be answered | `python scripts/gittoknow.py analyze <repo-url>` |
| Onboarding brief (markdown) | `python scripts/gittoknow.py onboard <repo-url>` |
| Ask a question about the code | `python scripts/gittoknow.py ask <repo-url> "<question>"` |
| Read a file or a line range | `python scripts/gittoknow.py file <repo-url> <path> --lines 10-40` |

`<repo-url>` must look like `https://github.com/owner/repo`.

## Answering questions well

- Ask specific, code-level questions ("where is authentication handled?", "how does a request reach the database?"). Broad questions return broad answers.
- The answer text contains `[n]` markers; the `Sources:` list below it maps each to `path:start-end` and a GitHub link. Always pass these citations on to the user.
- To verify or go deeper on a citation, run the `file` command with `--lines` for that range, then reason about the code yourself.
- If the answer says the retrieved code does not cover the question, say so and try a differently worded question instead of inventing details.

## Gotchas

- First analysis of a large repo takes a while: the retrieval index builds in the background (the script prints progress to stderr). Small repos are ready in seconds.
- Repositories are capped at about 1500 text files; binaries, lockfiles, `node_modules` and files over 200 KB are skipped.
- A rate-limit message (HTTP 403 or 429) means the GitHub or Gemini free quota is used up. Report it and suggest retrying in a minute; do not loop.
- Analysed repos live in the server's memory, so a server restart means running `analyze` again (the other commands do this automatically).

More detail on the endpoints the script calls is in [references/api.md](references/api.md).
