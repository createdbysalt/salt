---
name: perplexity-research
description: Quick or deep web research via Perplexity MCP. Use for qresearch perplexity, current facts, API docs, pricing, competitive lookups. Requires PERPLEXITY_API_KEY and perplexity MCP in .mcp.json.
---

# Perplexity Research (MCP)

Real-time, cited web research through the **Perplexity MCP** server. Port of `.claude/commands/perplexity.md` for Cursor.

## When to Use

| Trigger | Use Perplexity when |
|---------|---------------------|
| `qresearch perplexity` | User chose Perplexity explicitly |
| Quick facts | Pricing, quotas, "what's latest on X", API field lists |
| During Gemini research | One-off fact checks (`--brief` style) |

**Use `qresearch gemini` (`gemini-research`) instead for:** multi-dimensional pre-build briefs, "should we build X?", scripted outputs under `brand-identity/research/`, heavy synthesis with repo context.

## Prerequisites

- `PERPLEXITY_API_KEY` in 1Password (`perplexity` item) — see `.env.1password`
- `perplexity` in project `.mcp.json`
- Cursor launched with secrets: `op run --env-file=.env.1password -- open -a Cursor .`
- **Settings → Tools & MCP** → `perplexity` connected

## Invocation

User message shape:

```
qresearch perplexity <question>
qresearch perplexity --deep <topic>
qresearch perplexity --brief <fact check>
```

Parse everything after `perplexity` as the query. Optional flags:

| Flag | MCP tool | Model behavior |
|------|----------|----------------|
| (default) | `perplexity_ask` | Conversational + web context |
| `--search` | `perplexity_search` | Ranked URLs/snippets only |
| `--deep` | `perplexity_research` | Sonar deep research + citations |
| `--reason` | `perplexity_reason` | Step-by-step reasoning |
| `--focus docs` | Any tool | Prefix: "Focus on official documentation and API references." |
| `--focus technical` | Any tool | Prefix: "Focus on implementation details and technical tradeoffs." |
| `--focus business` | Any tool | Prefix: "Focus on market, pricing, and business context." |

## Workflow

1. **Extract query** from the user message (required). If missing, ask once for the research question.
2. **Codebase skim** (light): grep `docs/plans/`, related `app/_features/` — one paragraph of internal context only; don't block on Gemini-length analysis.
3. **Call MCP** via `CallMcpTool` — server `perplexity`, tool per table above. Read tool schema under `mcps/` before first call if unsure of argument names.
4. **Respond** with:
   - Direct answer
   - Citations / sources from MCP output (never invent URLs)
   - Confidence: `HIGH` | `MEDIUM` | `LOW`
   - Optional: "SALT implication" if repo-relevant
5. **Optional file** (user asks to save, or `--deep`): Write brief to `brand-identity/research/quick-lookups/YYYY-MM-DD-<slug>.md` using the Write tool.

## MCP tool selection

```
Quick question     → perplexity_ask
Raw search results → perplexity_search
Deep report        → perplexity_research
Logic / decision   → perplexity_reason
```

## Errors

| Error | Action |
|-------|--------|
| MCP not listed | User must relaunch Cursor via `op run`; check `.mcp.json` |
| Auth failure | `pnpm env:op-check` — verify `OK: PERPLEXITY_API_KEY` |
| Tool call fails | Fall back to `deep-research` skill (WebSearch) and note Perplexity unavailable |

## Integration

| Related | Trigger / skill |
|---------|-----------------|
| Deep pre-build | `qresearch gemini` → `gemini-research` |
| No API | `deep-research` |
| UX patterns | `qscout` → `ux-scout` |
| Planning | `qplan` after research |
