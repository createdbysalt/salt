---
name: playbook-creator
description: >-
  Author, evaluate, and improve Salt playbooks. Use whenever creating or
  editing a playbook.md, writing PlayDefinition steps, authoring profile
  fill_rules, adding evals.json, improving trigger/when_to_use, calibrating
  confidence, choosing model slots, or making a playbook comprehensive enough
  to own its operational domain. This skill should trigger even when the user
  says "recipe", "automation", "keeper", "play", "rules", "workflow", or asks
  how Salt should do something reliably.
disable-model-invocation: true
---

# Playbook Creator

This is Salt's skill-creator-style authoring engine for playbooks. Its job is not one-shot generation. Its job is to help produce playbooks that are comprehensive, validated, benchmarked, and good enough that Salt can trust them.

A good playbook owns its operational domain:

- **Knowledge** - what entity/workflow it touches and what facts matter.
- **Policy** - when to create, update, apply, wait, skip, or ask.
- **Procedure** - how it turns inputs into a result.
- **Resources** - references, scripts, and assets that prevent repeated guesswork.
- **Proof** - evals and benchmark results.

The typed Salt engine remains the safe primitive for schema validation, tool policy, RLS, and writes. The playbook owns the know-how; the engine executes safely.

## Start Here

First determine where the user is in the loop:

1. **Intent capture** - they know the outcome but not the artifact.
2. **Drafting** - they need `playbook.md`, JSON, and evals.
3. **Improvement** - they have a playbook that feels thin or fails.
4. **Benchmarking** - they need validation and pass-rate.
5. **Trigger tuning** - the playbook exists but fires at the wrong time.

Do the next useful step. If the request is broad, start with intent capture and domain ownership. If the playbook already exists, read it first and evaluate against the rubric.

## Read References As Needed

Read these files instead of keeping everything in the main skill:

- `references/quality.md` - the passing rubric and eval quality bar.
- `references/domain-ownership.md` - how to make a playbook own its operational space.
- `references/schema.md` - frontmatter, `PlayDefinition`, `fill_rules`, evals, and artifact shape.
- `references/model-routing.md` - Salt-curated model slots and client-facing copy rules.
- `references/context-scaling.md` - connected-tool and `/memory` retrieval budgets.
- `references/examples.md` - strong vs weak examples.

Use `scripts/validate.ts` and `scripts/benchmark.ts` after drafting or changing artifacts. Use `scripts/scaffold.ts` when starting a new playbook.

## The Creator Loop

Use this loop every time:

1. **Capture intent**
   - Outcome: what should Salt do?
   - Trigger: when should it run or propose?
   - Domain: what entity/workflow does it own?
   - Approval boundary: what applies automatically vs waits?
   - Value: what time, money, or risk does it improve?

2. **Research the domain**
   - Find the existing write path, entity fields, enums, validators, and UI surfaces.
   - Identify which parts are safe engine primitives and which parts must be authored as playbook knowledge.
   - For profile and records playbooks, identify lifecycle policy: admission, entity taxonomy, person-vs-organization distinction, system/scam exclusion, identity resolution, fields, signals, confidence policy, fallback behavior, and provenance.
   - Define the context budget: relevant connected tools, `/memory` scope, Spaces/Connections scope, entity anchors, time windows, result limits, ranking, and degradation behavior.

3. **Draft the artifact**
   - Create or update `playbook.md`.
   - Include complete frontmatter.
   - Write full `procedure_md` sections, including mandatory `## How it works`.
   - For records playbooks, include a Record Surface Ownership matrix that covers every visible and durable record surface.
   - Add one valid `json` block: `PlayDefinition` for acting, `fill_rules` for profile.
   - Add optional `references/`, `scripts/`, or `assets/` when they make the playbook more self-describing or repeatable.

4. **Write evals prompts-first**
   - Draft realistic cases before assertions.
   - Cover the highest-risk path, a normal path, and a boundary/negative case.
   - Then add objective, discriminating assertions.

5. **Validate and benchmark**
   - Run the validator.
   - Run the benchmark.
   - Treat failures as information about the playbook, not just tests to silence.

6. **Improve**
   - Generalize from failures.
   - Keep the playbook lean.
   - Explain the why instead of adding brittle rules.
   - Bundle deterministic helpers when the same work repeats.
   - Repeat until the rubric and benchmark are green.

7. **Tune triggering**
   - Strengthen `when_to_use` and `trigger`.
   - Add realistic should-trigger and should-not-trigger examples when needed.

