---
allowed-tools: Bash(scripts/staging-session.sh:*), Bash(git:*), Bash(gh:*), Bash(lsof:*), Bash(curl:*), Read, AskUserQuestion
description: "Start a staging dev session — sync staging, new or continue feat/* branch, optional worktree. Run when opening a terminal."
---

# /go — Staging Session Start

**Velocity entry point.** Product work always targets **`staging`** + **staging Supabase** (`pnpm dev:staging:op`).

**Cursor:** type `/go` or trigger **`qgo`**

## Arguments

Invoked with: `$ARGUMENTS`

| Invocation | Action |
|------------|--------|
| `/go` | Status + list branches → ask new or continue |
| `/go new <slug>` | `feat/<slug>` from `origin/staging`, push, checkout |
| `/go continue <branch-or-slug>` | Checkout + pull existing feature branch |
| `/go worktree <slug>` | Sibling worktree for parallel terminals (`../salt-<slug>/`) |
| `/go list` | Feature branches + open PRs to staging |
| `/go status` | Current branch, dirty state, last session |

Slug examples: `scalable-enrichment` → `feat/scalable-enrichment`

## Workflow (interactive — no args)

1. Run:
   ```bash
   bash scripts/staging-session.sh status
   bash scripts/staging-session.sh list
   ```
2. **Ask the user** (use `AskUserQuestion` if available):
   - **New feature** — name/slug (or pick a plan file they have open)
   - **Continue** — pick from listed `feat/*` branches
   - **Parallel terminal** — offer `worktree` if they already have another feature checked out elsewhere
3. Execute the matching subcommand.
4. **Offer dev server** (don't auto-kill unless they want it):
   ```bash
   lsof -ti:3000 >/dev/null 2>&1 && echo "port 3000 busy" || echo "port 3000 free"
   ```
   If free or they confirm: run `/devup-staging` (or `pnpm dev:staging:restart:op`).
5. End with a **session card**:

```markdown
## Session ready
- **Branch:** feat/…
- **Base:** origin/staging @ <short sha>
- **Dev:** pnpm dev:staging:op (staging Supabase)
- **Save work:** commit often → `/push staging`
- **Pause:** `/context-save` before closing terminal
```

## Rules

| Rule | Why |
|------|-----|
| Never commit on `staging` directly | Branch protection + parallel terminals |
| One terminal = one `feat/*` branch (or worktree) | Avoid lost work / merge collisions |
| Use `pnpm dev:staging:op` — not `pnpm dev:op` | Staging Supabase only |
| Migrations: one branch owns `db push` at a time | Staging project `nbapomfgcsrsqdvenqmf` |
| Port 3000 only | Project standard |

## Multi-terminal pattern

| Terminals on same machine | Use |
|---------------------------|-----|
| 1 feature | `/go new <slug>` in repo |
| 2+ features in parallel | `/go worktree <slug>` per terminal — separate folders |

## Pair commands

| When | Command |
|------|---------|
| End of session | `/context-save` |
| Resume later | `/context-restore` then `/go continue <branch>` |
| Ship to staging | `/push staging` |
| Restart dev | `/devup-staging` |

## Script reference

All git mutations go through `scripts/staging-session.sh` — do not hand-roll checkout/push logic.
