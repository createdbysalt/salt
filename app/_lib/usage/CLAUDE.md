# Usage & Metering

> **See also:** [Billing & Metering Architecture](../../../docs/architecture/billing-metering.md) (source of truth) | [Tools Reference](../../../docs/architecture/tools.md) | [Pricing proposal](../../../docs/reference/pricing-proposal-tiered-plays.md)

Salt SaaS metering: what customers owe us, and what serving them costs. **Not** client invoices — those are `app/_features/billing/` and `billing_records`.

## Key Insight

**Metering lives in the spend primitive, not the feature that spends.**

```
Before (feature-level):
  executePlayRun  → meters
  Ask Salt        → forgot → real emails billed as free
  Keeper          → forgot
  Playbooks       → will forget when they ship

After (primitive-level):
  anything → executeComposioAction → metered
  anything → sendLlm / streamText  → metered
```

Seven exit points carry every dollar Salt spends. Instrument those and features never need billing code again — including playbooks, which are only ~10–30% built and must be planned for without being waited on.

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Event types, tiers, `TierCapacity`, `CostBreakdown`, entitlement shapes |
| `pricing-versions.ts` | Frozen catalog per pricing version. **Add versions; never edit one.** |
| `tiers.ts` | Version-scoped capacity accessors. Server-side truth, never a DB column. |
| `ledger.ts` | `recordUsageEvent`, `reverseUsageEvent`, `countBillablePlays` |
| `play-cost.ts` | Per-play COGS from flat per-call constants (shape known up front) |
| `llm-cost.ts` | Per-token COGS by model (shape not known up front). Unknown models price **expensive**. |
| `record-play-usage.ts` | Play metering entry; derives billability from tools |
| `ask-salt-usage.ts` | `checkAskSaltAllowance` (ledger-backed admission), `recordAskSaltUsage` |
| `record-llm-usage.ts` | `recordLlmCall` — called from inside `sendLlm`, never from a feature |
| `capture-scan-cap.ts` | `resolveScanCaptureCap` — per-tier ceiling for one manual capture scan |
| `entitlements.ts` | `getWorkspaceEntitlement` — tier, bundle, period, pricing version |
| `can-spend.ts` | `canSpend` — the circuit breaker. Ladder, revenue basis, origins. |
| `cogs.ts` | MTD COGS read, cached with local-delta accounting |
| `index.ts` | Export hub |

## Two meters, one ledger

| | Billing meter | Cost meter |
|---|---|---|
| Counts | Plays with `external_effect` | Every micro-USD of vendor spend |
| Drives | Invoices, bundles, overage | Margin alerts, degradation, circuit breaker |

Both write `usage_events`, separated by `event_type`. A workspace at 5% of its play bundle can still be the most expensive account we have — Ask Salt and capture burn tokens without producing billable plays. Only the cost meter sees that.

## Rules

1. **Admin client only.** These tables grant no write to `authenticated`. Always filter `workspace_id` explicitly — RLS is bypassed.
2. **Append-only.** A DB trigger rejects `UPDATE`/`DELETE` even from `service_role`. Corrections are reversal rows.
3. **Idempotency always.** Plays key on `play_<runId>`. Retries and backfills land once.
4. **Never throws into a caller.** Metering failure must not fail customer work. Wrap, log, continue.
5. **Micro-USD for cost, cents for price.** A Composio action is $0.002 and rounds to zero in cents. No floats.
6. **Billability is derived** from `external_effect`. Never hand-set `billable`.
7. **Never store `plays_included` or `plays_used`.** The first derives from `tier` + `pricing_version`; the second aggregates from the ledger. Stored numbers are tamper targets and drift sources.
8. **Never edit a shipped pricing version.** Add one. Editing in place re-prices every existing customer on that tier.
9. **Pass the workspace's `pricing_version`** when resolving a real workspace. The default is "today's catalog" and is only right for signup and marketing.

## Changing pricing

Pricing changes by **adding a version** to `pricing-versions.ts` and bumping `CURRENT_PRICING_VERSION`. Each workspace stores the version it bought, so existing customers are grandfathered by construction — no backfill, no per-customer override. Migrating a cohort is one deliberate `UPDATE` on `workspace_subscriptions.pricing_version`.

`plays_included_override` is for one-off and enterprise deals, **not** routine grandfathering: it covers one number, while a version covers price, bundle, and every limit together.

Full procedure — including Stripe price ids and the copy to update — is in the architecture doc.

## Spend admission

