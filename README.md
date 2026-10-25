# GitToKnow

AI-powered platform that analyses GitHub repositories and helps developers understand unfamiliar codebases.

**Stack:** React + Vite (JavaScript) / Tailwind CSS v4 / shadcn/ui / GSAP - FastAPI (Python)

> Built for Hacktoberfest x MOSS Hack Day Udupi. **Read [docs/](docs/) before contributing.**

## Docs

| File | What's in it |
| --- | --- |
| [docs/ROADMAP.md](docs/ROADMAP.md) | **Start here:** what's left to build, who owns what, API contract, timeline |
| [docs/HACKATHON_RULES.md](docs/HACKATHON_RULES.md) | Rules, schedule, AI rules and judging criteria from the rulebook |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Submission steps, README checklist, AI tools and models log |
| [docs/DEV_GUIDELINES.md](docs/DEV_GUIDELINES.md) | Tech we use and don't use (JavaScript only, Tailwind only...), folder conventions |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branch, commit, PR and review workflow, plus the final-hour plan |

## Quick start

Run both in separate terminals.

**Server** (http://localhost:8000, docs at `/docs`)

```bash
cd server
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional, defaults work
uvicorn app.main:app --reload
```

**Client** (http://localhost:5173)

```bash
cd client
npm install
cp .env.example .env          # optional, defaults work
npm run dev
```

The header badge shows **API online** when the client can reach the server.

## Project layout

```
server/app/
  main.py              app factory + CORS
  core/config.py       settings (env-driven)
  api/router.py        mounts all routes under /api
  api/routes/          one file per resource (health, repos, ...)
  schemas/             pydantic request/response models
  services/
    github.py          GitHub access (repo URL parsing today; fetching next)
    rag/               chunking, embeddings, vector store, retrieval
    llm/               Gemma 4 client + prompts

client/src/
  api/                 fetch client + one module per server resource
  components/ui/       shadcn/ui components (JavaScript)
  components/layout/   app shell pieces
  features/            one folder per feature (repo-analysis, ...)
  hooks/               shared React hooks
  pages/               top-level screens
  lib/utils.js         `cn()` class helper
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| POST | `/api/repos/analyze` | `{ "repo_url": "https://github.com/owner/repo" }` - validates the URL (analysis pipeline is a stub) |

## Team

_Add team members here._

## License

[MIT](LICENSE)

## Models, libraries and AI tools

_Fill in per [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) before submitting._
