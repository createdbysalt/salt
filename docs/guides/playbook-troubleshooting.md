# Playbook Troubleshooting Guide

When playbooks don't appear in the UI, they usually failed Zod schema validation. Discovery failures (validation errors, structural skips like a missing `_section.yaml`) are **platform-ops signals**: the founder sees them in the `/ops` dashboard's **Playbook library** section (see `docs/architecture/ops-ops.md`). Users can't fix repo YAML, so these are not product-facing.

DB-backed user-authored definitions that fail re-validation (listed as `db:<slug>`) are the user's own drafts and may still surface in product UI; table-level permission errors (e.g. a missing GRANT — see `supabase/CLAUDE.md` "GRANT Rule") are platform-ops.

## Quick Diagnosis

```bash
# Founder-gated (PLATFORM_ADMIN_EMAILS); 404 for anyone else
curl -H "Cookie: <founder session>" http://localhost:3000/api/debug/playbooks | jq '.allErrors'

# Or run the debug script (no auth needed — local process)
pnpm tsx scripts/debug-playbook-discovery.ts
```

## Common Validation Errors

### 1. `value.estimate: Number must be an integer`

`value.estimate` is **minutes of manual work saved per completed run** and may
be `0` (playbooks with no direct time savings, e.g. onboarding nudges). It
must be a non-negative integer.

**Wrong:**

```yaml
value:
  kind: time_saved
  estimate: 2.5   # ❌ Not an integer
  estimate: -1    # ❌ Negative
```

**Right:**

```yaml
value:
  kind: time_saved
  estimate: 2 # ✓ Minutes; 0 is also valid
```

### 2. `instructions.guidelines: Expected string, received object`

YAML interprets colons as key-value separators. Quote strings with colons.

**Wrong:**

```yaml
guidelines:
  - Create labels: Action, Money, Ops # ❌ Parsed as nested object
```

**Right:**

```yaml
guidelines:
  - "Create labels: Action, Money, Ops" # ✓ Quoted string
```

### 3. `output.type: Invalid enum value`

Output type must be one of: `email_draft`, `notification`, `memory_update`, `finding`, `briefing`

**Wrong:**

```yaml
output:
  type: activity_entry # ❌ Not a valid type
```

### 4. `trigger: Invalid input`

Trigger must have either `signal` (string) or `signals` (array), not both. Also check cron syntax for schedule triggers.

**Wrong:**

```yaml
trigger:
  type: signal
  signal: my_signal
  signals: # ❌ Can't have both
    - another_signal
```

### 5. `Playbook must have either 'trigger' or 'triggers' defined`

Every playbook needs a trigger.

### 6. `Action playbooks must have steps or instructions`

Act-layer playbooks need either `steps:` array or `instructions:` block (or both).

### 7. YAML Parse Errors

Watch for unquoted special characters:

```yaml
# ❌ This breaks:
- "It's been a while" or similar

# ✓ Quote the whole thing:
- '"It''s been a while" or similar'
```

## Prevention Checklist

Before committing a new playbook:

1. **Run the validator:**

   ```bash
   pnpm tsx scripts/debug-playbook-discovery.ts
   ```

2. **Check required fields:**
   - `name`, `version`, `description`, `section`, `layer`
   - `trigger` or `triggers`
   - `output` with valid `type`
   - `value.estimate` — non-negative integer minutes (if value block exists)
   - Every `action` step's `tool` is listed in the definition's `tools:` allowlist
   - Every `agent` step's `tools` entries are listed in the definition's `tools:` allowlist, and `max_calls` stays within the schema ceiling
   - No memory-mutating tools (`memory_create_*`, `memory_update_*`, link/unlink) — rejected at parse, in action and agent steps alike

## Playbook runs but a step silently pauses

If a step has `approval: ask` (or the tool policy requires confirmation at
your trust level), the run **pauses** and queues a card in Plays → Queue —
this is the design, not a hang. Blocked runs (`state = blocked`, parked on a
connector failure) show the reason on the card; approve after reconnecting to
resume the exact pending call.

3. **Quote strings with colons:**

   ```yaml
   guidelines:
     - "Label format: Category/Name" # Always quote
   ```

4. **Test in the debug API:**
   ```bash
   curl http://localhost:3000/api/debug/playbooks | jq '.allErrors'
   ```

## Why This Happens

The discovery system uses Zod for schema validation. Invalid playbooks are collected in an `errors` array and surfaced two ways: the Playbooks tab warning banner (`discoveryIssues` on `PlaybookV2QueryResult`) for in-product visibility, and the debug endpoint for full depth. Broken playbooks still never crash the app or reach the executor — they're reported and excluded.

## Files

| File                                                   | Purpose                       |
| ------------------------------------------------------ | ----------------------------- |
| `app/_features/plays/playbooks/schema/v2/schema.ts`    | Zod schemas (source of truth) |
| `app/_features/plays/playbooks/schema/v2/discovery.ts` | Discovery logic               |
| `app/api/debug/playbooks/route.ts`                     | Debug endpoint                |
| `scripts/debug-playbook-discovery.ts`                  | CLI debug script              |
