---
name: gemini-research
description: Pre-build research using Gemini Deep Research plus codebase context. Use when planning features, validating build decisions, researching UX/competitive landscape, or before PRD work. Requires GEMINI_API_KEY.
---

# Gemini Pre-Build Research

Pre-build intelligence: external research (Gemini) + internal codebase context → decision matrix + brief. Port of `.claude/agents/gemini-researcher.md` and `/research` for Cursor.

## When to Use

- Planning a new feature; "should we build this?"
- Competitive / UX / validation research before coding
- Phase 0 before `prd` or `docs/plans/`
- User says `qresearch gemini`, `qresearch` (defaults to Gemini), "gemini research", or "research this feature"

## Prerequisites

- `GEMINI_API_KEY` in 1Password (`gemini` item in `salt-software-development` vault) — see `.env.1password`
- Script: `.claude/scripts/gemini-research.sh` (executable)

## Quick Start (1Password)

```bash
pnpm research:op \
  --query "Should we add X to Salt?" \
  --depth standard \
  --dimensions all \
  --context "Salt: Next.js agency platform, Supabase, Stripe" \
  --category feature-research \
  --name ambient-client-onboarding
```

Without pnpm: `op run --env-file=.env.1password -- .claude/scripts/gemini-research.sh` with the same flags.

Outputs default to `brand-identity/research/<category>/` as a dated `.md` brief. Use `--output json` or `--output both` only when a downstream automation needs structured data.

## Workflow

### 1. Scope

| Field | Example |
|-------|---------|
| Query | What are we investigating? |
| Decision | What choice does this inform? |
| Depth | `quick` \| `standard` \| `deep` |
| Dimensions | `user-psychology`, `competitive`, `technical`, `validation`, `ux-patterns`, or `all` |
| Autonomy | `supervised` \| `guided` \| `advisory` \| `autonomous` |

### 2. Codebase context (before external research)

Search the repo for related patterns:

- `app/_features/`, `app/_lib/`, `supabase/`
- Existing plans in `docs/plans/`
- `DESIGN.md` for UI work

Document: reusable patterns, constraints, related features.

### 3. Route live facts to Perplexity

Before calling Gemini, decide whether any part of the question needs current, cited web data.

Use Perplexity for:

- Current pricing, quotas, limits, changelogs, or API docs
- Competitor claims, live product pages, market/news facts, or dated benchmarks
- Anything where a citation should be shown to the user

Use Gemini for:

- Multi-dimensional synthesis, tradeoffs, user psychology, product strategy, and pattern analysis
- Combining Perplexity citations with Salt codebase context
- Producing the final recommendation and decision matrix

If Perplexity is needed, run `qresearch perplexity --brief` for narrow facts or `qresearch perplexity --deep` for source-heavy questions. Feed the cited findings into Gemini as context.

### 4. Run Gemini script

Use Shell with `GEMINI_API_KEY` set. On failure, report the error and fall back to `deep-research` skill (manual WebSearch + synthesis).

### 5. Synthesize

- Cross-reference Gemini findings with codebase reality
- Include Perplexity citations for live facts
- Tag confidence: `HIGH` \| `MEDIUM` \| `LOW` \| `HYPOTHESIS`
- Cite sources; document gaps and contradictions

### 6. Decision matrix

```json
{
  "should_build": "YES | YES_WITH_CAVEATS | NEEDS_MORE_RESEARCH | NO | PIVOT",
  "confidence": "HIGH | MEDIUM | LOW",
  "reasoning": "...",
  "key_evidence": [],
  "key_risks": [],
  "recommended_approach": "..."
}
```

### 7. Write outputs

Use the **Write** tool (never bash heredocs for file creation):

- `brand-identity/research/<category>/YYYY-MM-DD-<slug>.md` — brief
- Do not create a `.json` file unless the user explicitly asks for it or a downstream automation requires it.

### 8. Next steps

| Decision | Action |
|----------|--------|
| YES / YES_WITH_CAVEATS | `qplan` → `docs/plans/…` or `prd` skill |
| NEEDS_MORE_RESEARCH | List gaps + how to fill |
| NO / PIVOT | Document why; optional follow-up research |

## Anti-hallucination

- Never fabricate citations — mark `HYPOTHESIS` when inferring
- Ground recommendations in actual repo paths
- Surface contradictions between external research and internal signals

## Integration

| Feeds into | Skill / trigger |
|------------|-----------------|
| Planning | `prd`, `product-planning`, `qplan` |
| Users | `icp-development`, `brand-voice-extraction` |
| UI | `interaction-patterns`, `frontend-design` |
| Deep dive (no API) | `deep-research` |

## Dimension guide

| Dimension | Include when |
|-----------|----------------|
| `user-psychology` | Almost always |
| `competitive` | Market alternatives exist |
| `technical` | Implementation path unclear |
| `validation` | Demand uncertain |
| `ux-patterns` | UI is a major part |
