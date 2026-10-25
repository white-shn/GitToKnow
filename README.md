# GitToKnow

**Understand any GitHub codebase in minutes.** Paste a public repository URL and GitToKnow maps its structure, draws an interactive architecture graph from the real imports, writes an AI overview, and answers questions about the code with clickable references to the exact files and lines.

Built for **Hacktoberfest x MOSS Hack Day Udupi** (MIT Manipal, 25 October 2026). Challenges: Best Open-Source AI Project and Best Use of Gemma 4.

**Stack:** React + Vite (JavaScript) / Tailwind CSS v4 / shadcn/ui / GSAP, and FastAPI (Python). AI: **Gemma 4** through the Gemini API.

## What it does

Paste a public repository URL and you get three views plus an always-available assistant:

| View | What you get |
| --- | --- |
| **AI Summary** | A Gemma 4 written overview (what it does, tech stack, how it is organised, where to start), languages, frameworks, dependencies, and a "Start here" list of the important files with the reason each matters |
| **File Structure** | **Galaxy:** the whole codebase as an interactive sunburst, arc size = code volume, colour = category; click a folder to dive in, click a file to read it. **Explorer:** a searchable, filterable IDE-style tree with a code preview |
| **Structure Map** | An Obsidian-style physics graph of which files import which, built from real `import` / `require` statements. Drag nodes, zoom, hover to light up a file's neighbours, click to inspect what it depends on and what uses it |
| **Ask the Repo** (right sidebar, on every page) | Chat about the codebase while you explore. Answers are grounded in retrieved code and cite `[n]` sources that open the file at the cited lines; follow-up questions work, and the conversation is kept as you move between pages |

## Agent skill

GitToKnow also ships as an **agent skill** that follows the [Agent Skills open standard](https://agentskills.io): [`skills/gittoknow/`](skills/gittoknow/SKILL.md). Any skills-compatible agent (Claude Code, OpenCode and others) can use it to onboard a developer to a repository: it calls the GitToKnow API, so the answers come from Gemma 4 over the real code and carry file and line citations.

```
skills/gittoknow/
  SKILL.md              name, description and the onboarding workflow the agent follows
  scripts/gittoknow.py  CLI the agent runs: analyze, onboard, ask, file (Python standard library only)
  references/api.md     the endpoints behind the CLI
```

Install it by copying the `skills/gittoknow` folder into your agent's skills directory (for Claude Code that is `.claude/skills/`; check your agent's docs for others), point it at a running server with `GITTOKNOW_API_URL` (default `http://localhost:8000`), then ask the agent something like "help me get started with https://github.com/pallets/flask". You can also run the CLI by hand:

```bash
python skills/gittoknow/scripts/gittoknow.py onboard https://github.com/pallets/flask
python skills/gittoknow/scripts/gittoknow.py ask https://github.com/pallets/flask "where are routes registered?"
```

## How it works

1. **Fetch:** the server downloads the repository through the GitHub API (metadata plus the zipball) and keeps the text files in memory. Binaries, `node_modules`, lockfiles and huge files are skipped.
2. **Analyse:** it builds the file tree, language breakdown, frameworks and dependencies (from `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`), classifies every file, and flags entry points, routing and config files.
3. **Graph:** imports are parsed and resolved to real files for JavaScript/TypeScript (including `tsconfig`/`jsconfig` aliases), Python and Java. Large repos collapse into folder components.
4. **Index (RAG):** code is split into line-window chunks (each remembers its file and line range). Keyword (BM25) search over them is ready instantly; embeddings from `gemini-embedding-001` are then added in the background, most important files first, and blended in for semantic search. If the embedding quota runs out, chat keeps working on keyword search.
5. **Answer:** a question retrieves the most relevant chunks (keywords plus embedding similarity), and **Gemma 4** answers using only those excerpts, citing them as `[n]`. Each citation maps back to a file and line range that the UI opens in a code viewer.

