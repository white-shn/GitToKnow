# Contributing Workflow

How we get changes from your laptop into the product without breaking each other's work. Stack and coding rules are in [DEV_GUIDELINES.md](DEV_GUIDELINES.md).

## Branches

```
feat/your-task  --PR-->  staging  --promoted by the maintainer-->  main
```

| Branch | Purpose | Who can merge into it |
| --- | --- | --- |
| `main` | Stable. This is what we demo and submit. | **Maintainer only**, by promoting `staging` |
| `staging` | Integration branch. Everything lands here first and gets tested together. | **Maintainer only**, by merging reviewed PRs |
| `feat/<name>`, `fix/<name>`, `docs/<name>` | Your work. Always branched from `staging`. | You (push freely) |

The **maintainer** is AdvaitZeroSix. They review and merge every PR; nobody else merges, including their own PRs.

## Golden rules

1. **Never push to `main` or `staging`.** Work on a branch and open a PR **into `staging`**.
2. **Branch from `staging`**, not `main`.
3. **Don't merge your own PR.** Wait for the maintainer's review and merge.
4. **Commit early and often** with clear messages. Organizers read the commit history, and each member's work should be visible in it.
5. **Keep PRs small** (one feature or fix) so they can be reviewed in minutes.
6. **Pull `staging` before you start**, and again before you open a PR.
7. **Everything is pushed before 5:00 PM.** After the deadline only a few-line fix to a demo-breaking bug is allowed.

## Step by step

### 1. Get set up (once)

```bash
git clone https://github.com/white-shn/GitToKnow
cd GitToKnow
git checkout staging
```

Then follow the quick start in the root [README](../README.md) for the server and the client.

### 2. Start a task

```bash
git checkout staging
git pull
git checkout -b feat/short-name
```

Branch names: `feat/<name>` for features, `fix/<name>` for bugs, `docs/<name>` for docs. Tell the team what you're picking up so two people don't build the same thing.

### 3. Build and commit

```bash
git add <files>
git commit -m "Add repo file tree endpoint"
```

- Write messages in the imperative: "Add...", "Fix...", "Update...".
- One logical change per commit. Avoid "stuff" or "wip" messages.
- If you used an AI tool for the change, log it in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

### 4. Sync with `staging`

```bash
git fetch origin
git merge origin/staging      # or: git rebase origin/staging
```

Fix any conflicts, then re-run the checks.

### 5. Check before opening the PR

- [ ] `cd client && npm run lint && npm run build` pass
- [ ] The server starts (`uvicorn app.main:app --reload`) and the client talks to it
- [ ] No secrets, `.env` files, `node_modules`, or unrelated changes in the diff
- [ ] New dependencies are in the README libraries list
- [ ] New env variables are in the matching `.env.example`

### 6. Open a pull request into `staging`

```bash
git push -u origin feat/short-name
```

On GitHub open the PR with **base: `staging`** (not `main`), including:

- **What** changed and **why** (2-3 lines)
- A screenshot for UI changes
- How to test it

### 7. Review and merge (maintainer)

- The maintainer reviews, asks for changes if needed, and merges into `staging` (**Squash and merge**).
- Review checks: it runs, follows [DEV_GUIDELINES.md](DEV_GUIDELINES.md) (JavaScript only, Tailwind only, no banned libraries), no secrets, small and focused.
- After your PR is merged: delete your branch, then `git checkout staging && git pull`.

### 8. Promote `staging` to `main` (maintainer)

Done when `staging` is in a good state, at least at **~3:30 PM** and for the final release at **4:30 PM**:

1. Pull `staging`, run the server and client, and click through the demo flow (analyse a repo, graph, chat).
2. `cd client && npm run lint && npm run build` pass; the server starts clean.
3. Open a PR **`staging` into `main`** and merge it with **Create a merge commit** (not squash, so the two branches stay in sync).

## Avoiding merge conflicts

- Work in your own `features/<name>/` folder (client) or your own route + service files (server).
- Files everyone touches (`App.jsx`, `Dashboard.jsx`, `api/router.py`, `package.json`, `requirements.txt`, the README): keep edits small, merge `staging` often, and say so in the chat when you're about to change one.
- Don't reformat files you didn't change.
- Only one person installs a given new dependency; others pull it from `staging`.

## If something goes wrong

- **Merge conflict:** keep both sides' intent, run the app, then commit. Ask the other author if unsure.
- **Committed a secret:** tell the team immediately and **rotate the key**. Deleting it in a later commit doesn't remove it from history.
- **`staging` is broken:** say so in the chat; the maintainer reverts the offending merge or merges a small fix PR. `main` stays untouched until `staging` is healthy again.
- **Opened a PR against `main` by mistake:** change the base branch to `staging` on the PR page (the **Edit** button next to the title). No need to reopen it.
- **Stuck for more than 15 minutes:** ask the team. There isn't time to be blocked.

## Final hour (4:00 - 5:00 PM)

- **4:00 PM:** feature freeze. Only bug fixes and demo prep from here.
- **4:30 PM:** the maintainer promotes the final `staging` to `main`. README is complete ([checklist](SUBMISSION_CHECKLIST.md)). One person submits on OrganizerHQ using the `main` repo link.
- **5:00 PM:** submissions close. Do not push anything new.
