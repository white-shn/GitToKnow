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
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branch model (`feat/*` to `staging` to `main`), PR and review workflow, final-hour plan |

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

## Deploy to Render

Deploy this project to Render in one click:

[![Deploy to Render](https://render.com/images/deploy-button.svg)](https://render.com/new)

**Steps:**

1. Click the "Deploy to Render" button above or go to [dashboard.render.com](https://dashboard.render.com) → New Web Service
2. Select your GitHub repository (`white-shn/GitToKnow`)
3. Configure:
   - **Root directory**: `/`
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python
   - **Plan**: Free
4. Set environment variables in the Render dashboard:
   - `GITHUB_TOKEN`: (optional) GitHub API token
   - `GEMINI_API_KEY`: Gemini API key for Gemma 4
5. **Deploy!** Your service will be available at `https://your-service-name.onrender.com`

The server will auto-start on deployment and handle GitHub API requests and AI-powered repository analysis.

**Note**: The client (React frontend) would need its own Render service if you want a complete deployment. See the client directory for additional deployment options.

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