## Models, libraries and AI tools

### Models

| Model | Used for | License / terms |
| --- | --- | --- |
| **Gemma 4** `gemma-4-26b-a4b-it` (open-weight), called through the Gemini API | Repository overview and chat answers | [Apache 2.0](https://ai.google.dev/gemma/apache_2), [terms](https://ai.google.dev/gemma/terms) |
| `gemini-embedding-001` (Gemini API) | Embeddings for code retrieval. This is a hosted Google model, not open-weight | [Gemini API terms](https://ai.google.dev/gemini-api/terms) |
| *Optional fallback:* xAI Grok (`grok-4` by default), or any OpenAI-compatible model set in `.env` | Used **only** if Gemma 4 fails or runs out of quota; the answer is labelled when it is used. The hosted Grok API is a closed model, so it does not count toward the open-source AI requirement. Gemma 4 is the primary and default model | [xAI terms](https://x.ai/legal) |

**How Gemma 4 is called:** [`server/app/services/llm/gemma.py`](server/app/services/llm/gemma.py) wraps the `google-genai` SDK. `generate()` calls `models.generate_content` for the model above (with minimal thinking, which was about 3x faster than the default with equal answer quality in our tests); prompts live in [`llm/prompts.py`](server/app/services/llm/prompts.py). The overview is built in [`llm/overview.py`](server/app/services/llm/overview.py) and chat in [`rag/chat.py`](server/app/services/rag/chat.py).

### APIs and data

- **GitHub REST API** for public repository metadata and contents (no dataset is used; everything is fetched live)
- **Gemini API** for Gemma 4 and embeddings

### Libraries and frameworks

- **Client:** [React](https://react.dev) 19, [React Router](https://reactrouter.com), [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com) v4, [shadcn/ui](https://ui.shadcn.com) (with [Radix UI](https://www.radix-ui.com), class-variance-authority, clsx, tailwind-merge, tw-animate-css), [GSAP](https://gsap.com), [lucide-react](https://lucide.dev), [d3-force](https://github.com/d3/d3-force) for the graph physics (rendered on a canvas), [react-markdown](https://github.com/remarkjs/react-markdown), [oxlint](https://oxc.rs)
- **Server:** [FastAPI](https://fastapi.tiangolo.com), Uvicorn, Pydantic and pydantic-settings, [httpx](https://www.python-httpx.org), [google-genai](https://github.com/googleapis/python-genai), [NumPy](https://numpy.org)

### AI coding tools

AI tools were used to help build this project. Credited here as the rules require:

- **Claude Code** (Anthropic, Claude Sonnet 5.5): the initial client/server scaffold and dashboard, the GitHub fetching and repository analysis, the dependency graph, the Gemma 4 overview and RAG chat pipeline, the client UI (file tree and galaxy view, force graph, chat sidebar, code viewer, animations), the project docs, and the review and fix of the Render deployment configuration, and the agent skill under `skills/gittoknow/`.
- **Antigravity** (Google): AI coding assistance used by team members during the event.
- **OpenCode**: AI coding assistance used by team members during the event.
- **Gemma 4** (Google, via the Gemini API): the AI *inside* the product (overview and chat answers), described under Models above. It is not used to write the code.
- **Fallback model (optional):** if `FALLBACK_API_KEY` is set, xAI Grok (or another OpenAI-compatible model) answers only when Gemma 4 fails, and such answers are labelled. It is part of the running app, not a coding tool.

## Quick start

You need Node 20+ and Python 3.11+. Run the server and client in separate terminals.

**Server** (http://localhost:8000, API docs at `/docs`)

```bash
cd server
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit .env, see below
uvicorn app.main:app --reload
```

In `server/.env` set:

- `GEMINI_API_KEY`: get one at https://aistudio.google.com/apikey (needed for the AI summary and chat)
- `FALLBACK_API_KEY`: optional; enables a fallback model (xAI Grok by default) if Gemma 4 fails or runs out of quota. Leave empty to use Gemma 4 only
- `GITHUB_TOKEN`: optional but recommended; without it GitHub allows only 60 requests per hour (a token with no scopes is enough for public repos)

**Client** (http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

The header badge shows **API online** when the client can reach the server. Paste a public GitHub URL (for example `https://github.com/pallets/flask`) and click **Analyse Repository**.

Notes: small repositories are ready for chat in a couple of seconds. The Gemini free tier allows 100 embedded chunks per minute, so large repositories take a few minutes to index fully (chat works while that finishes, using the most important files first). Set `USE_MOCK_DATA=true` in `.env` to get fake data for UI work without any API keys.

## Deploy to Render

[`render.yaml`](render.yaml) defines two services: **gittoknow-api** (FastAPI, from `server/`) and **gittoknow** (the React site, built from `client/`).

1. Render dashboard > **New > Blueprint**, select `white-shn/GitToKnow` and the `main` branch.
2. When asked, enter the secrets: `GEMINI_API_KEY` (required), `GITHUB_TOKEN` (recommended) and optionally `FALLBACK_API_KEY`.
3. Deploy. The site will be at `https://gittoknow.onrender.com` and the API at `https://gittoknow-api.onrender.com`.
4. If Render adds a suffix to either name (the names are global), set `VITE_API_URL` on the site to the API's real URL and redeploy it. The API already accepts any `*.onrender.com` origin.

Notes: the free plan sleeps after about 15 minutes without traffic (the first request after that takes about a minute), and analysed repositories are kept in memory, so they are lost when the API restarts. Open the site once before a demo to wake it.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| POST | `/api/repos/analyze` | `{ "repo_url": "https://github.com/owner/repo" }`: fetch and analyse; returns tree, languages, frameworks, dependencies, classified files and the import graph, and starts indexing |
| GET | `/api/repos/{owner}/{repo}/overview` | AI overview (markdown) |
| GET | `/api/repos/{owner}/{repo}/status` | Chat index status: `pending`, `indexing`, `ready`, `failed`, with progress |
| GET | `/api/repos/{owner}/{repo}/files/{path}` | Content of one file (code viewer) |
| POST | `/api/repos/{owner}/{repo}/chat` | `{ question, history }`: grounded answer with `[n]` citations (`path`, `start_line`, `end_line`) |

## Project layout

```
server/app/
  main.py              app factory + CORS
  core/config.py       settings (env-driven)
  api/                 router and one route file per resource (health, repos, chat)
  schemas/             pydantic request/response models
  services/
    github.py          GitHub API: metadata + zipball download
    analysis/          tree, languages, frameworks/dependencies, classification, important files, import graph
    llm/               Gemini API client (Gemma 4), prompts, overview
    rag/               chunking, paced indexing, retrieval, chat
    store.py           in-memory repo store

skills/gittoknow/      agent skill (SKILL.md, scripts/, references/)

client/src/
  api/                 fetch client + one module per server resource
  components/          ui/ (shadcn), layout/, Markdown
  features/            repo-analysis (workspace, overview), structure (file tree), architecture (graph), chat, code-viewer
  hooks/               shared React hooks
  pages/               top-level screens
```

## Docs

| File | What's in it |
| --- | --- |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Workstreams, API contract, status |
| [docs/HACKATHON_RULES.md](docs/HACKATHON_RULES.md) | Rules, schedule, AI rules and judging criteria from the rulebook |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Submission steps, README checklist, AI tools and models log |
| [docs/DEV_GUIDELINES.md](docs/DEV_GUIDELINES.md) | Tech we use and don't use (JavaScript only, Tailwind only...), folder conventions |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branch model (`feat/*` to `staging` to `main`), PR and review workflow |

## Team

- Nishant Golhani
- Advait Saxena
- Neelesh Singh
- Abhiram Kasyap

## License

[MIT](LICENSE)
