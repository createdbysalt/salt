# Lead Follow-Up — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

Acts at the moment a lead appears — a new person record triggers
verification and a drafted first follow-up. Speed-to-lead is the value:
the draft exists before the owner even sees the inquiry.

## Decisions

- **Trigger is `person_created`, not a lead-only signal.** Memory has no
  "lead created" signal, so the agent step owns the filtering — the
  verdict contract keeps non-leads (clients, vendors, personal contacts)
  from ever producing a draft. This mirrors invoice-reminder's
  verify-before-draft shape.
- **Distinct from `follow-up`.** The existing Follow-up playbook
  re-engages quiet contacts (`person_no_contact_30_days`); this one is
  the first touch on arrival. Different moment, different tone, no overlap
  in triggers.
- **Send is `approval: ask`.** First impressions are the highest-stakes
  email a solo operator sends; earned autonomy can relax this over time,
  but the shipped default always waits for the human.
- **Warmth classify is deliberately thin** (calendar meeting → hot, else
  warm). Richer scoring belongs in Memory Care enrichment, not in a
  playbook prompt.

## Edge cases

- **Owner already replied** (common — the record is created from the
  thread after the reply): inbox check catches it → SKIP.
- **No email on file**: SKIP with the reason stated, never a draft to
  nowhere.
- **Vendor/personal domains**: the agent skips obvious non-buyers; when
  unsure it proceeds — the human review is the safety net.
- **Double-fire on re-import**: the cooldown check on sent mail catches
  records recreated by a re-import.

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| new-lead | no | Happy path: verified lead → warm draft paused on send |
| already-replied | yes | Owner already in thread → quiet skip, no draft |
| vendor-domain | yes | Non-buyer record → quiet skip, no queue card |
