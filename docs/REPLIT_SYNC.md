# Replit Sync Instructions — pull from GitHub without losing data

**Purpose:** pull the latest `main` from GitHub into the Replit
workspace without overwriting anything important. Safe to re-run
on every sync.

**Who this is for:** Casper (the operator) — paste the short version
below into the Replit AI chat. Replit will read this file if pointed
at the URL too.

---

## Why this matters (read once)

The Replit workspace has four independent layers that must all be
treated differently during a sync. Most sync failures in the past
have come from treating one layer with the rules that apply to
another.

| Layer | What lives there | Git sync behaviour |
|---|---|---|
| **Postgres database** | All `wip_records`, `todos`, `reminders`, `fip_*`, `pa_*`, `attachments` rows | **Git never touches this.** A `git pull` cannot delete a database row. Data is safe by default. |
| **Repo files (tracked)** | TypeScript source, docs, seed CSVs, seed JSON blobs | Git syncs these. Use the merge rules below. |
| **Repo files (untracked)** | `node_modules`, `dist/`, `tsconfig.tsbuildinfo`, local scratch files | Git ignores these — they regenerate from `pnpm install` / build. **Never run `git clean -fd`**, which deletes them along with anything untracked you actually wanted. |
| **Replit Secrets + env vars** | `DATABASE_URL`, `ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_*`, `FIP_ENABLED`, `CASPER_PASSWORD` | Not in git. Set once in Replit Secrets, untouched by every sync. |

The boot sequence runs **additive** seed loaders (`seedFipKnowledgeBase`,
`seedPaSurface`, `seedApr15Batch`, `seedEstimationWorkbench`). Every
loader uses `CREATE TABLE IF NOT EXISTS` + per-row existence checks
with natural keys. **Re-runs never delete data — they patch the hot
columns (status, priority, assigned_tech) on existing rows and insert
new rows only.**

---

## Short version — paste this into Replit AI

```
Sync with GitHub main without overwriting any data. Follow this sequence
exactly:

1. Open the Shell tab.
2. Run: git status
3. If anything is listed as "modified" or "untracked":
   a. If it's code you want to keep → run: git add -A && git commit -m "replit: local changes before sync"
   b. If it's accidental edits you don't want → run: git stash
4. Run: git fetch origin main
5. Run: git pull --rebase origin main
6. If rebase reports conflicts:
   - Do NOT abort.
   - For each conflicted file, resolve by hand or pick the incoming version
     (the GitHub version is almost always the correct one for committed code)
     with: git checkout --theirs <filename>
     then: git add <filename>
   - Continue with: git rebase --continue
7. Run: pnpm install
8. Restart the workspace (click Stop, then Run, or use the Restart button).
9. Once the app is running, verify with:
   curl https://i-aide.replit.app/api/diag
   curl https://i-aide.replit.app/api/diag/apr15
   The diag response should show non-zero counts for wip_records, quotes,
   defects, task_cycle_times. The apr15 diag should show batch_id
   "apr15-batch-2026-04-15" with wip_records >= 628.

NEVER run any of these commands — they destroy data:
  git reset --hard
  git checkout -- .
  git clean -fd
  DROP TABLE
  TRUNCATE

The database is untouched by git. Every seed loader is additive.
Re-runs are safe.
```

---

## Long version — what each step does

### Step 1 — `git status`
Shows what's changed locally on Replit since the last sync. Output
has three sections:
- **Changes not staged for commit** — tracked files that have been
  edited but not added yet.
- **Untracked files** — new files Replit created that git has never
  seen.
- **Nothing to commit, working tree clean** — the happy path.

If you see "working tree clean", skip directly to Step 4.

### Step 2 — handle uncommitted changes

Replit sometimes edits files on its own (it's a generative IDE, so
the AI is authoring files). Those edits need to go somewhere before
you pull.

**Option A — keep them:**
```bash
git add -A
git commit -m "replit: local changes before sync"
```
This creates a commit on top of whatever Replit has locally. The
next `git pull --rebase` will replay your commit on top of the new
GitHub commits.

**Option B — discard them:**
```bash
git stash
```
This sets them aside. After the sync completes, `git stash pop` to
bring them back, or `git stash drop` to forget them.

### Step 3 — `git fetch origin main`
Downloads the new commits from GitHub without touching your working
tree. Safe on its own — just updates the `origin/main` pointer so
you can see what's incoming.

After this, you can preview the changes with:
```bash
git log --oneline HEAD..origin/main
```

### Step 4 — `git pull --rebase origin main`
The actual sync. `--rebase` (not the default merge) rewrites your
local commits on top of the new GitHub commits, keeping the history
linear and avoiding a merge commit.

**Why `--rebase` matters for this repo:** we've had historical
sync wars where a merge commit from Replit pulled in stale files
that overwrote newer work. Rebase replays one commit at a time,
making it obvious which commit broke something.

### Step 5 — conflict resolution

If rebase reports a conflict, git stops and tells you which files
conflicted. You have two options per file:

