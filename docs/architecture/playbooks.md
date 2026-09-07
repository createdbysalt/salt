# Playbooks Reference

> **Playbooks are reusable act-layer orchestration that respond to signals using tools.**

Playbooks are the "brain" of Salt's proactive **actions**. Each is a directory package with a declarative `definition.yaml` that the v2 executor runs step by step. Playbooks are **pure orchestration** — they never write Memory; that's Memory Care's job, and the monopoly is enforced structurally (parse + runtime).

**Learn-layer Memory enrichment is not a playbook.** It lives in [Memory Care](memory-care.md) (`app/_features/memory/care/`). Do not add new `learn`-layer packages.

---

## Canon

1. **A play is a playbook run.** Every `play_runs` row is attributed via `source_context.playbook_slug` — single writer: `createPlayRecord` (`app/_features/plays/lib/play-record.ts`).
2. **One executor.** Signal, schedule, and manual triggers all run through `executePlaybookV2` (`playbooks/schema/v2/executor.ts`). There is no separate signal path that inserts bare rows.
3. **Per-step gates.** Approval is declared per step (`approval: auto | ask`), checked against the workspace trust level, tool policy, and earned autonomy at runtime.
4. **Completed run = billing unit.** A run that reaches `state = ran` is what stats, billing, and the HQ widget all count.

---

## Playbook Structure

```
app/_features/plays/playbooks/v2/{section}/{slug}/
├── definition.yaml       # The whole definition: trigger, steps, tools allowlist, output, value
└── PLAYBOOK.md           # Human-facing docs, rendered on the detail page
```

There is no `scripts/run.ts` and no `tools.yaml` — execution is the declarative `steps:` array, and tools are declared in `definition.yaml` (validated at parse: every action step must name a declared tool).

---

## definition.yaml Schema

```yaml
name: Invoice Reminder
slug: invoice-reminder
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing # relationships|work|billing|resources|meetings|me|connections|notes|communication
layer: act # act only — learn-layer is Memory Care
voice: billing # Required for act-layer

trigger:
  type: signal # signal | schedule | manual
  signal: billing_due_date_passed

# Tool allowlist — action steps may only use tools declared here
tools:
  - GMAIL_CREATE_EMAIL_DRAFT

requirements:
  categories:
    required: [billing] # Category must be connected AND at least one app selected (Overview → What it needs)

steps:
  - step: fetch # fetch | classify | draft | action | agent | branch
    id: invoices
    from: billing.read_invoices
  - step: classify
    id: overdue
    forEach: invoices
    rules:
      - if: "days_overdue > 7"
        then: overdue
    else: current
  - step: draft
    id: reminder
    prompt: |
      Draft a payment reminder for {{overdue.client_name}}...
  - step: action
    id: create_draft
    tool: GMAIL_CREATE_EMAIL_DRAFT
    args:
      recipient_email: "{{overdue.client_email}}"
      body: "{{reminder}}"
    approval: ask # auto | ask — pauses for the queue when ask

output:
  type: email_draft # email_draft | notification | finding | briefing
  approval: ask

value:
  kind: invoice_collected
  estimate: 10 # minutes of manual work saved per completed run
```

**Value model:** `value.estimate` is **minutes saved per completed run** — it feeds hero-card and HQ "time saved" stats (Phase 5b). Not dollars.

**Step types:**

| Step       | Does                                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| `fetch`    | Reads data (`{category}.{capability}`, `capture.*`, `memory.*`) into `stepData`    |
| `classify` | `forEach` over a fetched list, first-match rules → tagged entities                 |
| `draft`    | LLM prompt → text; `forEach: <list>` runs per item with `{{item.*}}` interpolation |
| `action`   | Executes a declared tool; `approval: ask` pauses the run for the queue             |
| `agent`    | Bounded tool-calling LLM loop: `prompt` + step-level `tools` allowlist, capped by `max_calls`; every call validated against hydrated schemas and routed through the Composio gate (denials feed back to the model as tool errors — no mid-loop pause) |
| `branch`   | Conditional `if` over `stepData`, contains nested steps                            |

**Agent step example** (see `v2/billing/payment-reconciliation/definition.yaml` for the shipped reference):

```yaml
  - step: agent
    id: reconciliation
    prompt: |
      Cross-check the most recent payment against charges and invoices...
    tools: # subset of the definition's tools: allowlist
      - STRIPE_LIST_CHARGES
      - STRIPE_LIST_INVOICES
    max_calls: 4
```

---

## Fresh Context (schemas & docs)

The model never guesses tool arguments:

- **Schema hydration** — at execution start, every slug in `tools:` is hydrated from the synced Composio schema (`schema-hydration.ts`); the pinned Zod in `tool-policy.ts` is the validation fallback, not the source of truth. Each run records `schema_hashes` in `play_runs.metadata` (with `playbook_version`) for audit and drift detection.
- **Tool docs** — the `tool_docs` cache table (slug → vendor doc snippets, ~7d TTL) injects vendor documentation into draft/agent prompts when a step uses that tool.
- **Toolkit browser** — the Create Playbook button opens a live browser (connected apps → approved actions → compact schemas) over the same classification store; groundwork for user-authored playbooks.

