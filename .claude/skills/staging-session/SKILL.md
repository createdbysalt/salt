---
name: staging-session
description: >-
  Bootstrap a staging dev session when opening a terminal — sync origin/staging,
  create feat/* or continue an existing branch, optional git worktree for parallel
  Claude terminals. Use when the user says /go, "start staging", "new feature branch",
  or "continue feature".
---

# Staging Session (`/go`)

See `.claude/commands/go.md` for the full workflow.

```bash
bash scripts/staging-session.sh status   # default
bash scripts/staging-session.sh list
bash scripts/staging-session.sh new <slug>
bash scripts/staging-session.sh continue <branch-or-slug>
bash scripts/staging-session.sh worktree <slug>
```

Dev: `pnpm dev:staging:op` · Ship: `/push staging` · Pause: `/context-save`
