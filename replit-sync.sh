#!/usr/bin/env bash
# Replit <-> GitHub sync helper for keletonik/flaro.
# Run from the repo root. Idempotent - safe to re-run any time.

set -euo pipefail

REPO_URL="https://github.com/keletonik/flaro.git"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
FEATURE_BRANCH="${FEATURE_BRANCH:-claude/fault-finding-training-58ZjD}"

say() { printf "\n\033[1;34m==>\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33m!!\033[0m %s\n" "$*"; }

# 1. Make sure we're in a git repo
if [ ! -d .git ]; then
  say "No .git found. Initialising and wiring to origin."
  git init
  git remote add origin "$REPO_URL"
else
  say "Git repo detected."
fi

# 2. Ensure origin points at the right remote
CURRENT_ORIGIN="$(git remote get-url origin 2>/dev/null || echo "")"
if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    say "Setting origin to use GITHUB_TOKEN auth."
    git remote set-url origin "https://${GITHUB_TOKEN}@github.com/keletonik/flaro.git"
  else
    say "Setting origin to $REPO_URL"
    git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"
  fi
fi

# 3. Configure git identity if missing (Replit sometimes leaves this blank)
if [ -z "$(git config user.email || true)" ]; then
  git config user.email "${GIT_EMAIL:-replit@users.noreply.github.com}"
fi
if [ -z "$(git config user.name || true)" ]; then
  git config user.name "${GIT_NAME:-Replit}"
fi

# 4. Turn on safe-by-default pull behaviour
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

# 6. Fetch everything from origin
say "Fetching from origin."
git fetch origin --prune

# 7. Check out the branch we want to work on
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

# 8. Rebase on top of origin to pick up any remote changes
say "Rebasing $TARGET_BRANCH on origin/$TARGET_BRANCH."
git pull --rebase origin "$TARGET_BRANCH" || {
  warn "Rebase hit conflicts. Resolve manually, then run: git rebase --continue"
  exit 1
}

# 9. Restore stashed work
if [ "$STASHED" -eq 1 ]; then
  say "Restoring stashed local changes."
  git stash pop || warn "Stash pop hit conflicts - resolve manually."
fi

# 10. Install deps if node_modules is missing (common after a fresh Repl clone)
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
printf "\nTip: use './replit-sync.sh <branch-name>' to switch to a different branch.\n"
printf "Tip: set GITHUB_TOKEN in Replit Secrets to avoid auth prompts on push.\n"
