#!/usr/bin/env bash
# Replit <-> GitHub sync helper for keletonik/flaro.
# Run from the repo root. Idempotent - safe to re-run any time.
#
# Usage:
#   ./scripts/replit-sync.sh                   # sync the default feature branch
#   ./scripts/replit-sync.sh main              # switch to main
#   ./scripts/replit-sync.sh some-other-branch # switch to any other branch
#
# Optional Replit Secrets (Tools > Secrets):
#   GITHUB_TOKEN - fine-grained PAT with contents read/write on keletonik/flaro
#   GIT_EMAIL    - commit author email
#   GIT_NAME     - commit author name

set -euo pipefail

REPO_URL="https://github.com/keletonik/flaro.git"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
FEATURE_BRANCH="${FEATURE_BRANCH:-claude/fault-finding-training-58ZjD}"

say()  { printf "\n\033[1;34m==>\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33m!!\033[0m  %s\n" "$*"; }

# 1. Ensure we're in a git repo
if [ ! -d .git ]; then
  say "No .git found. Initialising and wiring origin."
  git init
  git remote add origin "$REPO_URL"
else
  say "Git repo detected."
fi

# 2. Make sure origin points at the right URL (with optional token auth)
CURRENT_ORIGIN="$(git remote get-url origin 2>/dev/null || echo "")"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  EXPECTED_ORIGIN="https://${GITHUB_TOKEN}@github.com/keletonik/flaro.git"
else
  EXPECTED_ORIGIN="$REPO_URL"
fi
if [ "$CURRENT_ORIGIN" != "$EXPECTED_ORIGIN" ]; then
  say "Setting origin URL."
  git remote set-url origin "$EXPECTED_ORIGIN" 2>/dev/null \
    || git remote add origin "$EXPECTED_ORIGIN"
fi

# 3. Configure identity if missing (Replit sometimes leaves this blank)
if [ -z "$(git config user.email || true)" ]; then
  git config user.email "${GIT_EMAIL:-replit@users.noreply.github.com}"
fi
if [ -z "$(git config user.name || true)" ]; then
  git config user.name "${GIT_NAME:-Replit}"
fi

# 4. Safer pull defaults
git config pull.rebase true
git config rebase.autoStash true

# 5. Stash any unsaved work so pull can't fail
if [ -n "$(git status --porcelain)" ]; then
  warn "Unsaved local changes - stashing before sync."
  git stash push -u -m "replit-sync autostash $(date -u +%FT%TZ)"
  STASHED=1
else
  STASHED=0
fi

# 6. Fetch from origin
say "Fetching from origin."
git fetch origin --prune

# 7. Resolve target branch
TARGET_BRANCH="${1:-$FEATURE_BRANCH}"
if git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
  say "Checking out $TARGET_BRANCH (tracking origin/$TARGET_BRANCH)."
  git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
elif git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
  say "Checking out local $TARGET_BRANCH."
  git checkout "$TARGET_BRANCH"
else
  warn "Branch $TARGET_BRANCH not found on origin. Falling back to $DEFAULT_BRANCH."
  git checkout -B "$DEFAULT_BRANCH" "origin/$DEFAULT_BRANCH"
  TARGET_BRANCH="$DEFAULT_BRANCH"
fi

# 8. Rebase on origin to pick up remote changes
say "Rebasing $TARGET_BRANCH on origin/$TARGET_BRANCH."
if ! git pull --rebase origin "$TARGET_BRANCH"; then
  warn "Rebase hit conflicts. Resolve them, then run: git rebase --continue"
  exit 1
fi

# 9. Restore stashed work
if [ "$STASHED" -eq 1 ]; then
  say "Restoring stashed local changes."
  git stash pop || warn "Stash pop hit conflicts - resolve manually."
fi

# 10. Install deps if node_modules is missing
if [ -f pnpm-workspace.yaml ] && [ ! -d node_modules ]; then
  say "Installing pnpm workspace deps."
  if ! command -v pnpm >/dev/null 2>&1; then
    warn "pnpm not installed. Install with: npm i -g pnpm"
  else
    pnpm install
  fi
fi

# 11. Final status
say "Done. Current state:"
git status -sb
printf "\nTip: use './scripts/replit-sync.sh <branch-name>' to switch branches.\n"
printf "Tip: set GITHUB_TOKEN in Replit Secrets to avoid auth prompts on push.\n"
