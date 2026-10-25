# Roadmap and API Contract

What's left to build, who owns what, and the API shapes everyone codes against. Read [DEV_GUIDELINES.md](DEV_GUIDELINES.md) and [CONTRIBUTING.md](CONTRIBUTING.md) first.

**Deadline: 5:00 PM today. Feature freeze 4:00 PM. Submit by 4:30 PM.**

## How we work in parallel

The server already serves **mock data** for every endpoint below (`USE_MOCK_DATA=true`, see `server/app/services/mock.py`), so the client can be built right now. Server owners replace the mock for their part with the real implementation; when everything is real, set `USE_MOCK_DATA=false`.

Gemma 4 is called through the Gemini API: models `gemma-4-26b-a4b-it` (default) or `gemma-4-31b-it`, licensed under [Apache 2.0](https://ai.google.dev/gemma/apache_2) ([terms](https://ai.google.dev/gemma/terms)). Embeddings use `gemini-embedding-001`. Get a key at https://aistudio.google.com/apikey and put it in `server/.env` (never commit it).

## Workstreams

Put your name next to a stream so nobody builds the same thing.

| | Stream | Owner | Files |
| --- | --- | --- | --- |
| A | **Server: GitHub fetch + analysis** (reqs 1-6) | | `services/github.py`, new `services/analysis/{tree,languages,detect,classify,important}.py`, `api/routes/repos.py` |
| B | **Server: dependency graph** (reqs 8-12 backend) | | new `services/analysis/graph.py` |
| C | **Server: Gemma + RAG chat + overview** (reqs 7, 13-18) | | `services/llm/{gemma,prompts}.py`, `services/rag/{chunker,index,retriever,chat}.py`, `api/routes/chat.py` |
| D | **Client: workspace shell, overview, structure, code viewer** | | `client/src/features/repo-analysis/`, `features/code-viewer/`, `pages/Dashboard.jsx` |
| E | **Client: architecture graph + chat UI** | | `client/src/features/architecture/`, `features/chat/`, `api/chat.js` |

### A. GitHub fetch + analysis
- Fetch metadata (`GET /repos/{o}/{r}`) and download the **zipball once**, extracting text files in memory into `store.RepoRecord.files`. Skip binaries, `node_modules`, `.git`, lockfiles, files over ~200 KB; cap ~1500 files. Use `GITHUB_TOKEN` if set. Turn 404/403/rate-limit into `HTTPException` with a clear `detail`.
- `tree.py` nested tree, `languages.py` extension to language counts, `detect.py` frameworks and dependencies (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `pom.xml`), `classify.py` into frontend/backend/config/tests/docs/other, `important.py` entry points, routing and config files with a short `reason`.

### B. Dependency graph
- Parse imports: Python via `ast`; JS/JSX/TS via regex for `import ... from`, `require()`, dynamic `import()`. Resolve relative paths and aliases (`@/`) to real files; produce `nodes` and `edges` with `imports` / `imported_by`.
- Cap ~150 nodes. For bigger repos collapse to folder-level components, listing member files in `GraphNode.files`.

### C. Gemma + RAG + overview
- `gemma.py`: `google-genai` client with `generate()` and `embed()`. `prompts.py`: overview and chat prompts.
- Overview: prompt from meta + tree + important files + README, markdown out.
- RAG: chunk by ~60-line windows with overlap (keep `path/start_line/end_line`), embed in batches, in-memory numpy cosine similarity, index in a background task and update `index_status` / `index_progress`. Chat: rewrite follow-up into a standalone query from `history`, retrieve top-k, number the chunks, tell the model to cite `[n]`, map `[n]` back to `citations`. If nothing relevant is retrieved, say so instead of guessing.

### D. Client workspace
- After analysis, replace `AnalysisResult.jsx` with shadcn **Tabs**: Overview | Structure | Architecture | Chat (no router). Share state through a `RepoProvider` context.
- Overview (markdown), language/framework/dependency badges, file tree with category badges, important files list.
- `CodeViewerDialog.jsx`: fetches a file, shows line numbers, highlights and scrolls to a line range. Used by graph node details **and** chat citations.

### E. Architecture graph + chat UI
- React Flow graph (nodes coloured by category, dagre layout), `NodeDetails` side panel (files, imports, imported-by; clicking a file opens the code viewer).
- Chat panel with suggested questions, citation chips (`path:start-end`) opening the code viewer, `useChat` hook sending `history` for follow-ups, loading state until `index_status` is `ready`.

## New dependencies (one person installs, then pushes; list them in the README)

- Client: `@xyflow/react`, `@dagrejs/dagre`, `react-markdown`; shadcn `tabs`, `textarea`, `dialog`, `scroll-area`, `skeleton`.
- Server: `google-genai`, `httpx`, `numpy`.

## API contract

`repo_id` is `owner/repo` and goes straight into the URL: `/api/repos/${repoId}/overview`. Schemas live in `server/app/schemas/` (`repo.py`, `chat.py`); keep them in sync with the client and tell the team if you change one.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/repos/analyze` | `{ repo_url }` | `AnalyzeResponse`: `repo_id`, `meta`, `tree[]`, `languages[]`, `frameworks[]`, `dependencies[]`, `files[]`, `graph{nodes,edges}`, `index_status` |
| GET | `/api/repos/{owner}/{repo}/overview` | | `{ overview }` (markdown) |
| GET | `/api/repos/{owner}/{repo}/status` | | `{ index_status: pending\|indexing\|ready\|failed, progress: 0..1 }` |
| GET | `/api/repos/{owner}/{repo}/files/{path}` | | `{ path, language, content }` |
| POST | `/api/repos/{owner}/{repo}/chat` | `{ question, history: [{role, content}] }` | `{ answer, citations: [{id, path, start_line, end_line, snippet}] }` |

Key shapes:

- `FileInfo`: `path, size, language, category (frontend|backend|config|tests|docs|other), important, reason`
- `GraphNode`: `id, label, path, category, group, files[], imports[], imported_by[]`; `GraphEdge`: `source, target` (node ids)
- `TreeNode`: `name, path, type (dir|file), children[]`
- Citations: `id` matches the `[n]` markers in `answer`

## Timeline

| Time | Goal |
| --- | --- |
| now to ~1:45 | Pick a stream, pull, branch; run the app and see mock data end to end |
| to ~3:15 | Build your stream against the contract |
| 3:15 - 3:50 | Integrate real endpoints (`USE_MOCK_DATA=false`), test 2-3 repos, fix breakage |
| 3:50 - 4:00 | UI polish |
| **4:00** | **Feature freeze** |
| 4:00 - 4:30 | README, AI tools log, models table, demo rehearsal |
| **4:30** | **Submit on OrganizerHQ** |

If time runs short, cut in this order: framework detection beyond package/requirements files, graph support beyond JS and Python, GSAP extras, multi-turn query rewriting (send the last few turns as-is).
