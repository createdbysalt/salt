# Playbook Formula

**Date:** 2026-06-20  
**Status:** Approved architecture  
**Related:** [Plays Wave 2 acting engine](../../.cursor/plans/2026-06-12-plays-wave-2-acting-engine.md), [play-definition.ts](../../app/_features/plays/utils/play-definition.ts)

## Purpose

A **Playbook** is Salt's repeatable recipe for prepared work — the product-facing name for a compiled `play_template`. Playbooks give consistency: the same steps run the same way every time, with human approval at the boundary, and improvements that are versioned and benchmark-gated.

This document is the contract for authoring, compiling, adopting, running, and improving playbooks.

> **Attribution:** Lifecycle and eval methodology inspired by [Anthropic's Apache-2.0 skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator). Salt implements its own schema and runtime; no Anthropic source is copied.

## Concepts (do not confuse)

| Concept | What it is | Table / code |
|---------|------------|----------------|
| **System play** | Atomic Memory operation (create person, link org, …) | `system_plays`, `executeSystemPlay()` |
| **Playbook blueprint** | Global, Salt-authored, versioned recipe | `playbook_blueprints` |
| **Play template** | Workspace-adopted instance of a blueprint | `play_templates` |
| **Play run** | One queue item / one approval boundary | `play_runs`, `executePlayRun()` |
| **Player** | AI work role that owns/default-attributed playbooks | `players` |

**System plays** mutate Memory directly (no approval queue). **Playbooks** compose external actions (Gmail draft, Stripe read, …) through the acting engine with consent and approval.

## Anatomy (dual layer)

Every playbook has two layers — same pattern as a Claude skill (`SKILL.md` + bundled scripts):

| Layer | Field | Audience | Purpose |
|-------|-------|----------|---------|
| **Identity** | slug, name, `player_slug`, description, `when_to_use`, trigger | Human + routing | When Salt should use this recipe |
| **Procedure** | `procedure_md` | Human (default UI) | Plain-language steps and reasoning |
| **Definition** | `definition` JSON | Machine | Compiled step DSL (`fetch` → `guard` → `render` → `llm` → `act`) |
| **Consent** | `required_actions`, approval behavior | Trust | Which Composio slugs must be pre-approved |
| **Value** | `value_model` | Metering | What outcome this play claims |

Progressive disclosure in UI: **card metadata → readable steps → Advanced (definition JSON)**.

## Authoring format (`playbook.md`)

Source of truth lives in git under `app/_features/plays/playbooks/<slug>/`:

```
app/_features/plays/playbooks/
├── quiet-lead-nudge/
│   ├── playbook.md      # frontmatter + procedure + definition fence
│   └── evals.json       # regression suite
├── overdue-invoice-reminder/
└── meeting-recap/
```

### Frontmatter (YAML)

```yaml
---
slug: quiet-lead-nudge
name: Quiet Lead Nudge
player_slug: follow-up
description: Revive a quiet lead with a personalized follow-up draft.
when_to_use: >
  Use when a person has gone silent after a promised next step or open
  thread. Proactively suggest when Capture shows no response for 14+ days.
trigger:
  type: pattern
  signal: no_response
  min_days_since_contact: 14
consent:
  approval_required: true
value:
  kind: gap_closed
  fromGap: true
---
```

### Body

Markdown sections: **What this does**, **When it runs**, **Steps** (numbered, explain *why* not just *what*), **What you approve**.

Avoid rigid ALL-CAPS MUSTs; explain reasoning so personalization steps stay grounded.

### Definition fence

Fenced JSON block validated by [`validatePlayDefinition`](../../app/_features/plays/utils/play-definition.ts):

```json
{
  "version": 1,
  "steps": [
    { "kind": "fetch", "tool": "GMAIL_FETCH_EMAILS", "params": {}, "bind": "thread" },
    { "kind": "guard", "path": "thread.days_since_reply", "op": "gte", "value": 14 },
    { "kind": "render", "template": "Hi {{run.recipient_label}}, …", "bind": "body" },
    { "kind": "act", "tool": "GMAIL_CREATE_EMAIL_DRAFT", "params": { "body": "{{body}}" } }
  ],
  "value": { "kind": "gap_closed", "fromGap": true }
}
```

**Compile-time rules:**

- Tool slugs are **fixed** at compile time; runtime LLM never chooses actions.
- `fetch` steps may only use `read` tools.
- `act` steps may not use `destructive` tools.
- Guards fail closed (missing values → skip/dismiss).
- Max 10 linear steps (no branching DSL).

## Lifecycle

```mermaid
flowchart LR
  intent["Capture intent"] --> draft["Draft playbook.md"]
  draft --> test["Author evals.json"]
  test --> bench["bench-playbooks.ts"]
  bench -->|pass| compile["compile-playbooks.ts → seed"]
  compile --> registry["playbook_blueprints"]
  registry --> adopt["adoptBlueprint → play_templates"]
  adopt --> run["play_runs → executePlayRun"]
  run --> signals["learning signals"]
  signals --> proposal["improvement proposal"]
  proposal --> bench
```

### Commands

```bash
pnpm playbooks:bench    # Run eval suite against authored playbooks
pnpm playbooks:compile  # Validate + emit blueprint seed SQL
```

A blueprint version cannot be marked `active` unless it passes its eval suite.

## Eval harness

Each playbook ships with `evals.json`:

```json
{
  "playbook_slug": "quiet-lead-nudge",
  "evals": [
    {
      "id": "stale-thread-drafts",
      "name": "Drafts when thread is stale",
      "input": {
        "run": { "recipient_label": "Alex", "title": "Follow up" },
        "thread": { "days_since_reply": 21 }
      },
      "mocks": {
        "GMAIL_FETCH_EMAILS": { "days_since_reply": 21 }
      },
      "assertions": [
        { "type": "bound_contains", "bind": "body", "substring": "Alex" },
        { "type": "act_executed", "tool": "GMAIL_CREATE_EMAIL_DRAFT" }
      ]
    }
  ]
}
```

**Edge cases become permanent tests:** when a real run fails, is heavily edited, or a guard misfires, promote the scenario into `evals.json` with `"origin": "from_edge_case"`.

## Learning loop (human-approved, benchmark-gated)

1. **Capture signals** on edit, dismiss, failure, guard-skip (`playbook_learning_signals`).
2. **Synthesize proposal** from accumulated signals (`playbook_improvement_proposals`).
3. **Benchmark gate:** auto-run proposed definition against full eval suite; only improvements that hold or beat current score reach the user.
4. **Approve:** bumps `playbook_blueprints.version`, archives prior row in `playbook_blueprint_versions`.

Never auto-apply playbook changes without human approval.

## Adoption (hybrid model)

- **Blueprints** are global, Salt-authored (`playbook_blueprints`).
- **Templates** are per-workspace copies (`play_templates` + `blueprint_slug`, `blueprint_version`).
- Users adopt via `adoptBlueprint(slug)`; workspace may tune `procedure_md` locally but `definition` changes should flow from approved blueprint upgrades.

## Consent and trust

- Mutating `act` slugs populate `required_actions` at compile time.
- Execution requires `approved_actions` + `actions_approved_by` on the template (Wave 2 acting engine).
- Workspace trust level `act_with_approval` required for acting steps.

## Files

| Path | Role |
|------|------|
| `app/_features/plays/playbooks/` | Authoring source + evals |
| `app/_features/plays/playbooks/types.ts` | Shared types |
| `app/_features/plays/playbooks/parse-playbook.ts` | Parse `playbook.md` |
| `app/_features/plays/playbooks/eval-runner.ts` | Mocked definition runner + assertions |
| `app/_features/plays/playbooks/learning/` | Signal capture + proposal synthesis |
| `scripts/compile-playbooks.ts` | Author → validated seed |
| `scripts/bench-playbooks.ts` | Eval benchmark runner |
| `supabase/migrations/*_playbook_blueprints.sql` | Registry + learning tables |
| `app/_features/plays/playbooks/memory-monopoly.ts` | Memory-write constraint enforcement |

## Two-Pipeline Reality (Compiled vs Keeper-Seeded)

Salt maintains **two playbook pipelines** by design:

### Compiled Playbooks (Acting)

Standard path for most playbooks:

1. Author `playbook.md` in `app/_features/plays/playbooks/<slug>/`
2. Create `evals.json` with test cases
3. Run `pnpm playbooks:compile` — validates definition, runs evals, emits seed migration
4. Seed migration UPSERTS into `playbook_blueprints`

**Discovered by:** `discoverPlaybookDirs()` — excludes `keeper-*` prefixes.

### Keeper Playbooks (Profile, Policy-in-Markdown)

Separate path for Memory record policies:

1. Author `playbook.md` in `app/_features/plays/playbooks/keeper-<surface>/`
2. Policy lives in `procedure_md` (no definition JSON required)
3. Optionally include `fill_rules` JSON for rule-based field completion
4. **Manually** write a seed migration to UPSERT the row
5. Run `pnpm playbooks:compile` — validates frontmatter + fill_rules (if present), does NOT emit seed

**Discovered by:** `discoverKeeperPlaybookDirs()` — includes only `keeper-*` prefixes.

### Why the Split?

- Keeper playbooks are **policy documents** consumed by the records engine, not step-based procedures
- They define admission rules, taxonomy, field-completion logic — concepts that don't fit the acting DSL
- Manual seeding gives precise control over migration ordering (keepers must exist before adoption)
- Validation runs on both pipelines; compilation (seed generation) runs only on acting playbooks

### Authoring Decision Tree

```
Is your playbook for Memory record management?
├── Yes → Is it the Keeper player?
│   ├── Yes → keeper-* directory, manual seed, policy-in-markdown ✓
│   └── No → FORBIDDEN (Memory-monopoly constraint)
└── No → standard playbook directory, compiled seed ✓
```

## Memory-Monopoly Constraint

**Invariant:** Only Keeper-player playbooks may mutate Memory records.

### Mutating Slugs (Denylist)

These action slugs are reserved for Keeper playbooks only:

| Category | Slugs |
|----------|-------|
| Person | `memory_create_person`, `memory_update_person`, `memory_archive_person`, `memory_classify_person` |
| Org | `memory_create_org`, `memory_update_org`, `memory_archive_org` |
| Work | `memory_create_work`, `memory_update_work`, `memory_archive_work` |
| Links | `memory_link_*`, `memory_unlink_*` (all variants) |
| Notes/Meetings | `memory_create_note`, `memory_create_meeting` |

### Enforcement Layers

1. **Parse-time** (`parse-playbook.ts`): Non-keeper playbooks with memory-mutating `act` slugs fail to parse
2. **Runtime** (`run-play.ts`): Defense-in-depth backstop refuses execution even if a definition bypasses parse

### Exception

Ask SALT's chat `memory_*` system plays are the **human-in-chat path** — they execute via `executeSystemPlay()`, not the playbook engine, and are unaffected by this constraint.

### Rationale

- Single records pipeline: provenance, admission rules, and consistency live in one place
- Structural guardrail for user-created (General player) playbooks
- Outcomes that should update records emit signals/captures for Keeper to process
