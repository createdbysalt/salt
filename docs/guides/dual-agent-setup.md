# Cursor + Claude Code: Dual Harness Setup

Salt is built for **Claude Code** (`.claude/`, `CLAUDE.md`, slash commands) and is moving to **Cursor** as the primary IDE agent. Both should share the same standards and stay in sync.

**Read this once when switching tools or onboarding a new machine.**

---

## Architecture (what owns what)

```
                    SHARED (git — source of truth)
                    ─────────────────────────────
                    CLAUDE.md (root + 17 nested)
                    docs/guides/*, docs/architecture/*
                    .cursorrules
                    .env.1password / .env.example
                    .mcp.json

        CURSOR PRIMARY                    CLAUDE BACKUP
        ──────────────                    ─────────────
        .cursor/rules/*.mdc               .claude/agents/*.md
        .cursor/skills/*/SKILL.md         .claude/commands/*.md
        Velocity triggers (q*)          Slash commands (/database)
        Greptile + MCP in Cursor          Ralph loop (/ralph)
        Composer / Agent mode             claude in terminal

                    BOTH USE
                    ────────
                    pnpm dev:op
                    1Password vault salt-software-development
                    Same repo, same branch, same tests
```

### Rule of thumb

| Content type | Canonical location | Why |
|--------------|-------------------|-----|
| Project standards, commands, doc index | `CLAUDE.md` | Already nested by directory; both tools should read it |
| Cursor auto-context by path | `.cursor/rules/*.mdc` | Summaries + globs; points to nested `CLAUDE.md` |
| Cursor skill discovery | `.cursor/skills/` | Native Agent Skills |
| Claude slash workflows | `.claude/commands/` | Claude Code only unless ported to skills |
| Claude subagents | `.claude/agents/` | Claude Code only; use Cursor skills or ask in plain language |
| Scripts (Gemini, Ralph) | `.claude/scripts/` | Callable from either via `pnpm` / `op run` |
| Tool inventory | `.claude/tool-registry.md` | Update when adding skills/commands |

**Do not fork standards** into two places. Change `CLAUDE.md` or `docs/` once; update `.cursor/rules` only when Cursor needs a short glob-specific summary.

---

## Daily workflow

### Primary: Cursor

1. **Secrets:** Quit Cursor, then from repo root:
   ```bash
   op run --env-file=.env.1password -- open -a Cursor .
   ```
2. **Dev server:** `pnpm dev:op`
3. **Triggers:** Use `qplan`, `qcode`, `qresearch`, `qreview`, etc. (see `.cursorrules`)
4. **Skills:** Say the skill name or trigger — agent loads `.cursor/skills/`

### Backup: Claude Code (terminal)

1. `cd` to repo, `op signin` if needed
2. `claude` (or Claude Code VS Code extension)
3. **Slash commands:** `/database`, `/research`, `/ralph`, `/scout`, …
4. **Same files:** Reads `CLAUDE.md` and `.claude/` automatically

### When to use which

| Situation | Tool |
|-----------|------|
| Normal feature work, UI, PR loop | **Cursor** |
| Greptile fix loop + pragmatic review | **Cursor** (`qreview`, `qreview-pragmatic`) |
| Ralph autonomous multi-hour runs | **Claude** (`/ralph`) |
| Heavy subagent orchestration you already know | **Claude** |
| Gemini research script | **Either** — `pnpm research:op` or `/research` |

---

## Velocity triggers (Cursor) ↔ Claude commands

| Cursor (`.cursorrules`) | Claude command | Skill |
|-------------------------|----------------|-------|
| `qplan` | (manual / plan docs) | `prd`, `product-planning` |
| `qcode` | — | `testing-patterns` |
| `qtest` | — | `testing-patterns`, `webapp-testing` |
| `qfix` | — | `systematic-debugging` |
| `qresearch` / `qresearch gemini` | `/research` | `gemini-research` (+ `pnpm research:op`) |
| `qresearch perplexity` | `/perplexity` | `perplexity-research` (Perplexity MCP) |
| `qreview` | — | `grep-loop-review-workflow` |
| `qreview-pragmatic` | `/pragmatic-code-review` | `pragmatic-code-review` |
| `qcleanup` | — | `code-structure-cleanup` |
| `qstructure` | — | `code-structure` |
| `qsource` | — | `source-code-context` |
| `qux` | `/scout`, `/ds-check` | `frontend-design`, `interaction-patterns` |
| `qdb` | `/database` | `database-keeper` |
| `qscout` | `/scout` | `ux-scout` |
| `stripe` | `/payment` | `stripe-best-practices` |

Claude-only until ported: `/ralph`, `/replicate`, full `/ux-improve` orchestration.

**Greptile:** [greptile-setup.md](./greptile-setup.md)

---

## Keeping things in sync

### When you add a new standard

1. Update **`CLAUDE.md`** (or nested `app/CLAUDE.md`, etc.)
2. If Cursor needs path-based hints, add/update **`.cursor/rules/NN-name.mdc`**
3. Commit both

### When you add a new workflow

1. Implement as **`.cursor/skills/<name>/SKILL.md`** (Cursor-native)
2. Add thin mirror under **`.claude/skills/<name>/`** pointing to Cursor copy *or* duplicate if Claude-only
3. Add trigger row to **`.cursorrules`** and entry in **`.claude/tool-registry.md`**
4. For Claude-only slash UX, add **`.claude/commands/<name>.md`**

### Skills sync policy (current repo)

| Location | Role |
|----------|------|
| `.cursor/skills/` | **Canonical** for Cursor (committed to git) |
| `.claude/skills/` | Claude Code + mirrors; full copy or pointer to `.cursor/skills/` |
| `.agents/skills/` | Stripe skills (copied into `.cursor/skills/` for Cursor) |

### 1Password

All agent keys live in **`.env.1password`**. Never duplicate secrets in `.env.local` for long.

- App: `pnpm dev:op`
- Gemini: `pnpm research:op --query "..."`
- Cursor MCP: launch Cursor via `op run` (see [1Password Setup](./1password-setup.md))

---

## New machine checklist

- [ ] Clone repo
- [ ] `brew install 1password-cli` && `op signin`
- [ ] Create missing 1Password items (`greptile`, etc.) — `pnpm env:op-check`
- [ ] Install Cursor, open repo via `op run --env-file=.env.1password -- open -a Cursor .`
- [ ] Enable MCP servers from `.mcp.json` in Cursor settings
- [ ] Optional: `npm i -g @anthropic-ai/claude-code` for terminal backup
- [ ] `pnpm install` && `pnpm dev:op`

---

## What not to do

- **Do not** maintain divergent build/test instructions in `.cursorrules` vs `CLAUDE.md` — `.cursorrules` should defer to `CLAUDE.md` for commands.
- **Do not** gitignore `.cursor/rules` or `.cursor/skills` — they are team config, not personal state.
- **Do not** delete `.claude/` when adopting Cursor — it is the backup harness and hosts Ralph, scripts, and slash commands.
- **Do not** expect `/database` in Cursor — ask "audit RLS on X" and read `supabase/CLAUDE.md`, or use Supabase MCP.

---

## Related docs

- [1Password Setup](./1password-setup.md)
- [Greptile Setup](./greptile-setup.md)
- [Environment Variables](../reference/environment-variables.md)
- Root `AGENTS.md` — entry point for any AI tool
- Root `CLAUDE.md` — operational commands and nested index
- `.claude/tool-registry.md` — full tool list for qplan
