---
name: brand-check
description: Run brand consistency checks, audits, or updates using the Brand Identity Steward
arguments:
  - name: action
    description: "What to do: 'check [content]', 'audit', 'update [feature]', 'research [type]'"
    required: true
---

# Brand Check Command

Run brand consistency checks, audits, or updates.

## Usage

```
/brand-check check "Your copy or content to review"
/brand-check audit
/brand-check update "Feature name that shipped"
/brand-check research "competitor|icp|market"
```

## Actions

### `check [content]`
Reviews content against brand guidelines.
- Checks foundation alignment (voice, values, audience)
- Checks positioning alignment
- Checks terminology
- Returns: APPROVED / APPROVED WITH CHANGES / NEEDS REVISION

### `audit`
Runs a full brand system audit.
- Checks all docs for freshness
- Verifies feature inventory accuracy
- Checks competitive landscape currency
- Returns: Health score + recommended actions

### `update [feature]`
Updates brand docs after a feature launch.
- Updates feature-inventory.md
- Updates roadmap.md
- Logs to changelog.md
- Checks for positioning impact

### `research [type]`
Integrates research findings into brand docs.
- Archives raw research
- Extracts insights
- Updates positioning if warranted
- Flags foundation changes for approval

## Examples

```
/brand-check check "Win $10k+ projects with AI-powered intelligence"
/brand-check audit
/brand-check update "Performance Monitoring Dashboard"
/brand-check research competitor
```

## Process

1. Spawn the `brand-identity-steward` agent
2. Agent reads relevant brand-identity docs
3. Agent performs requested action
4. Agent returns structured report

## Output Location

Results are returned directly. Significant changes are logged to:
`brand-identity/product/changelog.md`
