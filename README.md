# GitToKnow

AI-powered platform that analyses GitHub repositories and helps developers understand unfamiliar codebases.

**Stack:** React + Vite (JavaScript) / Tailwind CSS v4 / shadcn/ui / GSAP - FastAPI (Python)

## Quick start

Run both in separate terminals.

**Backend** (http://localhost:8000, docs at `/docs`)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional, defaults work
uvicorn app.main:app --reload
```

**Frontend** (http://localhost:5173)

```bash
cd frontend
npm install
cp .env.example .env          # optional, defaults work
npm run dev
```

The header badge shows **API online** when the frontend can reach the backend.

## Project layout

```
backend/app/
  main.py              app factory + CORS
  core/config.py       settings (env-driven)
  api/router.py        mounts all routes under /api
  api/routes/          one file per resource (health, repos, ...)
  schemas/             pydantic request/response models
  services/
    github.py          GitHub access (repo URL parsing today; fetching next)
    rag/               chunking, embeddings, vector store, retrieval
    llm/               Gemma 4 client + prompts

frontend/src/
  api/                 fetch client + one module per backend resource
  components/ui/       shadcn/ui components (JavaScript)
  components/layout/   app shell pieces
  features/            one folder per feature (repo-analysis, ...)
  hooks/               shared React hooks
  pages/               top-level screens
  lib/utils.js         `cn()` class helper
```

## Working as a team

- Add backend features as a route in `api/routes/` + logic in `services/`, so people rarely touch the same file.
- Add frontend features in their own folder under `features/`; add the API call in `api/`.
- Add shadcn components with `npx shadcn@latest add <component>` from `frontend/` (configured for JavaScript). If the CLI adds a `cn` npm package or imports `from "cn"`, change the import to `@/lib/utils`.
- Never commit `.env` files; update `.env.example` when you add a variable.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| POST | `/api/repos/analyze` | `{ "repo_url": "https://github.com/owner/repo" }` - validates the URL (analysis pipeline is a stub) |
