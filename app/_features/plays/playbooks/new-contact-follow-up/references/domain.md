# New Contact Follow Up Domain Reference

## Entity

Replace with the record, workflow, or object this playbook owns.

## Fields It Can Read

- Replace with fields and sources.

## Fields It Can Write

- Replace with fields, allowed values, and review boundaries.

## Create vs Update Policy

- Create when...
- Update when...
- Skip when...
- Ask when...

## Admission Policy

- Qualifies as a durable record when...
- Does not qualify when...
- Waits for review when...
- Never create from...

## Entity Taxonomy

- Person:
- Organization:
- Team inbox or shared alias:
- System sender:
- Newsletter or marketing sender:
- Scam/spam/suspicious sender:
- Source artifact only:

## Identity Resolution And Dedupe

- Update existing record when...
- Create new record when...
- Suggest merge when...
- Never auto-merge when...

## Field Completion Matrix

| Section | Trusted sources | Auto-fill | Ask first | Never fill from |
|---------|-----------------|-----------|-----------|-----------------|
| Example | Example source | Example policy | Example boundary | Example exclusion |

## Signals

- Replace with signals and derivation.

## Context Budget

### Connected tools

- Required:
- Optional:
- Ignored:

### Memory scope

- Entity anchor:
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me
- Relation filters:
- Time window:
- Max records:
- Ranking:

### Operating surfaces

- Spaces:
- Connections:
- Visibility or approval boundary:
- Trigger scope:

### Time

- Trigger schedule/deadline/elapsed-time rule:
- Lookback/lookahead window:
- Timezone/business-day assumption:
- Recency or staleness rule:

### LLM context

- Facts passed:
- Facts excluded:
- Max input paths:

### Degradation

- If a required source is missing:
- If optional sources are missing:
- If too many records match:
- If evidence conflicts:

## Decision Order

1. Replace with the first decision.

## Negative Examples

- Replace with a case that should be skipped.
- Replace with a case that should become another entity type.
- Replace with a case that should wait for review.

## Confidence Policy

Replace with auto-apply vs review policy.

## Provenance

Replace with what Salt records.
