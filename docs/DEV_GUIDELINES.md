# Developer Guidelines

What we use, what we don't, and where code goes, so five people can work in one repo without stepping on each other. For how to get changes merged, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Tech stack

### Use this

| Area | Tech | Notes |
| --- | --- | --- |
| Client language | **JavaScript** (`.js` / `.jsx`) | ES modules, function components, hooks |
| Client framework | **React 19** + **Vite 8** | Dev server on `:5173` |
| Styling | **Tailwind CSS v4** | Utility classes only. Theme tokens live in `client/src/index.css` |
| UI components | **shadcn/ui** (new-york style, JS) | Added to `client/src/components/ui/` |
| Icons | **lucide-react** | Note: brand icons (e.g. GitHub) don't exist in it, use a generic icon |
| Animation | **GSAP** | Basic only: entrances, fades, staggers |
| Class merging | `cn()` from `@/lib/utils` | Wraps `clsx` + `tailwind-merge` |
| Linting | **oxlint** (`npm run lint` in `client/`) | Comes with the Vite template |
| Server language | **Python 3.11+** | Type hints everywhere |
| Server framework | **FastAPI** + **Uvicorn** | Dev server on `:8000`, docs at `/docs` |
| Validation / config | **Pydantic**, **pydantic-settings** | Schemas in `schemas/`, settings in `core/config.py` |
| LLM | **Gemma 4 via the Gemini API** | Required for the Best Use of Gemma 4 challenge |
| AI in the project | **Open-source / open-weight only** | Required for Best Open-Source AI Project |

### Do NOT use this

| Don't use | Why | Use instead |
| --- | --- | --- |
| **TypeScript** (`.ts`, `.tsx`, `tsconfig`, `@types/*`) | Team decision: JavaScript only | `.js` / `.jsx` |
| **Other CSS approaches**: CSS modules, Sass, styled-components, emotion, plain per-component `.css` files | Team decision: Tailwind only | Tailwind classes |
| **Other UI/CSS frameworks**: Bootstrap, MUI, Chakra, Ant Design, DaisyUI | Clashes with shadcn + Tailwind | shadcn/ui |
| **Inline `style={{}}`** | Bypasses the theme | Tailwind classes (inline only for truly dynamic values) |
| **Hard-coded colors** (`#fff`, `bg-gray-900`, `text-green-500`) | Breaks the consistent dark theme | Theme tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` |
| **Light mode / theme toggle** | Dark only, by design | n/a |
| **Other icon libraries** (react-icons, FontAwesome) | One icon set keeps the UI consistent | `lucide-react` |
| **Other animation libraries** (framer-motion, anime.js) | GSAP is our one animation lib | GSAP |
| **axios or other HTTP clients** | One tiny fetch wrapper already exists | `client/src/api/client.js` |
| **ESLint / Prettier configs** | oxlint is the linter | `npm run lint` |
| **Closed / proprietary models inside the product** (OpenAI, Claude API, etc. as the analysis engine) | Must be open-source/open-weight (Gemma 4 counts) | Gemma 4 via the Gemini API |
| **Code, designs or assets made before 10:00 AM** | Hackathon rule | Build it today |
| **Committed secrets** (`.env`, API keys, tokens) | Repo is public | `.env` (git-ignored) + `.env.example` |
| **Committing `node_modules`, `.venv`, `dist`** | Already git-ignored | n/a |

### Adding a new dependency

Anything not in the table above needs a heads-up in the team chat first. If it's approved:

1. Install it (`npm install <pkg>` in `client/`, or add to `server/requirements.txt`).
2. Add it to the **libraries list in the root README** (the rules require every library, API and dataset to be listed).
3. If it's an AI model or an AI tool, also update the logs in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

Not installed yet but likely to come up: a router (`react-router`), a data-fetching library, markdown rendering, syntax highlighting, GitHub client libraries, a vector store, embeddings. Agree on one choice per concern before anyone adds it.

## Coding conventions

### Client (`client/src`)

| Folder | Put here |
| --- | --- |
| `api/` | Calls to the server, one file per resource (`repos.js`). Everything goes through `api/client.js`. |
| `components/ui/` | shadcn components. Avoid hand-editing. |
| `components/layout/` | App shell pieces (header, sidebar). |
| `features/<name>/` | All code for one feature (components, local hooks). One folder per feature avoids merge conflicts. |
| `hooks/` | Shared React hooks (`useThing.js`). |
| `pages/` | Top-level screens. |
| `lib/` | Pure helpers (`utils.js` has `cn()`). |

- Import with the `@/` alias: `import { Button } from '@/components/ui/button'`. Avoid long `../../..` paths.
- Components: function components, `PascalCase.jsx`, one main component per file. Hooks start with `use`.
- Add shadcn components from `client/`: `npx shadcn@latest add <component>`. If the CLI generates `from "cn"`, change it to `@/lib/utils` and run `npm uninstall cn`.
- The server URL comes from `VITE_API_URL` (see `client/.env.example`). Never hard-code it.
- **GSAP:** animate inside `useEffect` with `gsap.context(..., ref)` and return `ctx.revert()`. Target elements with `data-anim="..."` attributes, not class names. See `pages/Dashboard.jsx`.
- Show loading and error states for every request (see `RepoAnalyzeForm.jsx`).

### Server (`server/app`)

| Folder | Put here |
| --- | --- |
| `api/routes/` | One file per resource. Routes stay thin: validate, call a service, return. |
| `schemas/` | Pydantic request/response models. |
| `services/github.py` | GitHub fetching. |
| `services/rag/` | Chunking, embeddings, vector store, retrieval. |
| `services/llm/` | Gemma 4 / Gemini API client and prompts. |
| `core/config.py` | Settings read from env. |

- Register new routers in `api/router.py`; keep all endpoints under `/api`.
- Raise `HTTPException` with a clear string `detail`; the client shows it to the user.
- Read config through `get_settings()`, never `os.environ` directly. Add new variables to `Settings` and `.env.example`.
- Use type hints and Pydantic models for request and response bodies.

## Running locally

See the root [README](../README.md). Short version:

```bash
# server (http://localhost:8000)
cd server && .venv\Scripts\activate && uvicorn app.main:app --reload

# client (http://localhost:5173)
cd client && npm run dev
```

Before opening a PR, run `npm run lint` and `npm run build` in `client/`, and make sure the server starts.

## Credit your AI tools

If an AI assistant wrote or helped with any code, add a line to the AI tools log in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md). Forgetting this can disqualify the team. Everyone must be able to explain their own code to the judges, including AI-written parts.
