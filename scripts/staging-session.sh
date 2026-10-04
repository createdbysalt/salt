#!/usr/bin/env bash
# Staging dev session bootstrap — sync staging, start or resume a feature branch.
# Used by /go (Claude) and qgo (Cursor).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SESSION_FILE="$ROOT/.scratch/staging-session.env"
STAGING_REF="origin/staging"
WORKTREES_PARENT="$(dirname "$ROOT")"

usage() {
  cat <<'EOF'
Usage: scripts/staging-session.sh <command> [args]

Commands:
  status                     Show repo + session state (default)
  list                       List local and remote feat/* branches
  new <feature-slug>         Create feat/<slug> from origin/staging and push
  continue <branch-or-slug>  Checkout existing feature branch and pull
  worktree <feature-slug>    New feat/<slug> in a sibling git worktree (parallel terminals)

Examples:
  scripts/staging-session.sh status
  scripts/staging-session.sh new scalable-enrichment
  scripts/staging-session.sh continue feat/voice-propagation
  scripts/staging-session.sh worktree connector-dependability
EOF
}

slugify() {
  local raw="$1"
  raw="$(echo "$raw" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
  if [[ -z "$raw" ]]; then
    echo "Error: feature name must contain at least one letter or number." >&2
    exit 1
  fi
  echo "$raw"
}

branch_name() {
  local slug
  slug="$(slugify "$1")"
  if [[ "$slug" == feat/* ]]; then
    echo "$slug"
  else
    echo "feat/$slug"
  fi
}

fetch_staging() {
  git fetch origin staging --quiet
}

ensure_staging_ref() {
  fetch_staging
  if ! git rev-parse --verify "$STAGING_REF" >/dev/null 2>&1; then
    echo "Error: $STAGING_REF not found. Check network and remote." >&2
    exit 1
  fi
}

warn_dirty() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "WARN: Uncommitted changes on current branch ($(git branch --show-current))."
    echo "      Commit, stash, or discard before switching if you need a clean tree."
  fi
  if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    echo "WARN: Untracked files present."
  fi
}

write_session() {
  local branch="$1"
  local worktree="${2:-}"
  mkdir -p "$(dirname "$SESSION_FILE")"
  cat >"$SESSION_FILE" <<EOF
# Written by scripts/staging-session.sh — local only (.scratch/ is gitignored)
BRANCH=$branch
WORKTREE=$worktree
STAGING_TREE=$(git rev-parse "$STAGING_REF^{tree}" 2>/dev/null || echo unknown)
UPDATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DEV_COMMAND=pnpm dev:staging:op
SUPABASE_PROJECT=salt-staging (nbapomfgcsrsqdvenqmf)
PR_BASE=staging
EOF
}

print_header() {
  echo "────────────────────────────────────────"
  echo "Salt staging session"
  echo "Repo: $ROOT"
  echo "────────────────────────────────────────"
}

cmd_status() {
  print_header
  fetch_staging
  local current
  current="$(git branch --show-current 2>/dev/null || echo "(detached)")"
  echo "Current branch: $current"
  echo "origin/staging:   $(git log -1 --oneline "$STAGING_REF" 2>/dev/null || echo missing)"
  if [[ -f "$SESSION_FILE" ]]; then
    echo ""
    echo "Last /go session (.scratch/staging-session.env):"
    sed 's/^/  /' "$SESSION_FILE"
  fi
  echo ""
  warn_dirty
  echo ""
  if [[ "$current" != "staging" && "$current" != "(detached)" ]]; then
    local upstream
    upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo none)"
    echo "Upstream: $upstream"
    echo "Unpushed commits:"
    git log --oneline '@{u}..HEAD' 2>/dev/null | sed 's/^/  /' || echo "  (none or no upstream)"
  fi
  echo ""
  echo "Dev: pnpm dev:staging:op  (staging Supabase via .env.staging.1password)"
  echo "Push: /push staging"
}

cmd_list() {
  print_header
  fetch_staging
  echo "Local feat/* branches:"
  git branch -vv | rg 'feat/' || echo "  (none)"
  echo ""
  echo "Remote feat/* branches:"
  git branch -r | rg 'origin/feat/' | sed 's/^  //' || echo "  (none)"
  echo ""
  echo "Open PRs → staging:"
  if command -v gh >/dev/null 2>&1; then
    gh pr list --base staging --state open --limit 15 2>/dev/null || echo "  (gh unavailable)"
  else
    echo "  (install gh CLI to list PRs)"
  fi
}

cmd_new() {
  local branch
  branch="$(branch_name "$1")"
  ensure_staging_ref
  warn_dirty

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "Error: branch $branch already exists locally. Use: continue $branch" >&2
    exit 1
  fi

  git checkout -b "$branch" "$STAGING_REF"
  git push -u origin "$branch"
  write_session "$branch" ""
  print_header
  echo "Created and checked out: $branch"
  echo "Tracking: origin/$branch (pushed)"
  echo "Base tree matches origin/staging."
  echo ""
  echo "Next:"
  echo "  1. pnpm dev:staging:op   (or /devup-staging)"
  echo "  2. Build → /push staging when ready for PR"
}

cmd_continue() {
  local branch
  branch="$(branch_name "$1")"
  fetch_staging
  warn_dirty

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
    if git rev-parse --verify "@{u}" >/dev/null 2>&1; then
      git pull --ff-only
    fi
  elif git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    git checkout -b "$branch" "origin/$branch"
  else
    echo "Error: branch $branch not found locally or on origin." >&2
    echo "Run: scripts/staging-session.sh list" >&2
    exit 1
  fi

  write_session "$branch" ""
  print_header
  echo "Continued on: $branch"
  echo "origin/staging: $(git log -1 --oneline "$STAGING_REF")"
  echo ""
  git status -sb
  echo ""
  echo "Next: pnpm dev:staging:op  (or /devup-staging)"
}

cmd_worktree() {
  local branch path
  branch="$(branch_name "$1")"
  local slug="${branch#feat/}"
  path="$WORKTREES_PARENT/salt-$slug"
  ensure_staging_ref

  if [[ -d "$path" ]]; then
    echo "WORKTREE=$path"
    echo "BRANCH=$branch"
    echo "Exists — cd $path"
    exit 0
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git worktree add "$path" "$branch"
  else
    git worktree add -b "$branch" "$path" "$STAGING_REF"
    git push -u origin "$branch"
  fi

  write_session "$branch" "$path"
  print_header
  echo "Worktree ready: $path"
  echo "Branch: $branch"
  echo ""
  echo "Open a NEW terminal:"
  echo "  cd $path"
  echo "  pnpm dev:staging:op"
  echo ""
  echo "WORKTREE=$path"
}

main() {
  local command="${1:-status}"
  shift || true

  case "$command" in
    status | "")
      cmd_status
      ;;
    list | ls)
      cmd_list
      ;;
    new)
      [[ $# -ge 1 ]] || { usage; exit 1; }
      cmd_new "$1"
      ;;
    continue | resume | cont)
      [[ $# -ge 1 ]] || { usage; exit 1; }
      cmd_continue "$1"
      ;;
    worktree | wt)
      [[ $# -ge 1 ]] || { usage; exit 1; }
      cmd_worktree "$1"
      ;;
    -h | --help | help)
      usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