**Pick the incoming (GitHub) version — safest for committed code:**
```bash
git checkout --theirs path/to/file
git add path/to/file
```

**Pick your local version — use only if you know the Replit edit
is newer and correct:**
```bash
git checkout --ours path/to/file
git add path/to/file
```

Then:
```bash
git rebase --continue
```

If you get stuck:
```bash
git rebase --abort
```
returns you to the state before Step 4. Nothing is lost. Ask for
help and try again.

### Step 6 — `pnpm install`
Installs any new package-json dependencies. Safe to run on every
sync — it's a no-op if nothing changed.

### Step 7 — restart the workspace
The API server needs to restart to run the boot-time seed loaders.
The boot sequence runs:
1. `seedUsers` (casper admin upsert — never deletes)
2. `seedProductionData` (additive, idempotent)
3. `seedAdditionalData` (additive, idempotent)
4. `seedFipKnowledgeBase` (additive — CREATE TABLE IF NOT EXISTS + dedup on slug)
5. `seedEstimationWorkbench` (additive — dedup by supplier name + part code)
6. `seedPaSurface` (additive — DDL only, no seed data)
7. `seedApr15Batch` (additive — short-circuits if already loaded, else patches hot columns on existing rows and inserts missing rows)

Watch the Replit logs during restart. You should see:
```
[boot] running seedFipKnowledgeBase
FIP schema ensured (v2.0)
fip seed  (manufacturers) inserted=0 updated=0
...
[boot] running seedApr15Batch
apr15 batch load complete  (wip: inserted=364 updated=264 ...)
...
[boot] seed pipeline complete — site is ready
```

### Step 8 — verify

Three diag endpoints with no auth:

```bash
curl https://i-aide.replit.app/api/diag
curl https://i-aide.replit.app/api/diag/apr15
curl https://i-aide.replit.app/api/diag/pa
```

`/api/diag` shows row counts for every table. After a successful
sync of the April 15 batch, `wip_records >= 628` is the key number.

`/api/diag/apr15` shows the batch-specific counts:
```json
{
  "ok": true,
  "batch_id": "apr15-batch-2026-04-15",
  "counts": {
    "wip_records": 628,
    "quotes": 103,
    "defects": 228,
    "task_cycle_times": 9743,
    "email_triage_notes": 46
  }
}
```

`/api/diag/pa` shows reminder state + PA tool call history.

---

## Commands that DESTROY data — never run these

| Command | What it does | Recovery |
|---|---|---|
| `git reset --hard` | Discards every uncommitted change in the working tree | Possible via `git reflog` for ~30 days if you catch it in time |
| `git reset --hard origin/main` | Same as above, PLUS drops any local commits not on GitHub | Same |
| `git checkout -- .` | Discards every uncommitted change to tracked files | None — lost immediately |
| `git clean -fd` | Deletes every untracked file AND directory | None — lost immediately |
| `git clean -fdx` | Same as above plus files in .gitignore (node_modules, .env) | None — lost immediately |
| `DROP TABLE <anything>` | Destroys a Postgres table | Restore from Replit's database snapshot if enabled |
| `TRUNCATE <anything>` | Empties a Postgres table | Same |
| `rm -rf artifacts/api-server/src/seed-*.json` | Deletes the seed payload | `git checkout HEAD -- <file>` before commit, otherwise lost |

---

## Emergency recovery

If a sync goes wrong and the workspace won't boot:

1. **Check the logs first.** The error is almost always a TypeScript
   compile failure or a missing env var. Don't panic-delete anything.
2. **Roll back the sync:**
   ```bash
   git reflog                          # find the commit before the sync
   git reset --hard <commit-hash>      # ONLY if you have NO uncommitted work
   ```
   This is the one case where `git reset --hard` is OK — you've just
   pulled, nothing important was edited locally.
3. **Database:** untouched by any git operation. Still there.
4. **Secrets:** untouched. Still in Replit Secrets.

If the boot loader fails partway through, the app still starts —
the seed functions wrap their errors and log them rather than
throwing. Hit `/api/diag` to see what landed and what didn't.

---

## Quick reference card

```
SAFE            git status / git fetch / git log / git diff
SAFE            git pull --rebase origin main
SAFE            git stash / git stash pop
SAFE            git add / git commit / git push
SAFE            pnpm install / pnpm -w -r run build
SAFE            curl /api/diag (read-only)

CAREFUL         git checkout --theirs <file>   (during rebase only)
CAREFUL         git rebase --abort              (during rebase only)
CAREFUL         git commit --amend              (before push)

DANGER          git reset --hard anything
DANGER          git checkout -- <file>
DANGER          git clean -fd / -fdx
DANGER          DROP TABLE / TRUNCATE / DELETE FROM
DANGER          rm -rf anything in artifacts/ or lib/
```

---

**End of sync guide.** Keep this file in `docs/REPLIT_SYNC.md`;
re-point Replit at it whenever the sync rules change.
