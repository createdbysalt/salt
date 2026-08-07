# Plans archive

**Status:** Historical — do not treat as current architecture or routing canon.

These dated plan files capture decisions and work-in-progress at the time they were written. Product shape, route groups, and naming have moved on since many of these were drafted.

## Source of truth (use instead of plans)

| Topic | File |
|-------|------|
| Product surfaces & nav | [`brand-identity/product/feature-inventory.md`](../../brand-identity/product/feature-inventory.md) |
| Route groups & folders | [`docs/reference/folder-structure.md`](../reference/folder-structure.md) |
| Legacy redirects & retired names | [`docs/architecture/legacy-naming.md`](../architecture/legacy-naming.md) |
| Agent commands & stack | [`CLAUDE.md`](../../CLAUDE.md), [`AGENTS.md`](../../AGENTS.md) |

## Common stale terms in older plans

Plans may still reference retired concepts. When reading or executing a plan, translate:

| Plan-era term | Current |
|---------------|---------|
| `(hq)/`, `(studio)/`, `(billing)/` | `(product)/`, `(settings)/` |
| Roundtables / `/roundtables` | Spaces / `/spaces` |
| Standalone `/capture` | Sources → Activity (`/sources?tab=activity`) |
| Plays → Customize (connectors) | Sources → Connectors (`/sources`) |
| Plays → Watching (learning queue) | Memory → Filter (`/memory?tab=filter`) |
| `/dashboard/*`, `/clients` | `/hq`, `/people`, `/work`, etc. |
| `app/actions/projects/` | Removed — use `_features/work/` or `people/` |
| `app/actions/` (central) | Removed — use `_features/<feature>/actions/` |
| Bridge / client portal | Retired — Spaces |

## Active execution plans

Cursor-native active plans may live in `.cursor/plans/` during implementation. Same rule applies: verify against `CLAUDE.md` and the docs above before coding.

## Adding new plans

New durable plans still go here as `YYYY-MM-DD-<feature>.md` per the planning protocol in `.cursor/rules/00-planning.mdc`. Mark status at the top (`Draft`, `Approved`, `Complete`, `Superseded`).
