# Agent instructions (Cursor + Claude Code)

This repo uses **two AI harnesses** on the same codebase. Standards are shared; invocation differs.

| | Primary | Backup |
|---|---------|--------|
| **Tool** | Cursor | Claude Code (`claude` in terminal) |
| **Rules** | `.cursorrules`, `.cursor/rules/` | `CLAUDE.md` (auto-loaded) |
| **Workflows** | `.cursor/skills/` + `q*` triggers | `.claude/commands/` slash commands |
| **Subagents** | Skills + MCP | `.claude/agents/` |

## Read first

1. **`CLAUDE.md`** (root) — tech stack, `pnpm` commands, doc index, nested `CLAUDE.md` map  
2. **`docs/guides/dual-agent-setup.md`** — sync policy, trigger ↔ slash mapping, new machine checklist  
3. **`docs/guides/greptile-setup.md`** — Greptile GitHub app + API key + Cursor MCP  

## Velocity triggers (Cursor)

Defined in `.cursorrules`: `qplan`, `qcode`, `qtest`, `qfix`, `qresearch gemini`, `qresearch perplexity`, `qreview`, `qreview-pragmatic`, `qcleanup`, `qstructure`, `qsource`, `qux`, `qdb`, `qscout`, `stripe`.

## Secrets (1Password)

Vault: **`salt-software-development`**

```bash
pnpm dev:op              # Next.js with injected secrets
pnpm research:op --query "..."    # Gemini research script (`qresearch gemini`)
pnpm env:op-check             # GEMINI + GREPTILE + PERPLEXITY keys
# qresearch perplexity → Perplexity MCP (perplexity_ask / perplexity_research)
```

Launch Cursor with MCP secrets:

```bash
op run --env-file=.env.1password -- open -a Cursor .
```

## Nested context

When editing files in a directory, read that directory's `CLAUDE.md` if present (e.g. `app/_features/CLAUDE.md`, `supabase/CLAUDE.md`).

## Tool registry

Full inventory: `.claude/tool-registry.md`
