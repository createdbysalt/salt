# Authoring v2 Playbooks

The style guide for Salt-authored playbook packages. Read this before
writing or substantially editing a package. The exemplar is
`billing/invoice-reminder/` — when in doubt, copy its shape.

## The package contract

Every package is a directory under `v2/{section}/{slug}/`:

| File | Required | Purpose |
|------|----------|---------|
| `definition.yaml` | yes | The definition. One Zod schema (`PlaybookDefinitionV2`) validates it; the same schema validates workspace forks in `playbook_definitions`. |
| `PLAYBOOK.md` | yes* | Author-only doc: intent, decisions, edge cases. The user-facing Overview is **generated from the definition** — never put user-facing truth here. |
| `evals/` | yes* | Scenario fixtures run by the shared runner (`v2/evals.runner.test.ts`) against the real executor with vendor boundaries mocked. |

\* Enforced as warnings by `pnpm playbooks:validate` (fatal with `--strict`)
until the backfill lands; new packages must ship complete.

Scaffold the full contract with:

```bash
pnpm playbooks:new <section> <slug>
```

## Definition style

### Triggers

Three user-facing kinds, plus manual:

- `signal` — fires when Salt detects something (validated against the signal
  registry at parse time).
- `record_condition` — fires when a Memory record field matches a condition.
  Fields validate against the Memory field registry, so author with real
  registry keys (`relationshipType`) or dbColumns (`relationship_type`) —
  both resolve. Users edit these from the Overview tab; keep the condition
  legible ("a person's relationship type is client", not a compound
  expression).
- `schedule` — cron; prefer weekly patterns the Overview can render as
  weekday + time.

Declare user-tunable knobs in `settings` and list the trigger-facing ones in
`trigger.adjust`. Reference them as `{{settings.key}}` in prompts and
classify rules — never hardcode a threshold the owner might reasonably want
to change.

### Steps

- **Every step gets an `id`** — evals, skip traces, and the Overview's
  per-step autonomy all key on it.
- **`approval` is a product decision, not an afterthought.** `auto` for
  reads and drafts; `ask` for anything that touches the outside world. The
  earned-autonomy system can relax `ask` over time — you don't need to.
- Fetch from Memory (`memory.*`) when Salt already knows it; fetch from a
  connector only when the truth lives in the user's app. Memory fetches are
  free; connector fetches use only the apps the owner added for this play
  in Overview → What it needs (opt-in; new connections stay out until added).

### Tools

The `tools` allowlist is the consent contract — the UI renders it, the
executor enforces it, agent steps can call nothing outside it. Every slug
must exist in `app/_lib/composio/tool-slugs.ts` (the validator checks).
Memory-mutating tools are rejected outright; Memory Care owns Memory writes.

## Prompt style (agent and draft steps)

Step prompts follow Salt's prompt discipline:

1. **Explain the why, not just the what.** "Skip invoices Stripe
   auto-collects — a reminder would double-message the client" beats
   "NEVER remind auto-collect invoices." A model that understands the reason
   generalizes to cases you didn't enumerate; a model following bare MUSTs
   breaks on the first surprise.
2. **Imperative voice, one instruction per line.** Numbered verification
   steps read like a checklist because they are one.
3. **Explicit output contracts.** Agent steps that gate a branch end with a
   machine-checkable verdict line:

   ```
   End your answer with exactly one verdict line:
   "VERDICT: PROCEED — <amount remaining, days overdue, prior reminder date or none>"
   or
   "VERDICT: SKIP — <one-line reason>"
   ```

   The branch then tests `verify_unpaid.text ~= 'VERDICT: PROCEED'`. Free-form
   answers can't be branched on reliably; verdict lines can.
4. **Degrade toward the human.** When a lookup can fail (disconnected app,
   missing email), tell the agent what to do about it — invoice-reminder's
   "lean toward PROCEED — a human reviews every draft" turns a verification
   gap into a note for the approver instead of a silent skip or a crash.
5. **Realistic examples in `instructions.examples`.** Show the input sketch
   and the expected behavior, including escalation tiers. Examples carry
   tone better than adjectives do.

## Eval discipline

Evals are behavior tests that travel with the package. The runner executes
each scenario through the real executor with Composio, the LLM, and Memory
fetches mocked from your fixtures.

```yaml
id: skip-already-reminded
name: Stripe already reminded → quiet skip, no draft
given:
  memory:
    billing_record_context: { ... }
  agent:
    - step: verify_unpaid
      text: "VERDICT: SKIP — Stripe sent an automatic reminder 2 days ago"
expect:
  status: success      # branch not taken → no outputs
  outputCount: 0
  steps:
    verify_unpaid: success
```

- **Near-miss negatives are the point.** For every happy path, write the
  scenarios that should NOT produce work: already-reminded, partially-paid,
  auto-collect, no-email-on-file. A play that fires when it shouldn't is
  worse than one that doesn't fire.
- `given.agent` / `given.draft` responses are consumed in execution order;
  add `whenPromptContains` when a package has more than one agent or draft
  step and order is ambiguous. Unused responses fail the scenario — a step
  that never ran is a bug in the fixture or the play.
- Assert `pausedOnTool` for approval gates, not the reason string.
- `given.settings` overrides must reference declared settings keys — the
  validator rejects typos.

Run them:

```bash
pnpm test -- evals.runner     # all package evals
pnpm playbooks:validate       # schema + authoring lint, all packages
```

## When a pattern becomes a capability

Before writing clever prompt logic, decide where the behavior belongs:

| Pattern | Lives in |
|---------|----------|
| Deterministic, testable, reusable across plays (opt-in app selection, cooldowns, verdict parsing) | **Executor capability** — propose it; don't prompt around its absence |
| Judgment call specific to this play's domain (tone tiers, escalation, verification policy) | **Step prompt** — with the why explained |
| Deterministic but too specialized to generalize (a bespoke transformation no other play needs) | **Package script** (`scripts/run.ts`) — rare; prefer the first two |

If two plays need the same prompt hack, that's the signal it should have
been an executor capability.

## Explicitly not our model

- **No description-optimization loop.** Our triggers are deterministic
  (signals, conditions, cron), not model judgment — there's nothing to
  optimize.
- **No `.skill`-style packaging.** The filesystem package is the authoring
  format; fork-on-edit into `playbook_definitions` is the runtime packaging.
