---
name: staging-session
description: >-
  Bootstrap a staging dev session when opening a terminal — sync origin/staging,
  create feat/* or continue an existing branch, optional git worktree for parallel
  Claude terminals. Use when the user says /go, qgo, "start staging", "new feature
  branch", "continue feature", or opens a terminal to build product work.
---

# Staging Session (`/go`)

Product work: **`staging`** branch target, **staging Supabase**, PRs → `staging`.

## Quick invoke

| User says | Run |
|-----------|-----|
| `/go` or `qgo` | `bash scripts/staging-session.sh status` + `list` → ask new vs continue |
| `/go new <slug>` | `bash scripts/staging-session.sh new <slug>` |
| `/go continue <name>` | `bash scripts/staging-session.sh continue <name>` |
| `/go worktree <slug>` | `bash scripts/staging-session.sh worktree <slug>` |

Full command spec: `.claude/commands/go.md`

## After bootstrap

1. Offer `/devup-staging` if nothing on :3000
2. Remind: commit often, `/push staging` for PR
3. On pause: `/context-save`

## Non-negotiables

- `pnpm dev:staging:op` — not `pnpm dev:op`
- One terminal per `feat/*` branch (use `worktree` for parallel)
- No direct commits to `staging`
