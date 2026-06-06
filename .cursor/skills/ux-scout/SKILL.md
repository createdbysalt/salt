---
name: ux-scout
description: Research UX patterns for a feature and adapt for Salt using @repo/ui. Lovable source is the upcoming visual reference. Use for qscout / scout patterns.
---

# UX Pattern Scout

Port of `.claude/commands/scout.md` for Cursor. Agent: `.claude/agents/ux-pattern-scout.md`.

Pair with **`frontend-design`** and **`interaction-patterns`** for implementation.

## Usage

User says: `qscout clients`, `scout projects --focus kanban`, `scout messaging --reference linear.app`

| Param | Meaning |
|-------|---------|
| feature | Area to scout (required): clients, projects, plays, etc. |
| focus | Narrow scope: "detail page", "payment flow" |
| reference | Prioritize one product (copilot.com, linear.app) |
| level | `supervised` \| `guided` (default) \| `autonomous` |

## Phases

### 1. Discover

- Read current Salt implementation under `app/_features/` and routes
- List pain points vs Lovable source (when available), `DESIGN.md`, `docs/guides/ui-patterns.md`
- Define success criteria

### 2. Scout

- WebSearch / reference products (Copilot, Linear, Notion, etc.)
- Extract IA, flows, and why patterns work
- Feature reference table in `.claude/commands/scout.md` (clients → Copilot, HoneyBook, etc.)

### 3. Analyze

Score candidates: relevance, complexity, information density, mobile. Pick a **hero pattern**.

### 4. Propose

- Current vs recommended (ASCII or bullet comparison)
- Map to `@repo/ui` / `@repo/patterns` — reuse before creating new
- File list to create/modify + effort estimate
- **Pause for approval** unless `level: autonomous` and scope is small

### 5. Implement (only after approval)

- Follow `frontend-design` skill (`@repo/ui`)
- When `DESIGN.md` is populated from Lovable, use those tokens; until then match Lovable source or existing app patterns
- Keyboard + dark mode

## Reference products by feature

| Feature | References |
|---------|------------|
| Clients | Copilot, HoneyBook, Dubsado |
| Projects | Linear, Notion, Asana |
| Messaging | Intercom, Slack, Linear |
| Invoices | Stripe, Wave |

## Related

| Trigger | Skill |
|---------|--------|
| `qresearch` | `gemini-research` |
| `qux` | `frontend-design` |
| `qplan` | `prd` after approval |

Claude Code: `/scout [feature]`
