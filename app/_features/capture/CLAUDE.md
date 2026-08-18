# Capture Feature Guide

**Context:** The capture system is Salt's intake funnel — it observes connected accounts, discovers People/Orgs/Work worth tracking, and accumulates signals over time.

**Surface placement (post-2026-08-06 reorg):** the capture stream UI lives at **Sources → Activity** (`/sources?tab=activity`; `/capture` redirects there). Gate outcomes feed **Memory → Filter**: candidates and unresolved evidence appear under **Watching**, dropped/noise items under **Kept out**. **P11 (2026-08-07):** Blocklists and Kept out are now managed in **Sources → Activity**, not Memory — intake policy belongs at the intake surface. **(2026-08-17):** Kept-out *review* lives in the stream itself — the Filter popover's "Also show → Kept out" toggle (`keptOut` param on `getCaptureStreamPage`) reveals dropped/held rows with plain-language verdicts and inline correction actions (`components/KeptOutCorrectionButtons.tsx`); a full-history search (2+ chars) spans the same rows.

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

The gate model filters noise before creating captures. **Connector Rules & Learning (2026-08-10):** user rules now run FIRST, before every heuristic — explicit deny > explicit allow > heuristics.

### Gate 0: Connector Rules (`services/rules-manager.ts`)
First check in `runGatePipeline`, before pre-ingest:
- **Explicit deny** (`rule_type = 'deny'`) matching the capture's feedback entity → drop immediately
- **Explicit allow** (`rule_type = 'allow'`) → `signal`, bypasses the memory-first hold and every heuristic
- Rules are scoped (three scopes since 2026-08-17): provider-scoped (`provider` set), area-scoped (`provider NULL` + `area` set — covers every account in the area), workspace-wide (both NULL). Precedence: provider > area > workspace; deny beats allow at the same scope. The gate derives the capture's area from its provider's capture category (`CATEGORY_TO_AREA`)
- The feedback entity (`{ type, key }` — e.g. `sender_email`, `organizer`, `channel`) is extracted ONCE per capture by the category adapter's `extractFeedbackEntity()` (`adapters/feedback-entity.ts` dispatch) and shared by rules, corrections, and learned profiles
- `sender_pattern` rules glob-match against explicit pattern candidates (e.g. the sender display name), never the entity key
- Storage: `connector_rules` table (migration `20260810120000_connector_rules.sql`); legacy `capture_blocklist` rows were backfilled in as workspace-wide deny rules
- **`blocklist-manager.ts` is now a facade** over rules-manager — exported API unchanged, workspace-wide denies only. Do not add new features to it; extend rules-manager instead
- User-facing copy is "Always let in" / "Keep out" (connector Customize tab, `connectors/actions/rules.ts`); engineering vocabulary stays "rules"

### Gate 1: Pre-Ingest Gate (`gates/pre-ingest-gate.ts`)
Blocks obvious spam/marketing:
- Unsubscribe header detection
- Bulk-mail headers (Precedence: bulk, Auto-Submitted)
- Disposable email domain blocklist
- Marketing platform domain blocklist
- Gmail promotional label detection
- Noreply/automated sender detection

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
- **Esteemed entity: +20** when the capture's feedback entity has a learned reputation ≥70; **−20** when ≤30 (`entity_reputation` signal — see Learned Entity Profiles below)
- **Threshold:** ≥30 = candidate, <30 = noise

### Workspace Gate Policy (Customize surfaces, S3)

`workspaces.capture_gate_policy` (jsonb) carries the workspace's plain-language
gate choices; `gates/gate-policy.ts` resolves partial/invalid json to
ship-day defaults, and `runGatePipeline` reads it via
`actions/gate-policy.ts#getCaptureGatePolicy` (a read failure resolves to
defaults — intake never gates on a policy-read outage). Email ships three
choices: `automated_senders` (softens ONLY the pre-ingest 'automated'
detections — spam/marketing always drop), `strangers` (governs the
memory-first hold; `dropped` drops before the paid cold-intent read), and
`track_subscriptions` (default `tracked`: receipt-shaped senders on known
SaaS vendor domains — `vendor-domains.ts#isVendorReceiptSender` — pass
pre-ingest and the hold so daily-scan can capture them into Billing as
payable `billing_records` via `intelligence/subscription-capture.ts`;
`ignored` restores the drop).

