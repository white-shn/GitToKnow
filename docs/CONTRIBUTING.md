# Contributing Workflow

How we get changes from your laptop into `main` without breaking each other's work. Stack and coding rules are in [DEV_GUIDELINES.md](DEV_GUIDELINES.md).

## Golden rules

1. **Never push straight to `main`.** Work on a branch and open a pull request.
2. **Commit early and often** with clear messages. Organizers read the commit history, and each member's work should be visible in it.
3. **Pull before you start**, and again before you open a PR.
4. **Keep PRs small** (one feature or fix). Small PRs get reviewed and merged in minutes.
5. **Don't break `main`.** It must always run, because it's what we demo.
6. **Everything is pushed before 5:00 PM.** After the deadline only a few-line fix to a demo-breaking bug is allowed.

## Step by step

### 1. Get set up (once)

```bash
git clone https://github.com/white-shn/GitToKnow
cd GitToKnow
```

Then follow the quick start in the root [README](../README.md) for the server and the client.

### 2. Start a task

```bash
git checkout main
git pull
git checkout -b feat/short-name
```

Branch names: `feat/<name>` for features, `fix/<name>` for bugs, `docs/<name>` for docs.

Before you start, tell the team what you're picking up so two people don't build the same thing.

### 3. Build and commit

```bash
git add <files>
git commit -m "Add repo file tree endpoint"
```

- Write messages in the imperative: "Add...", "Fix...", "Update...".
- One logical change per commit. Avoid "stuff" or "wip" messages.
- If you used an AI tool for the change, log it in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

### 4. Sync with `main`

```bash
git fetch origin
git merge origin/main      # or: git rebase origin/main
```

Fix any conflicts, then re-run the checks.

### 5. Check before opening the PR

- [ ] `cd client && npm run lint && npm run build` pass
- [ ] The server starts (`uvicorn app.main:app --reload`) and the client talks to it
- [ ] No secrets, `.env` files, `node_modules`, or unrelated changes in the diff
- [ ] New dependencies are in the README libraries list
- [ ] New env variables are in the matching `.env.example`

### 6. Open a pull request

```bash
git push -u origin feat/short-name
```

Open the PR on GitHub into `main`, with:

- **What** changed and **why** (2-3 lines)
- A screenshot for UI changes
- How to test it

### 7. Review and merge

- Ask **one teammate** to review. Review quickly; don't leave PRs waiting.
- Reviewer checks: it runs, follows [DEV_GUIDELINES.md](DEV_GUIDELINES.md) (JavaScript only, Tailwind only, no banned libraries), no secrets.
- The author merges after approval. Use **Squash and merge** or **Merge commit**; avoid force-pushing to shared branches.
- Delete the branch after merging, then `git checkout main && git pull`.

## Avoiding merge conflicts

- Work in your own `features/<name>/` folder (client) or your own route + service files (server).
- Files everyone touches (`App.jsx`, `Dashboard.jsx`, `api/router.py`, `package.json`, `requirements.txt`, the README): keep edits small, merge `main` often, and say so in the chat when you're about to change one.
- Don't reformat files you didn't change.
- Only one person installs a given new dependency; others pull it from `main`.

## If something goes wrong

- **Merge conflict:** keep both sides' intent, run the app, then commit. Ask the other author if unsure.
- **Committed a secret:** tell the team immediately and **rotate the key**. Deleting it in a later commit doesn't remove it from history.
- **`main` is broken:** say so in the chat, then fix forward with a small PR or revert the offending merge.
- **Stuck for more than 15 minutes:** ask the team. There isn't time to be blocked.

## Final hour (4:00 - 5:00 PM)

- **4:00 PM:** feature freeze. Only bug fixes and demo prep from here.
- **4:30 PM:** `main` is final. README is complete ([checklist](SUBMISSION_CHECKLIST.md)). One person submits on OrganizerHQ.
- **5:00 PM:** submissions close. Do not push anything new.
