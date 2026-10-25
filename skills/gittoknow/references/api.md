# GitToKnow API reference

Read this only if you need to call the server directly instead of using `scripts/gittoknow.py`. Base URL: `GITTOKNOW_API_URL` (default `http://localhost:8000`). Interactive docs at `/docs`.

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/api/repos/analyze` | `{"repo_url": "https://github.com/owner/repo"}`. Returns `repo_id`, `meta`, `tree`, `languages`, `frameworks`, `dependencies`, `files` (each with `important` and `reason`), `graph` (`nodes` with `imports` / `imported_by`) and `index_status`. Also starts indexing. Safe to call again for the same repo. |
| GET | `/api/repos/{owner}/{repo}/overview` | `{"overview": "<markdown>"}` written by Gemma 4. |
| GET | `/api/repos/{owner}/{repo}/status` | `{"index_status": "pending" or "indexing" or "ready" or "failed", "progress": 0..1, "error": null}`. Chat needs `ready`. |
| POST | `/api/repos/{owner}/{repo}/chat` | `{"question": "...", "history": [{"role": "user" or "assistant", "content": "..."}]}`. Returns `answer` (markdown with `[n]` markers) and `citations` (`id`, `path`, `start_line`, `end_line`, `snippet`). HTTP 409 while indexing. |
| GET | `/api/repos/{owner}/{repo}/files/{path}` | `{"path", "language", "content"}` for one file. |

Errors come back as `{"detail": "<message>"}` with a status code: 404 (repo not analysed or file not found), 409 (index not ready), 422 (bad URL or no analysable files), 403/429 (rate limit).

## Models

Answers and overviews use **Gemma 4** (`gemma-4-26b-a4b-it`, open-weight, [Apache 2.0](https://ai.google.dev/gemma/apache_2)) through the Gemini API. Retrieval embeddings use `gemini-embedding-001`.
