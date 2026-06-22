# Playbook Quality Rubric

Use this rubric before a playbook is considered ready. A good playbook is not just valid JSON; it is a self-describing operating procedure with proof that it behaves correctly.

## Passing Bar

A playbook passes only when every item below is true:

- **Sharp trigger:** `when_to_use` and `trigger` name the exact moment Salt should propose or run the play. They should be specific enough that a near-miss does not fire.
- **Complete UI coverage:** every field rendered by the detail page is authored with care: frontmatter, `procedure_md`, `when_to_use`, `trigger`, required action slugs, profile `fill_rules`, and optional resources.
- **High-signal sidebar:** "When it runs" includes only trigger/scope conditions; "What it uses" includes only sources that materially affect decisions, output, approvals, or trust.
- **Explicit time policy:** time-based playbooks define schedule, elapsed-time, deadline, quiet-period, timezone, business-day, and lookback/lookahead assumptions clearly.
- **Owns the domain:** the playbook explains the operational space it touches: admission, entity taxonomy, fields, values, inputs, create-vs-update-skip policy, identity resolution, decision order, confidence, fallback, conflict handling, and provenance.
- **Complete records lifecycle:** profile/records playbooks define who qualifies as a durable record, who is ignored, how people differ from organizations/system senders/scammers/newsletters/aliases, when to update or merge, and how every visible field section is filled or held for review.
- **Record Surface Ownership:** records playbooks label every durable record surface as write, suggest, read-only, or never-touch, and distinguish policy-owned surfaces from executable-today fields.
- **Activity boundary:** records playbooks treat Activity, audit logs, raw capture history, routing history, tool execution history, finding history, and provenance history as evidence only. They never rewrite historical facts.
- **Bounded context:** the playbook defines a scalable retrieval strategy for connected tools, `/memory`, Spaces, and Connections: source scope, entity anchors, collaboration boundaries, time windows, result limits, ranking, degradation, and conflict policy.
- **Minimal correct steps:** acting playbooks use 1-10 linear steps. Each fetch, guard, llm, render, and act earns its place.
- **Safe by construction:** fetches are read-only; destructive actions are never used; mutating acts require approval unless the operation is already safely internal.
- **Strong llm instructions:** instructions are specific, bounded, and include only the context needed. Anything client-facing uses the curated client-facing routing slot.
- **Honest value model:** value estimates are grounded. Do not inflate time saved, revenue, or confidence to make the playbook look better.
- **Discriminating evals:** evals prove behavior that could otherwise fail. They are realistic and include assertions that distinguish a good run from a bad one.
- **Green benchmark:** the playbook validates, dry-runs, and passes all benchmark cases before it is considered done.

## Required Procedure Sections

Every `procedure_md` must include these sections:

```markdown
# <Playbook Name>

## What this does

## When it runs

## How it works

## What you approve
```

Profile playbooks should also include:

```markdown
## Workspace context
## Record lifecycle
```

`## How it works` is mandatory. It should explain inputs/signals, how each signal is derived, admission, entity classification, identity resolution, decision order, confidence, fallback behavior, conflict handling, and what gets recorded. If this section is thin, the playbook fails even if the JSON validates.

## Assertion Quality

Good assertions are objective and discriminating.

Good:

- A finance payment signal classifies a person as `client`.
- A workspace email domain classifies a person as `team`.
- A generic `noreply@` sender is skipped and does not become a person.
- A billing alias is treated as an organization contact point, not a human person.
- Same name with different org/domain waits for merge review.
- A play with no overdue invoice executes no email send.
- A rendered client-facing message contains the invoice amount and due date.
- An acting playbook supplies `llmOutputs` and asserts the rendered output, not the prompt text.

Weak:

- The output exists.
- The run contains the word "Salt".
- Any act executed.
- A rule has a confidence number.
- A bound contains text that only appears because the default LLM stub echoed the instructions.

If an assertion would pass for a lazy or broken playbook, rewrite it. Prefer assertions that check a meaningful bound value, a final field value, a guard skip, or the exact action boundary.

## Confidence Calibration

Profile rule confidence is authored policy, not a live probability model. Calibrate it against the default 85 auto-apply threshold and the fixed fallback baseline:

- **90-100:** hard evidence: payment, invoice, explicit workspace domain, verified system source.
- **85-89:** strong evidence that can auto-apply only when the cost of being wrong is low.
- **75-84:** plausible but soft evidence; usually review first.
- **40-70:** fallback-style inference; never present as deterministic.

Do not raise confidence just to cross the auto-apply threshold. If a rule is below 85, the right behavior may be to wait for review.

## Threshold Mechanics

The auto-apply threshold can be 85 or any other workspace setting. The pass rule is always:

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Important details:

- Equality passes. A rule with confidence `85` applies when the threshold is `85`.
- A higher threshold makes fewer rules auto-apply; a lower threshold makes more rules auto-apply.
- The threshold does not change rule order, rule matching, selected value, evidence, or provenance. It only changes the result status: `applied` vs `pending`.
- Fallback inference uses the same rule: `70 >= threshold` applies, otherwise waits; `40 >= threshold` applies only if the user intentionally sets a very low threshold.
- A missing resolved value still waits for review even if the rule confidence passes. Example: a title rule can match at `80`, but if `{{extracted_title}}` resolves to empty, the title result is `pending`.
- Thresholds never override safety. They do not allow destructive actions, bypass approval boundaries, or bypass RLS/tool policy.
- For records playbooks, auto-apply above threshold is the default for low-risk writable surfaces. Merges, identity unification, organization reassignment, record status changes, user-authored content, and subjective summaries/notes still wait for review.

Every profile playbook needs threshold evals:

- one case where confidence is below the threshold and should wait,
- one case where confidence equals the threshold and should apply,
- one case where confidence is above the threshold and should apply,
- one fallback case if fallback is enabled.

## Review Loop

Use the same loop every time:

1. Capture intent: outcome, trigger, entity, fields, approval boundary, and value claim.
2. Draft `playbook.md`: frontmatter, complete `procedure_md`, JSON definition or fill rules.
3. Draft eval prompts first, then assertions.
4. Validate and benchmark.
5. Read failures and improve the general rule, not just the one case.
6. Repeat until validation, benchmark, and human review are all green.

## Failure Modes

Reject or revise a playbook when:

- It describes what Salt does but not how it decides.
- It assumes a record already exists and never says whether the incoming thing should become a person, organization, alias, source artifact, or nothing.
- It has no policy for scammers, newsletters, automated senders, generic inboxes, or thin one-off contacts.
- It has no Record Surface Ownership matrix.
- It claims to edit Activity, audit history, raw capture history, tool execution history, finding history, or provenance history.
- It silently rewrites user-authored notes, names, summaries, or other user-corrected content.
- It fills a field but does not define where that field's value is allowed to come from.
- It can only work because hidden code knowledge fills in missing instructions.
- It has no eval for the riskiest branch.
- It uses generic app labels because tool slugs are unmapped.
- It dumps every possible source into "What it uses" or lists sources under "When it runs" that are not actually triggers.
- It requires the user to understand JSON to trust it.
- It overclaims value or hides review boundaries.
- It uses vague time words like "recently", "soon", or "stale" without a concrete window or boundary.
- It assumes Salt can load every connected tool or every `/memory` record.
- It treats Spaces or Connections as memory instead of separate operating surfaces.
- It does not say what happens when relevant memory is missing, stale, duplicated, or conflicts with connected-tool evidence.
