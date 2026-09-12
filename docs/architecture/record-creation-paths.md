# Record Creation Paths: Evidence Bars and Sanctioned Bypasses

**Status:** Accepted · **Date:** 2026-09-11

## Context

"Should this become a Memory record?" is not answered by one system. There
are two gated creation systems plus a set of deliberate direct-insert
bypasses. Without a written list, every audit rediscovers the bypasses and
risks "fixing" intentional behavior (or missing an accidental one).

## The two gated systems

| System | Entry | Scoring | Auto-create bar |
|--------|-------|---------|-----------------|
| **Intake evidence** | `routeIntakeProposal` / `addSignalToEvidence` → `autoCreateRecord` | Log-odds accumulation (`SIGNAL_WEIGHTS` → `EVIDENCE_THRESHOLDS`) | person 8.0, org 7.0, work 8.0, billing 12.0, resource 6.0, meeting 4.0 |
| **Resolver admission** | `resolvePerson` → `evaluateAdmission` (`records-engine/admission.ts`) | Additive points from interaction-context signals | 85 (confirm at 50) |

The bars are deliberately different: the resolver answers "should this
capture participant become a person **now**" from one-shot context; the
evidence path answers "has enough corroboration accumulated **over time**".
Do not unify the numbers without a product decision — both directly move
the person birth rate. See the comment at `RECORDS_CONFIDENCE_AUTO_CREATE`.

Field **updates** to existing records go through `memoryUpdateField`:
workspace threshold (default 85), never-touch refusals, correction
blocklist, and always-auto observation fields (bar 0) — all enforced in the
tool, not in callers.

## Sanctioned bypasses (direct inserts, no evidence accumulation)

These paths write records directly. Each is intentional; removing one
changes product behavior.

| Path | Writes | Why it bypasses |
|------|--------|-----------------|
| `capture/services/producers/billing-record-producer.ts` | `billing_records` | Factual provider events (real invoice/payment exists) are not inferences. This is why `EVIDENCE_THRESHOLDS.billing.auto` (12.0) is unreachable from a single signal — evidence only corroborates. |
| `capture/services/cal-booking-processor.ts` | `meetings` | A booking that happened is a fact, like a synced calendar event. |
| `resources/services/email-attachment-ingest.ts` | `resources` | The attachment bytes exist; the record indexes a real object, deduped by `capture_event_id`. |
| `capture/services/intelligence/subscription-capture.ts` | `billing_records` | Subscription facts from provider data, same rationale as the billing producer. |
| `memory/records/person-resolver.ts` (`executeRecordAction`) | `people` | The resolver admission gate (above) — it is itself the bar, so it does not also accumulate intake evidence. |

## Rules

1. **New record types birth through the evidence path** unless the source
   is an objective external fact (the thing verifiably exists regardless of
   interpretation). Facts may bypass; inferences may not.
2. **A bypass must dedupe** on a stable external identity
   (`capture_event_id`, provider IDs) — bypasses skip the evidence store's
   accumulation, so they carry their own idempotency.
3. **Adding a bypass requires updating this table.** If a path inserts into
   `people` / `organizations` / `work` / `billing_records` / `meetings` /
   `resources` and is not listed here or in `auto-create-record.ts`, it is
   a bug or an undocumented decision — treat it as a bug until documented.
4. Terminal evidence states (`dismissed`, `created`) are inert on both
   gated paths — `routeIntakeProposal` and `addSignalToEvidence` both skip
   them. Bypasses that re-create a user-dismissed record must check the
   correction blocklist instead.
