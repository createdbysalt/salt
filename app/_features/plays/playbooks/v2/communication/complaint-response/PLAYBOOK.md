# Complaint Response — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

Reads an unhappy email, pulls the order context, drafts a tone-matched
reply. v1 deliberately stops at the reply — refund tooling
(`STRIPE_CREATE_REFUND` with `approval: required`) is the follow-up once
the money-send UX is proven on invoice-reminder.

## Decisions

- **Trigger is `email_classified_action_required`, not a sentiment
  signal.** The capture classifier already runs on every inbound email;
  the agent step owns the complaint-vs-question distinction, which is a
  judgment call that belongs in a prompt (with the why explained), not in
  a new registry signal.
- **Classification fetch is `optional: true`.** The capture classification
  enriches the agent's context but the agent can read the thread directly
  — a missing classification must degrade, not fail.
- **Send is `approval: ask` and instructions forbid auto-send.**
  Complaint replies are the highest-stakes outbound mail a solo operator
  sends. Earned autonomy can relax this per-workspace, but the shipped
  default always waits.
- **Refunds are policy-gated, not tool-gated.** The `refund_offers`
  setting constrains what the draft may offer; no refund tool is in the
  allowlist, so the play cannot move money at all.
- **Distinct from customer-pulse.** Pulse is the weekly aggregate
  (themes, trends); this is the per-event reaction. Pulse reads, this
  replies.

## Edge cases

- **Not actually a complaint** (question, request, spam): SKIP — an
  apology for a routine question is tone-deaf.
- **Owner already replied**: cooldown check on the thread → SKIP; two
  replies from different directions reads as chaos.
- **Billing app disconnected**: agent notes what it couldn't verify and
  proceeds — the human review is the safety net.
- **VIP vs new client**: the agent surfaces relationship length and the
  draft prompt scales care accordingly; urgent classifications escalate
  the tier.

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| angry-refund | no | Happy path: genuine complaint → reply paused on send |
| not-a-complaint | yes | Routine question → quiet skip, no apology draft |
| vip-escalated | no | Urgent classification → escalated tier, still paused on send |
