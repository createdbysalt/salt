# Capture Feature Guide

**Context:** The capture system is Salt's intake funnel — it observes connected accounts, discovers People/Orgs/Work worth tracking, and accumulates signals over time.

**Surface placement (post-2026-08-06 reorg):** the capture stream UI lives at **Sources → Activity** (`/sources?tab=activity`; `/capture` redirects there). Gate outcomes feed **Memory → Filter**: candidates and unresolved evidence appear under **Watching**, dropped/noise items under **Kept out**. **P11 (2026-08-07):** Blocklists and Kept out are now managed in **Sources → Activity**, not Memory — intake policy belongs at the intake surface.

## Architecture Overview

```
Composio Webhook → Category Adapter → Gate Pipeline → capture_events
                                           ↓
                                    creates/links entity
                                           ↓
                                    applyEnrichmentToEntity()
                                    (continuous awareness)
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Category Adapters | `adapters/categories/` | Normalize payloads by category — 9 adapters: email, calendar (incl. Cal.com + Calendly), billing, crm, meetings, documents, storage, project_management, communication |
| Gate Pipeline | `services/gates/` | Filter noise, fast-track known entities, score candidates |
| Watch Expressions | `services/watch-expressions.ts` | Track identifiers for continuous awareness |
| Re-enrichment Bridge | `services/reenrichment-bridge.ts` | Trigger enrichment on entity match |
| Ingest Envelope | `services/ingest-envelope.ts` | Core ingestion logic |

## Category Adapters

Category adapters handle any app in their category, falling back to generic extraction when provider-specific parsing isn't available.

| Category | Adapters | Providers |
|----------|----------|-----------|
| `email` | `categories/email.ts` | gmail, outlook, yahoo_mail |
| `calendar` | `categories/calendar.ts` | googlecalendar, cal, outlook_calendar |
| `billing` | `categories/billing.ts` | stripe, quickbooks, xero |
| `storage` | `categories/storage.ts` | googledrive, dropbox, onedrive |

### Adding a New Provider

1. Check if the provider's category adapter exists in `adapters/categories/`
2. If yes, add provider-specific normalization in the adapter's `normalize()` function
3. If no, create a new category adapter following the existing pattern
4. Update `adapters/categories/index.ts` to include the new adapter

```typescript
// Example: Adding a new email provider
function normalizeNewProvider(payload: unknown): CaptureEnvelope | null {
  // Extract fields from the provider's payload format
  // Return a standardized CaptureEnvelope
}
```

## Gate Pipeline

The three-gate model filters noise before creating captures:

### Gate 1: Pre-Ingest Gate (`gates/pre-ingest-gate.ts`)
Blocks obvious spam/marketing:
- Unsubscribe header detection
- Bulk-mail headers (Precedence: bulk, Auto-Submitted)
- Disposable email domain blocklist
- Marketing platform domain blocklist
- Gmail promotional label detection
- Noreply/automated sender detection

### Gate 1.5: Workspace Blocklist (`services/blocklist-manager.ts`)
After pre-ingest but before entity lookup, checks workspace-specific blocklists:
- **Domain blocks**: Block all emails from a specific domain
- **Email blocks**: Block a specific email address
- **Sender pattern blocks**: Block senders matching a regex pattern

Users manage blocklists via Memory → Rules (admission policy section). Settings → Capture still exists but only carries connector health and calibration.

### Gate 2: Known-Entity Gate (`gates/known-entity-gate.ts`)
Fast-tracks captures from known contacts:
- Watch expressions (fastest path)
- Email matches a Person in Memory
- Domain matches an Organization in Memory

### Gate 3: Admission Gate (`gates/admission-gate.ts`)
Scores unknown senders for candidacy:
- You initiated: +40 points
- They replied: +35 points
- Bidirectional thread: +30 points
- Calendar meeting: +35 points
- Payment relationship: +40 points
- Shared file: +20 points
- **Threshold:** ≥30 = candidate, <30 = noise

## Watch Expressions (Continuous Awareness)

When a Person/Org is created, their identifiers are registered for future matching:

```typescript
// Auto-registered on entity creation
await registerWatchExpressions({
  workspaceId,
  targetSurface: "people",
  targetEntityId: person.id,
  emails: [person.email],
  domains: [], // Auto-derived from email
});
```

On match during ingest:
1. Watch expression lookup (indexed, fast)
2. Update `last_matched_at` timestamp
3. Queue re-enrichment (24h throttle)
4. Return signal result with entity link

## Database Schema

### capture_events
```sql
-- Gate result columns (V2)
gate_action TEXT,      -- 'drop' | 'signal' | 'candidate' | 'noise' | 'held' (GateAction in types/gate-result.ts)
gate_result JSONB      -- Full gate result for debugging
```

### entity_watch_expressions
```sql
CREATE TABLE entity_watch_expressions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  expression_type watch_expression_type,  -- email, domain, phone, name_pattern
  expression_value TEXT NOT NULL,
  target_surface TEXT NOT NULL,           -- 'people' | 'organizations'
  target_entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  last_matched_at TIMESTAMPTZ,
  UNIQUE (workspace_id, expression_type, expression_value)
);
```

### capture_blocklist
```sql
CREATE TABLE capture_blocklist (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  type capture_blocklist_type,  -- domain, email, sender_pattern
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  UNIQUE (workspace_id, type, value)
);
```

## Testing

Tests are co-located with services:

| Test File | Coverage |
|-----------|----------|
| `services/gates/pre-ingest-gate.test.ts` | 20 tests for spam/noise detection |
| `services/gates/index.test.ts` | Gate pipeline orchestration, incl. known-entity/watch-expression matching |
| `services/gates/admission-gate.test.ts` | Signal scoring and thresholds |
| `services/gates/admission-signals.test.ts` | Admission signal derivation |
| `services/gates/cold-intent.test.ts` | Cold-outreach intent detection |
| `services/watch-expressions.test.ts` | 7 tests for watch lifecycle |
| `services/blocklist-manager.test.ts` | 19 tests for workspace blocklist CRUD |

Run tests:
```bash
pnpm test app/_features/capture/
```

## Integration with Enrichment

The capture system bridges to enrichment-unification for continuous awareness:

```typescript
// On watch expression match in known-entity-gate
queueReenrichment(workspaceId, match);

// In reenrichment-bridge.ts
export async function triggerReenrichment(workspaceId, match) {
  // 1. Check 24h throttle
  if (!await shouldReenrich(match.expression.id)) return;
  
  // 2. Pull latest data from connected apps
  const result = await enrichEntity({ entityType, seed, workspaceId });
  
  // 3. Apply to Memory fields
  await applyEnrichmentToEntity({ ... });
}
```

## Debugging

### Check gate results
```sql
SELECT id, title, gate_action, gate_result
FROM capture_events
WHERE workspace_id = ?
ORDER BY created_at DESC;
```

### Check watch expressions
```sql
SELECT * FROM entity_watch_expressions
WHERE workspace_id = ?
ORDER BY last_matched_at DESC;
```

### Check blocklist entries
```sql
SELECT * FROM capture_blocklist
WHERE workspace_id = ?
ORDER BY created_at DESC;
```

### Connector health
Use the `/connector capture-health` command to diagnose connection issues.