## Required UI Coverage

The playbook detail page renders mostly authored fields. The creator must populate them:

- Hero name, description, kind, and player: frontmatter `name`, `description`, `kind`, `player_slug`.
- Overview tab: `procedure_md`.
- Sidebar "When it runs": `when_to_use` and `trigger`; include Spaces or Connections here when they scope when/where the playbook runs.
- Sidebar "What it uses" / connected apps / hero chips: `required_actions` derived from tool slugs in the definition; include Spaces, Connections, and memory/context surfaces here when they provide context.
- Rules tab for profile playbooks: `fill_rules`.
- Advanced tab: optional `scripts/`, `references/`, `assets`, plus raw rules JSON.

Sidebar items must earn their place:

- **When it runs** should show the trigger, qualifying signal, schedule/threshold, elapsed-time/deadline rule, Space/Connection scope, or manual start condition. Keep it to 2-4 items.
- **What it uses** should show sources that materially affect the decision/output: required tools, high-trust evidence, relevant `/memory` surfaces, Spaces/Connections, or bundled resources. Keep it to 3-6 grouped items.
- Exclude anything that does not change when the playbook runs, what it decides, who approves it, or why the user should trust it.

The creator must ensure `procedure_md` includes:

```markdown
# <Playbook Name>

## What this does

## When it runs

## How it works

## What you approve
```

For profile playbooks, add:

```markdown
## Workspace context
```

For records-style playbooks, also include:

```markdown
## Record lifecycle
```

If `## How it works` is missing or vague, the playbook is not complete. It should explain inputs/signals, admission, entity classification, identity resolution, derivation, decision order, confidence, fallback, conflicts, and provenance in user-facing language.

## Context Scaling

Playbooks must scale as users connect more tools and accumulate more `/memory`. Never author a playbook that assumes Salt can load every connected account or every memory record into context.

Each playbook should define:

- relevant tool families and the canonical signals they provide,
- optional vs required sources,
- `/memory` surfaces to retrieve from: people, orgs, work, files, billing, conversations, meetings, teams, and me,
- Spaces and Connections when they scope triggers, visibility, approvals, or relationship context,
- entity anchors such as person, organization, work item, file, invoice, conversation, meeting, team, or user/workspace profile,
- time triggers such as schedules, deadlines, elapsed time, quiet periods, and staleness thresholds,
- time windows and max records per source,
- ranking when too many records match,
- degradation when tools or memory are missing,
- conflict policy when durable memory disagrees with connected-tool evidence.

When this matters, add a `## Context Budget` section to the playbook's domain reference. Read `references/context-scaling.md` for the template.

### Evidence Groups vs App-Specific Plays

Default to capability groups in user-facing playbooks:

- communication sources, not Gmail,
- finance sources, not Stripe/Square,
- billing sources, not QuickBooks,
- scheduling sources, not Google Calendar,
- documents/files, not Drive/Dropbox/Notion, unless the specific app changes the behavior.

Name an app only when the playbook is explicitly about that app's native object model, permissions, actions, or user intent. Examples: "create a Stripe invoice", "sync a Notion database", "draft in Gmail", or "classify QuickBooks customers" can name the app. "A payment exists", "an invoice exists", "a reply thread exists", or "a contract file exists" should stay at the evidence-group level.

If a playbook names a specific app, document why the app matters in `## Context Budget`: required app, fallback sources, missing-app degradation, and whether equivalent apps can provide the same canonical signal.

## Acting Playbooks

Use `kind: acting` when the playbook fetches, reasons, renders, or acts.

The JSON block must be a `PlayDefinition`:

- 1-10 linear steps.
- `fetch` steps read only.
- `guard` steps fail closed.
- `llm` steps contain bounded judgment or copy.
- `render` steps format deterministic output.
- `act` steps use allowlisted non-destructive tools; mutating acts pair with approval.

Use `copyClientFacing` for text that may leave Salt. Use `playPersonalize` for internal summaries, extraction, classification, or scratch copy.

## Profile Playbooks

Use `kind: profile` when the playbook keeps records accurate.

The JSON block must be a `fill_rules` document for the fields the current engine can write. The playbook must still document the larger records policy even when the engine only supports a smaller write scope.

Every records-style profile playbook must define these layers:

1. **Admission** - what qualifies to become a durable record, what is skipped, and what waits for review.
2. **Entity taxonomy** - how Salt distinguishes a person from an organization, team inbox, system sender, source artifact, scam/spam, newsletter, or generic alias.
3. **Identity resolution** - when to update an existing record, suggest a merge, create a new record, or refuse to merge.
4. **Relationship or status classification** - how Salt labels the record once admitted.
5. **Record Surface Ownership** - every durable record surface labeled as write, suggest, read-only, or never-touch.
6. **Field completion** - how each visible section is filled, which sources are trusted, and which fields need review.
7. **Negative examples** - examples that must not create or update a record.

For records playbooks, default to auto-apply above the configured threshold for low-risk writable surfaces. Exceptions always wait for review even when evidence is strong:

- merges and identity unification,
- organization reassignment when a different organization is already set,
- archive, restore, inactive/active, or other high-impact record status changes,
- overwrites of user-authored content,
- subjective or client-facing summaries/notes.

Activity and audit history are a hard never-touch boundary. A records playbook may read activity, capture events, routing decisions, tool execution logs, finding history, and provenance history as evidence. It must not rewrite, delete, mutate, or re-state those historical events as if the event itself changed.

Current People Records policy owns the full durable person record, but the executable engine writes only the supported subset:

- `relationship_type`
- `title`
- `org_link`

For each rule:

- Use a stable `id`.
- Pick one field.
- Choose one signal condition.
- Set one value.
- Calibrate confidence against the default 85 auto-apply threshold.
- Write a short `because` line a user can understand.

Threshold mechanics are fixed regardless of the configured number:

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Equality passes. A rule at `85` applies when the threshold is `85`; the same rule waits when the threshold is `90`. Fallback inference uses the same comparison (`70` or `40` confidence). The threshold changes only `applied` vs `pending`; it does not change which rule matched, what value was selected, evidence, provenance, safety, or approval boundaries.

Every profile playbook should include threshold eval cases for below, equal, and above the configured threshold.

Every records-style profile playbook should also include admission/entity negative cases in its domain reference and eval plan, even if today's typed runner can only benchmark supported field writes. It may claim full record ownership as policy only when it includes a surface-by-surface ownership matrix and an executable-boundary note that says which surfaces the current engine can actually write.

## Evals

Create `evals.json` for every non-trivial playbook.

Good evals:

- Use realistic input.
- Check meaningful behavior.
- Fail when the playbook is lazy, vague, or unsafe.
- Include a normal case, a boundary case, and a negative/review case when possible.
- For records playbooks, cover at least one should-create/update case, one should-skip case, one person-vs-organization or system-sender case, and one dedupe/merge boundary in the eval plan. If the current runner cannot execute that layer yet, capture it in the domain reference as a required future benchmark.

Avoid assertions that only prove something exists. Prefer final field values, rendered content, guard behavior, or action boundaries.

For acting playbooks with `llm` steps, add `llmOutputs` in `evals.json` keyed by the step `bind`, then assert against rendered output. Do not count a prompt-echo from the default LLM stub as proof of behavior.

## Validation Commands

From the repo root:

```bash
pnpm exec tsx .cursor/skills/playbook-creator/scripts/validate.ts <slug-or-path>
pnpm exec tsx .cursor/skills/playbook-creator/scripts/benchmark.ts <slug-or-path>
```

For all authored playbooks:

```bash
pnpm playbooks:bench
```

## Scaffolding

For a new playbook:

```bash
pnpm exec tsx .cursor/skills/playbook-creator/scripts/scaffold.ts <slug> --kind acting --player brief
pnpm exec tsx .cursor/skills/playbook-creator/scripts/scaffold.ts <slug> --kind profile --player keeper
```

Scaffolded files are starters only. They do not pass the rubric until the domain reference, `How it works`, JSON, evals, and benchmark are complete.

## Review Checklist

Before calling a playbook done:

- Does it validate?
- Does it benchmark green?
- Does `## How it works` explain the real mechanism?
- Does it own the domain knowledge instead of depending on hidden code?
- For records playbooks, does it define admission, entity taxonomy, identity resolution, skip rules, Record Surface Ownership, and field completion?
- For records playbooks, does it mark Activity and audit history as never-touch evidence?
- Does it have a bounded connected-tool, `/memory`, Spaces, and Connections context strategy?
- Are triggers specific enough?
- Are approval boundaries clear?
- Are model slots routed by stakes?
- Are confidence scores calibrated?
- Are eval assertions discriminating?
- Are optional resources present when they reduce repeated work?

If the answer to any item is no, improve the playbook and rerun the loop.
