# Playbook Schemas

This reference summarizes the artifact shape the creator must produce. The source of truth remains the TypeScript validators:

- `app/_features/plays/utils/play-definition.ts`
- `app/_features/plays/playbooks/profile/validate-rules.ts`
- `app/_features/plays/playbooks/parse-playbook.ts`
- `app/_features/plays/playbooks/types.ts`

## Directory Shape

```text
app/_features/plays/playbooks/<slug>/
|-- playbook.md
|-- evals.json
|-- references/   # optional, loaded as advanced resources
|-- scripts/      # optional deterministic helpers
`-- assets/       # optional templates/files
```

Only `playbook.md` and `evals.json` are compiled into the current authored catalog. Optional resources are for ownership, advanced inspection, and future execution support.

## `playbook.md`

Required frontmatter:

```yaml
---
slug: people-profile
kind: profile
name: People Records
player_slug: keeper
description: One sentence.
when_to_use: |
  First line.
  Second line.
trigger:
  type: capture
  signal: person_resolved
consent:
  approval_required: false
---
```

Required markdown sections:

```markdown
# <Name>

## What this does

## When it runs

## How it works

## What you approve
```

Profile playbooks should include `## Workspace context`.

Then add exactly one fenced `json` block containing either a `PlayDefinition` (`kind: acting`) or a `ProfileFillRulesDocument` (`kind: profile`).

## Acting `PlayDefinition`

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "fetch",
      "tool": "TOOL_SLUG",
      "params": {},
      "bind": "toolResult"
    },
    {
      "kind": "llm",
      "purpose": "short_purpose",
      "modelSlot": "playPersonalize",
      "instructions": "Specific bounded instructions.",
      "inputs": ["toolResult.summary"],
      "maxTokens": 300,
      "bind": "draft"
    },
    {
      "kind": "render",
      "template": "{{draft}}",
      "bind": "message"
    }
  ],
  "value": {
    "kind": "time_saved",
    "amount": 15,
    "currency": "USD"
  }
}
```

Allowed step kinds:

- `fetch` - read-only allowlisted tool.
- `guard` - dot-path check; missing values fail closed.
- `llm` - bounded reasoning/copy step.
- `render` - deterministic template interpolation.
- `act` - allowlisted non-destructive action; mutating acts require approval.

Allowed model slots:

- `playPersonalize` - cheap/internal utility copy and extraction.
- `copyClientFacing` - premium slot for text a user may send to their clients.

## Profile `fill_rules`

`fill_rules` currently covers field-filling rules the typed profile engine can execute. It does not encode the whole records policy by itself.

Records playbooks must document broader ownership in `procedure_md` and `references/domain.md`: admission, person-vs-organization classification, duplicate resolution, scam/system-sender exclusion, full Record Surface Ownership, Activity/history never-touch boundaries, and the difference between policy-owned surfaces and executable-today fields.

The `fields` array below should list only executable fields. Do not add broad policy surfaces such as notes, summary, activity, or connections to `fill_rules` until the typed engine, provenance writer, UI, and evals support them.

```json
{
  "version": 1,
  "fields": ["relationship_type", "title", "org_link"],
  "rules": [
    {
      "id": "rel-payment-client",
      "field": "relationship_type",
      "when": { "signal": "has_payment_received", "op": "eq", "value": true },
      "set": { "value": "client" },
      "confidence": 95,
      "because": "A finance source shows they paid you"
    }
  ]
}
```

Allowed fields:

- `relationship_type`
- `title`
- `org_link`

Allowed relationship values:

- `client`
- `prospect`
- `team`
- `partner`
- `vendor`
- `personal`
- `unknown`

Allowed signal ops:

- `eq`
- `neq`
- `exists`
- `not_exists`
- `gte`

## `evals.json`

```json
{
  "playbook_slug": "<slug>",
  "evals": [
    {
      "id": "case-id",
      "name": "Readable description",
      "input": { "run": { "title": "..." } },
      "mocks": { "TOOL_SLUG": { "value": true } },
      "llmOutputs": { "draft": "Deterministic output for the llm step bound as draft." },
      "assertions": [
        { "type": "bound_contains", "bind": "message", "substring": "Deterministic output" },
        { "type": "no_act_executed" }
      ]
    }
  ]
}
```

Assertion types:

- `bound_contains`
- `bound_exists`
- `context_path_eq`
- `context_path_gte`
- `act_executed`
- `no_act_executed`
- `guard_skipped`
- `field_value_eq`
- `field_status_eq`
- `field_source_eq`
- `entity_classification_eq`
- `admission_decision_eq`

Use `field_value_eq`, `field_status_eq`, `field_source_eq`, `entity_classification_eq`, and `admission_decision_eq` for profile playbooks. Profile evals should prove the selected value, whether it applied or waited for review, whether the result came from a rule or fallback, and whether the record lifecycle policy admitted, skipped, routed, or held the incoming entity correctly. Use action and bound assertions for acting playbooks.

For acting playbooks with `llm` steps, set `llmOutputs` by step `bind` and assert against the rendered result. Without `llmOutputs`, the benchmark uses a default deterministic stub and should only be used for smoke tests.

## Artifact Shape For Future Proposals

The creator should always emit:

- `definition` or `fill_rules`
- `procedure_md`
- `when_to_use`
- `trigger`
- `required_actions` derived by validation
- `evals`
- benchmark result summary

That shape matches the learning/proposal pipeline so future approval surfaces can reuse the same artifact without rewriting it.