**The Customize-line rule:** every gate ships with a transparency line on
Sources → Customize (`adapters/default-policy.ts`), and a gate gets a
user-facing control only when reasonable users genuinely differ — a named
choice beside its line, never a numeric knob. A gate without a Customize
line doesn't ship.

## Learned Entity Profiles (P6)

Workspace-keyed reputation for the same feedback entities rules match on:

- `entity-profiles.ts` dispatches by entity: `sender_email` delegates to the email-specific `capture_sender_profiles`; every other entity type uses the generalized `connector_entity_profiles` table (migration `20260810130000_connector_entity_profiles.sql`, keyed on workspace + provider + category + entity type + key)
- **Writers (implicit feedback):** Kept-Out corrections (`capture/actions/corrections.ts` — always-allow +10, remove-block +5) and Watching/Kept-Out capture decisions (`memory/actions/admission-decisions.ts` — signal +5, noise −5)
- **Reader:** the gate pipeline loads the entity's reputation after extraction and feeds it to the admission gate as the `entity_reputation` signal
- Reputation scores clamp to 0–100, default 50, and never live in `connector_overrides` (global catalog) — workspace tables only

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

### connector_rules
```sql
CREATE TABLE connector_rules (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  provider TEXT,              -- provider scope; NULL when area- or workspace-scoped
  area TEXT,                  -- area scope (email, calendar, ...); NULL otherwise. provider + area both set is rejected by CHECK
  rule_type TEXT,             -- 'allow' | 'deny'
  entity_type TEXT,           -- category-defined vocabulary (sender_email, domain, organizer, channel, ...)
  entity_key TEXT,
  reason TEXT,
  source TEXT,                -- 'user' | 'suggested'
  created_by UUID,
  created_at TIMESTAMPTZ,
  UNIQUE NULLS NOT DISTINCT (workspace_id, provider, area, rule_type, entity_type, entity_key)
);
-- capture_blocklist rows were backfilled in as provider-NULL deny rules (2026-08-10).
-- area column added 2026-08-17 (20260817120000_connector_rules_area_scope.sql).
```

### connector_entity_profiles
```sql
CREATE TABLE connector_entity_profiles (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  provider TEXT,
  category TEXT,              -- capture category (billing, documents, ...)
  entity_type TEXT,
  entity_key TEXT,
  reputation_score INTEGER,   -- 0..100, default 50
  observation_count INTEGER,
  last_observation_at TIMESTAMPTZ,
  stats JSONB,
  UNIQUE NULLS NOT DISTINCT (workspace_id, provider, category, entity_type, entity_key)
);
```

## Testing

Tests are co-located with services:

| Test File | Coverage |
|-----------|----------|
| `services/gates/pre-ingest-gate.test.ts` | 20 tests for spam/noise detection |
| `services/gates/index.test.ts` | Gate pipeline orchestration, incl. rules precedence and known-entity/watch-expression matching |
| `services/gates/admission-gate.test.ts` | Signal scoring and thresholds, incl. `entity_reputation` |
| `services/gates/admission-signals.test.ts` | Admission signal derivation |
| `services/gates/cold-intent.test.ts` | Cold-outreach intent detection |
| `services/watch-expressions.test.ts` | 7 tests for watch lifecycle |
| `services/rules-manager.test.ts` | connector_rules CRUD, normalization, and checkRules precedence |
| `services/blocklist-manager.test.ts` | Facade parity over rules-manager (API unchanged) |
| `services/entity-profiles.test.ts` | Category-dispatch profile load/observe |
| `adapters/feedback-entity.test.ts` | Per-category feedback entity extraction |

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

### Check rules
```sql
SELECT * FROM connector_rules
WHERE workspace_id = ?
ORDER BY created_at DESC;
```

### Check learned entity profiles
```sql
SELECT * FROM connector_entity_profiles
WHERE workspace_id = ?
ORDER BY reputation_score DESC;
```

### Connector health
Use the `/connector capture-health` command to diagnose connection issues.