---

## Approval & Autonomy

- **`approval: auto | ask` on every step.** `ask` pauses the run (`paused_for_approval`) and queues a card with the pending tool call; approving executes exactly that call.
- **Output approval** mirrors the same vocabulary (`none`/`per_entity`/`batch` normalize to `auto`/`ask` at parse).
- **Trust level** (`read_only` → `act_with_approval` → `trust`) tightens or loosens what `auto` may do; high-risk tools always require confirmation.
- **Earned autonomy** is offer-first: after enough approvals of the same action, the user gets a queued offer card to grant autonomy for that playbook+tool — revocable anytime in Settings → Plays. Dismissals count too: `playbook_action_approvals` tracks `dismissed_count` alongside `approved_count`, and the approval rate (`approved / (approved + dismissed)`) gates offers — a step dismissed more often than approved is never offered automation. Per-playbook rates surface as a "Your history with this play" card on the detail page (`getPlaybookApprovalRates`).
- **Park-and-resume**: a connector failure (`ConnectorUnavailableError`) sets the run to `blocked` with the pending call preserved; the queue card shows the reason and approval resumes the exact step after reconnect.

---

## Dispatch & Dedup

```typescript
// Signal path (all surfaces): capture/services/play-triggers.ts → trigger-dispatch.ts
await dispatchSignalTrigger({
  workspaceId,
  signalKey: "billing_payment_matched",
  entityId: billingRecordId,
  entitySurface: "billing",
  entityLabel: "Invoice #1234",
  evidence: { amount: 2500 },
});
```

- Matching playbooks run through `executePlaybookV2` with entity context.
- **Dedup:** one run per playbook + entity + signal per 72h. Workspace-scoped signals (e.g. `connector_connected`) use the workspace id as `entityId` — once per workspace per window.
- **Metering:** runs record to the usage ledger; runs that execute an `external_effect` tool bill as a play.

---

## Opt-in apps (What it needs)

A playbook declares **categories** (`requirements.categories`). The owner then explicitly adds which connected apps that play may use (Overview → What it needs → `app_selections`). New connections stay out until added.

- Empty/missing selections → the play skips ("No apps added for this play") rather than fanning out to every connected provider.
- The executor still filters via `excludedProviders`, computed as connected providers minus selections.
- Playbooks with required categories and zero selected apps show a **Needs an app** badge on the list card.

---

## Memory Monopoly

No playbook may mutate Memory. `memory_*` mutating slugs are rejected at **parse time** (parser, including branch-nested steps) and again at **runtime** in the executor's action step (`playbooks/memory-monopoly.ts`). Memory reads (`memory.find_*` fetch steps) are fine. Ask Salt's chat `memory_*` plays are the human-in-chat path, not playbooks, and are unaffected.

---

## Run Stats (Phase 5b)

One source of truth: `getPlaybookRunStats(slug)` / `getWorkspaceRunStats()` in `app/_features/plays/queries.ts`, pure math in `plays/run-stats.ts`.

- **Runs this week** = completed runs (`state = ran`) in the trailing 7 days
- **Runtime** = median executor `duration_ms` (recorded in `activity_entries` metadata)
- **Time saved** = `value.estimate` minutes × completed runs

The playbook hero cards and the HQ Today widget both read these queries.

---

## Storage-Agnostic Definitions

Playbook definitions live in the repo (Salt-authored pre-mades) or in the `playbook_definitions` table (user-authored, workspace-owned `jsonb` of the same `PlaybookDefinitionV2`). Landed groundwork (2026-08-29): the table + RLS, a Zod-validated single writer (`savePlaybookDefinition` / `savePlaybookDefinitionAction`), a re-validating read path, and the library merge in `getPlaybooksV2ForWorkspace` (workspace rows shadow repo slugs, origin `custom`). Still pending: async workspace-aware discovery so DB definitions fire via signal dispatch/cron, and the authoring UI. Design: `docs/plans/2026-08-08-playbook-definitions-storage.md`.

---

## Creating a New Playbook

1. Create `app/_features/plays/playbooks/v2/{section}/{slug}/definition.yaml`
2. Declare `tools:` and write `steps:` (fetch → classify → draft → action)
3. Add `PLAYBOOK.md` (rendered on the detail page)
4. Parse-time validation runs automatically at discovery: signal keys, section metadata, tool allowlist, memory monopoly
5. Add a co-located unit test that parses the definition (see existing `*.test.ts` in `v2/`)

If a playbook doesn't load, the Playbooks tab banner says why — see [Playbook Troubleshooting](../guides/playbook-troubleshooting.md) for the common validation errors and the debug endpoint.

---

## See Also

- [Primitives Overview](primitives.md) — How playbooks fit in the architecture
- [Memory Care](memory-care.md) — Learn-layer enrichment (not playbooks)
- [Signals Reference](signals.md) — What triggers playbooks
- [Tools Reference](tools.md) — What playbooks use
- [Playbook Schema v2](../../app/_features/plays/playbooks/schema/v2/CLAUDE.md) — YAML schema details
- Plays canonical plan: `.cursor/plans/2026-08-07-plays-canonical.md` (2026-08 canon rebuild, Phases 1–7)