`canSpend()` gates vendor cost on **MTD COGS ÷ that workspace's revenue**. A ratio, not a dollar figure: $30 of cost is healthy on Max and ruinous on Starter.

```typescript
const decision = await canSpend({ workspaceId, kind: "llm_tokens", origin: "user" });
if (isBlocked(decision)) return refuse(decision.userMessage);
const model = shouldDegrade(decision) ? CHEAP_MODEL : NORMAL_MODEL;
```

Origin decides how far the ladder goes past 100%: `user` → deny, `background` → queue, `committed` → degrade and **never block**. Use `committedSpend()` for anything inside an approved play; refusing mid-run leaves side effects applied and nothing to show for them.

`degrade` names no lever — each exit point pulls its own (model class, step count, scan depth).

Everything fails open: an unreadable ledger, an entitlement error, or a throw all allow. Same bargain as rule 4.

**`cogs.ts` caches in memory; `ask-salt-usage.ts` deliberately does not.** Not a contradiction. A cache holds a copy of a value the database owns, so duplicating it across instances only means bounded staleness. A *counter* in memory **is** the limit, so duplicating it multiplies the allowance. Never convert one into the other.

Because a burst fits inside the cache TTL, `recordUsageEvent` calls `noteLocalSpend` and the effective figure is snapshot + spend recorded since. Removing that makes the gate blind during exactly the traffic it exists to catch.

## Status

| Thing | Enforced |
|-------|:--------:|
| Ledger recording, idempotency, reversals | n/a — works |
| Play metering across all 10 completion paths | n/a — works |
| `canSpend` COGS circuit breaker | **Yes** — Composio, `sendLlm`, Ask Salt, TTS |
| `askSaltDailyLimit` | **Yes** — ledger-backed, rolling 24h |
| `captureBudgetMicros` | **Yes** — via `resolveScanCaptureCap`, manual scan only |
| `sendLlm` token spend (14 call sites) | **Yes** — recorded and gated |
| `getWorkspaceEntitlement` / `playsRemaining` | Read by `canSpend`; **no play-path caller** |
| `playsIncluded`, `storageQuotaBytes` | **Nowhere** |
| `MAX_TOOL_CALLS_PER_PLAY` | **Nowhere** |
| Embedding spend | **Nowhere** — deliberate; see the architecture doc |

Shadow metering of the *play bundle* is still deliberate (pricing §4: observe 60–90 days, then set bundles from real percentiles). Cost is capped; **revenue is not** — nothing checks `playsRemaining` before `executePlayRun`, so a Starter workspace can run unlimited plays. **Do not assume a limit works because it is defined here.**

`sendLlm` takes an `LlmSpendContext` and both gates and meters itself — never call `canSpend` or `recordLlmCall` around it from a feature. Attribution must stay required: `AsyncLocalStorage` and user→workspace lookup were both investigated and rejected, so see the architecture doc before reopening either.

`createAdminClient()` has no `Database` generic, so `supabase.rpc(...)` compiles whether or not the function exists and whether or not the parameter names match. `scripts/verify-cogs-aggregate.mjs` probes the real database; run it after touching `workspace_cogs_micros`.

`llm_call` rows are always `billable: false` and are the highest-cardinality type in the ledger. Keep them out of the `billable = true` partial index.

**Grants are load-bearing and silence is not evidence.** These tables denied `service_role` every operation for a day and nothing failed loudly, because the ledger is non-fatal by design and unit tests mock the database. A migration that writes its own GRANT/REVOKE block must name `service_role` explicitly — bypassing RLS is not the same as holding table privileges. After any such migration, run `scripts/verify-billing-ledger-writable.mjs`.

## Usage

```typescript
import { recordPlayExecution } from "@/app/_lib/usage/record-play-usage";

// Derives external_effect from the slugs, estimates COGS, writes one ledger row.
await recordPlayExecution({
  workspaceId,
  playRunId,
  toolSlugs: ["GMAIL_SEND_EMAIL"], // billable — external effect
  llmSlots: ["copyClientFacing"],
});
```

```typescript
import { getTierCapacity, resolvePlaysIncluded } from "@/app/_lib/usage/tiers";

// Always pass the version for a real workspace — omitting it prices them at
// today's catalog and quietly undoes grandfathering.
const included = resolvePlaysIncluded(
  sub.tier,
  sub.plays_included_override,
  sub.pricing_version,
);

const capacity = getTierCapacity(sub.tier, sub.pricing_version);
```
