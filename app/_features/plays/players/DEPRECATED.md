# Players - DEPRECATED

**Deprecated:** 2026-07-12

Players have been retired in favor of section-based playbook groupings.

## Migration

| Old (Player) | New (Section) |
|--------------|---------------|
| keeper | _meta |
| billing | billing |
| follow-up | relationships |
| brief | _meta |
| client-risk | relationships |
| scope | work |
| general | (user-created in any section) |

## New System

Use `section-capabilities.ts` instead of `players/capabilities.ts`.

Playbooks are now grouped by section:
- relationships, work, billing, files, meetings, me, connections, notes, _meta

## Files to Remove (after migration complete)

- `players/capabilities.ts` → replaced by `section-capabilities.ts`
- `players/visual.ts` → section visuals in `playbooks/schema/v2/types.ts`
- `players/queries.ts` → no longer needed
- `app/(product)/plays/players/` → route removed
