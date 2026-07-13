# Merge Rules

How records are combined when duplicates are merged.

## Winner Selection

The "winner" is the record that survives. The "loser" is archived after merge.

Selection priority:
1. **Field completeness** — More non-empty fields wins
2. **Recent activity** — More recent `updated_at` wins
3. **Billing history** — More linked billing records wins
4. **Creation date** — Tie-breaker: older record wins (was there first)

## Field Merge Policies

### Identifiers (keep all)

Fields: `email`, `phone`, `domain`, `billing_email`

- All values are preserved
- Primary identifier comes from winner
- Additional identifiers stored as alternates

Example:
```
Winner: email = "john@acme.com"
Loser:  email = "j.smith@acme.com"
Result: email = "john@acme.com", alternate_emails = ["j.smith@acme.com"]
```

### Names (keep longer)

Fields: `name`, `display_name`

- More complete name wins
- "John R. Smith" beats "John Smith"
- "Acme Corporation" beats "Acme"

### Relationship Type (keep higher)

Fields: `relationship_type`, `relationship_status`

Hierarchy (highest first):
1. client
2. prospect
3. partner
4. vendor
5. team
6. personal
7. unknown

If loser has higher relationship type, it wins for this field only.

### Addresses (keep recent non-empty)

Fields: `address_line1`, `city`, `state`, `postal_code`, `country`

- Most recently updated non-empty value wins
- Addresses are kept as a unit (don't mix city from A with state from B)

### Notes (concatenate)

Fields: `notes`, `description`

- Both values are preserved
- Separated by `\n\n---\n\n`
- Winner's notes come first

Example:
```
Winner: notes = "Met at conference"
Loser:  notes = "Prefers email"
Result: notes = "Met at conference\n\n---\n\nPrefers email"
```

### Linked Records (migrate all)

Fields: `billing_records`, `entity_links`, `activity`, `files`

- All linked records move to winner
- Duplicate links are removed
- Activity history is combined chronologically

### Financial Fields (keep winner)

Fields: `contract_value_cents`, `payment_terms`, `currency`

- Winner's values are kept
- Loser's values are noted in merge provenance

## Post-Merge

After merge completes:
1. Loser record is archived (soft delete)
2. All references to loser are updated to point to winner
3. Merge event is logged in winner's activity
4. Provenance record is created with merge details

## Conflict Resolution

If fields conflict and policy doesn't resolve:
1. Both values are shown to operator
2. Operator chooses which to keep
3. Decision is logged in provenance

## Undo

Merges can be undone within 30 days:
1. Loser is restored from archive
2. Migrated records are moved back
3. Winner's notes are split
4. Undo event is logged
