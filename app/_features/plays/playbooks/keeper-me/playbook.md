---
slug: keeper-me
kind: profile
name: Me
player_slug: keeper
description: Maintain what Salt knows about the operator through the propose-and-confirm memory loop, never by writing the profile directly.
when_to_use: |
  Runs when Capture or a system play observes a durable fact about the operator or their business from connected accounts, conversations, or work.
  Re-runs when repeated observations can strengthen a proposed fact or when the user asks Salt to refresh voice or enrichment surfaces.
trigger:
  type: signal
  signal: operator_fact_observed
---

# Me

## What this does

Keeper owns the operator memory policy: how Salt learns about the operator without ever writing their profile. The Me record is different from every other record type — every identity and business scalar field is user-only. What Salt learns flows through `operator_memory_facts` and its confirm loop instead. It covers the full operator memory surface:

1. **Memory facts** - `operator_memory_facts` rows with a lifecycle: proposed, then confirmed (by the user, or promoted by vote count from repeated observation), revised, or dismissed.
2. **Identity fields** - the operator's profile (name, role, phone, timezone, location, addresses, credentials). All user-only; Salt proposes facts about them, never writes them.
3. **Business fields** - the workspace record (business name, legal name, business type, tax context, default currency and payment terms, legal address). All user-only, same rule.
4. **Voice profile** - the learned writing style (`learned_style`) regenerated from the user's own samples.
5. **Goals** - user-owned goals where Salt's only surface is `ai_progress`, a system-derived value.
6. **ICP segments and services** - segments proposed by AI and confirmed by the user, and service enrichment blocks written with explicit `*_source='ai'` markers.

Activity history is append-only. Salt can read the Me timeline as evidence and can append a clearly attributed activity entry for work Salt actually performed, but it never rewrites, deletes, or backfills what happened.

Executable today: the operator memory loop (propose → confirm/revise/dismiss), ICP segment proposals, voice learning, and service enrichment already exist and run. The typed field engine does not execute Me fields — and by policy it never writes identity or business scalars anyway. Provenance for identity/business writes lands in Phase 6: the provenance `entity_type` CHECKs do not admit operator or workspace yet, so confirmed facts are the audit trail until then.

## Me page coverage

The Me playbook is the policy owner for the operator memory that powers the Me page.

| Page surface | What must be maintained | Ownership policy |
|--------------|-------------------------|------------------|
| Hero | Preferred name, role, business name, workspace domains | Rendered from user-set profile and workspace fields. Salt proposes corrections as facts; it never edits the hero directly. |
| Overview — identity and business cards | Profile and workspace scalar fields | User-only. Salt's observations become proposed facts awaiting confirmation. |
| Overview — goals | Goal content, status (`active`/`paused`/`done`/`dropped`), targets and units (`dollars`/`clients`/`projects`/`hours`), and `ai_progress` | Content, status, and targets are user-only. `ai_progress` is system-derived with a deterministic writer (`me/goals/recompute.ts`): recomputed when `computed_at` is missing or older than 6 hours, writes only that column, and logs the recompute to Activity. |
| Overview — ICP segments | Proposed and confirmed segments | AI proposes (`source='ai_capture'`); the user confirms, dismisses, or creates. Dismissed segments are filtered from reads. |
| Overview — services | Service enrichment blocks with per-block `*_source` | Salt writes enrichment with `*_source='ai'` (`ai_proposed → ai_confirmed`). A manual save flips the source to manual — that is the override signal, and Salt respects it. |
| Voice tab | Voice samples, spectrum controls, learned style | Samples and spectrum are user-owned. `learned_style` regenerates from samples on request; the output is clearly Salt-authored. |
| Files tab | Operator-asset files | Owned by the Files Records policy; the `is_operator_asset` flag is user-only. |
| Notes tab | Unified feed: user/Salt notes merged with operator memory facts — proposed facts render inline with Confirm/Dismiss footers, pinned-first, filterable (All / Pinned / Yours / Salt's) | User notes are protected. Salt may append clearly authored notes with provenance. Proposed facts carry receipts (vote count, source label) and follow the fact lifecycle, not the note lifecycle. |
| Activity tab | Timeline of confirmations, revisions, and Salt actions | Append-only. Salt may append entries for actions it performed. It never rewrites historical events. |

## When it runs

- **Operator fact observed** - Capture or a system play notices a durable fact about the operator or the business (a signature block, a stated timezone, a default rate, a business detail in a contract).
- **Repeated observation** - the same fact appears again from new evidence, adding a vote toward promotion.
- **Voice refresh requested** - the user asks Salt to relearn their writing style from samples.
- **Enrichment opportunity** - new work, billing, or conversation context can improve service enrichment or propose an ICP segment.
- **Manual review starts** - the user opens Me and reviews proposed facts.

## How it works

1. **Observe, never write** - When Salt learns something about the operator, it creates an `operator_memory_facts` row with `status='proposed'`. It does not touch the profile or workspace record.
2. **Check the dismissal ledger** - Before proposing, Salt checks whether the same fact was dismissed from the same evidence. A dismissed ("forgotten") fact is never re-proposed from the same evidence.
3. **Count votes** - Repeated observation of the same fact from distinct evidence increments its vote count. A fact can promote to confirmed by vote count without an explicit user tap.
4. **Wait for the user otherwise** - Below the promotion bar, the fact sits as proposed until the user confirms, revises, or dismisses it. A revision replaces Salt's version with the user's wording.
5. **Regenerate voice on request** - When asked, Salt regenerates `learned_style` from the user's samples. The regeneration is automatic once requested and the output is clearly Salt-authored; the samples themselves are never edited.
6. **Derive goal progress** - `ai_progress` is computed from goal targets and observed signals by the deterministic recomputer (`me/goals/recompute.ts`): it runs when `computed_at` is missing or older than 6 hours, writes only the `ai_progress` column with a fresh `computed_at`, and appends an Activity entry recording the recompute. Salt never writes goal content, status, targets, or units through it.
7. **Propose segments and enrichment** - ICP segments are created as proposals (`source='ai_capture'`). Service enrichment blocks are written with `*_source='ai'`; user acceptance moves `ai_proposed → ai_confirmed`, and a manual save flips the source to manual, which Salt treats as final.
8. **Record what it can** - Confirmed facts carry their evidence and history. Field-level provenance for identity/business writes waits for Phase 6, when the provenance entity types admit operator and workspace.

## What you approve

Everything about your identity and business. There is no auto-apply path onto profile or workspace scalar fields — a fact either gets your explicit confirmation or earns promotion through repeated independent observation, and even then it lands as a confirmed fact, not a silent field edit.

Automatic surfaces are narrow and clearly Salt-owned: vote-count promotion of repeatedly observed facts, voice regeneration you requested, ICP segment proposals awaiting your decision, and service enrichment marked `*_source='ai'` until you accept or override it.

## Workspace context

The Me playbook depends on bounded context, not broad search.

**What it uses**

- **Connected evidence about you** - your own signatures, sent messages, calendar patterns, and billing defaults from connected accounts.
- **Your work and billing memory** - patterns in your services, rates, and clients that suggest business facts or ICP segments.
- **Your samples** - the writing samples you provided, for voice learning only.
- **The dismissal ledger** - previously dismissed facts and the evidence they came from.

**What it ignores**

- Facts about other people — those belong to People Records.
- Client content as a source of operator voice; only your own writing trains `learned_style`.
- Broad workspace memory not anchored to the operator or the workspace itself.

**Time policy**

- The trigger is evidence-based, not scheduled.
- Vote-count promotion requires observations from distinct evidence over time, not the same artifact re-read.
- Stale facts (an old signature contradicting a newer one) favor the newest evidence and propose a revision rather than a second competing fact.

## Classification rules

When Salt observes something about the operator, it classifies the fact into a **category** (what domain it belongs to) and a **kind** (what type of knowledge it is). These rules are evaluated by pattern matching on the evidence content.

### Pattern → category classification

| Rule ID | Pattern | category | Confidence | Because |
|---------|---------|----------|------------|---------|
| `identity-signature` | Signature block (name, title, contact info) | `identity` | 85 | Signature blocks contain identity information |
| `identity-timezone` | Timezone mention (CST, EST, Pacific) | `identity` | 80 | Timezone relates to operator identity |
| `identity-title` | Title or role mention (Founder, Designer) | `identity` | 85 | Title and role are core identity fields |
| `identity-name` | Name preference or correction | `identity` | 90 | Name preferences are explicit identity facts |
| `identity-phone` | Phone number in operator context | `identity` | 80 | Phone numbers are identity contact info |
| `identity-address` | Address in operator context | `identity` | 80 | Personal addresses are identity info |
| `identity-credentials` | Professional credentials (CPA, MBA) | `identity` | 85 | Credentials are identity facts |
| `business-name` | Business name mention | `business` | 90 | Business name is a core business field |
| `business-legal` | Legal entity type (LLC, Inc) | `business` | 90 | Legal entity is a business fact |
| `business-tax` | Tax context (EIN reference) | `business` | 85 | Tax context relates to business structure |
| `business-rate` | Rate or pricing mention | `business` | 85 | Rates and pricing are business facts |
| `business-terms` | Payment terms (net 30) | `business` | 85 | Payment terms are business policy |
| `business-currency` | Default currency preference | `business` | 80 | Default currency is business preference |
| `business-address` | Business address (distinct from personal) | `business` | 85 | Business address is business info |
| `preference-communication` | Communication preference | `preference` | 80 | Guides how Salt drafts |
| `preference-scheduling` | Scheduling preference | `preference` | 80 | Guides calendar suggestions |
| `preference-workflow` | Workflow preference | `preference` | 75 | Needs context verification |
| `preference-tool` | Tool preference | `preference` | 80 | Explicit tool statements |
| `voice-correction` | Draft text correction | `voice` | 85 | Draft corrections are voice learning |
| `voice-terminology` | Terminology preference | `voice` | 85 | Terminology shapes voice |
| `voice-tone` | Tone indicator | `voice` | 80 | Tone guides writing style |
| `relationship-referral` | Referral source mention | `relationship` | 90 | High-value relationship context |
| `relationship-partnership` | Partnership mention | `relationship` | 80 | Business relationship indicator |
| `relationship-team` | Team context mention | `relationship` | 80 | Working relationship indicator |

### Pattern → kind classification

| Rule ID | Pattern | kind | Confidence | Because |
|---------|---------|------|------------|---------|
| `kind-fact-signature` | Signature block | `fact` | 85 | Signature information is factual |
| `kind-fact-business` | Business name | `fact` | 90 | Business name is objective |
| `kind-fact-legal` | Legal entity type | `fact` | 90 | Legal entity is verifiable |
| `kind-fact-rate` | Rate/pricing | `fact` | 85 | Rates are factual until changed |
| `kind-pref-communication` | Communication preference | `preference` | 80 | Communication style is a preference |
| `kind-pref-scheduling` | Scheduling preference | `preference` | 80 | Scheduling rules are preferences |
| `kind-pref-tool` | Tool preference | `preference` | 80 | Tool choices are preferences |
| `kind-procedure-voice` | Voice correction | `procedure` | 85 | Voice corrections teach how to write |
| `kind-procedure-terminology` | Terminology preference | `procedure` | 85 | Terminology rules are procedural |

### Confidence thresholds

| Confidence | Behavior | Rationale |
|------------|----------|-----------|
| ≥ 90 | May earn vote-count promotion faster | Highly objective facts from clear evidence |
| 80–89 | Standard proposed status | Good confidence but benefits from confirmation |
| 75–79 | Always propose | Needs human judgment |
| < 75 | Skipped | Too uncertain to create as a fact |

Note: Unlike entity record fields, operator facts are **never auto-applied** to profile or workspace fields regardless of confidence. These classification rules determine category and kind, but the fact still enters the propose-confirm loop.

## Record lifecycle

**Fact lifecycle**

- **Proposed** - Salt observed it and is waiting. Nothing downstream treats it as true.
- **Confirmed** - the user confirmed it, or repeated observation promoted it by vote count. Confirmed facts are what Salt reasons from.
- **Revised** - the user corrected Salt's version; the revision is the truth and the original is history.
- **Dismissed** - the user said no. Dismissed facts are hidden but kept, and are never re-proposed from the same evidence.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Identity fields (profile) | The user | User only | None | Propose a fact about the field (proposed status) | Any direct write, even at full confidence |
| Business fields (workspace) | The user | User only | None | Propose a fact about the field | Any direct write; never store a full tax ID anywhere |
| Auth email | Auth system | Derived | None | None | Any write |
| Memory facts | Observed evidence, user confirmation, vote count | Write policy | Create proposed facts; promote by vote count from distinct evidence | Borderline promotions, conflicting facts | Re-proposing a dismissed fact from the same evidence |
| Voice samples + spectrum | The user | User only | None | None | Editing samples or moving spectrum controls |
| Voice learned style | The user's samples, on request | Salt-authored | Regenerate from samples when requested | Regeneration Salt initiates itself | Training on anyone else's writing |
| Goals content / status / targets | The user | User only | None | None | Any write |
| Goal ai_progress | Goal targets plus observed signals | Derived | Deterministic recompute when `computed_at` is missing or older than 6 hours; writes only this column | None — it is derived, not proposed | Writing goal content, status, targets, or units through it |
| ICP segments | Work, billing, and conversation patterns | Write policy | Create proposals (`source='ai_capture'`) | Nothing applies without user confirm/dismiss | Resurrecting dismissed segments |
| Services enrichment | Service usage, work, and billing patterns | Write policy | Write enrichment blocks with `*_source='ai'` | Changing a block whose source is manual | Overwriting a manual save; that flip is final |
| Workspace domains | The user, verified connections | User only | None | Propose a domain fact from verified evidence | Silent domain changes |
| Notes | User notes, Salt notes | Split ownership | Append Salt-authored notes with provenance | Anything subjective or sensitive | Rewrite or delete user-authored notes |
| Provenance and explanations | Fact history, enrichment sources | Read-only history | Append what today's schema admits | Correct via the fact review flow | Rewrite history; identity/business provenance waits for Phase 6 |
| Activity and audit history | Confirmations, revisions, Salt actions | Append-only evidence | Append a clearly attributed Salt activity entry | Any sensitive or high-impact activity entry | Rewrite, delete, backfill, or mutate historical events |

**What it never touches**

Salt never writes an identity or business scalar field directly — not the name, not the timezone, not the default currency, nothing, at any confidence. It never stores a full tax ID, never edits voice samples, never writes goal content or status, never re-proposes a fact the user dismissed from the same evidence, and never overwrites an enrichment block the user saved manually. The confirm loop is the only door into operator memory.

**Negative examples**

- Salt reads "CST" in the operator's signature. It proposes a timezone fact; it does not set the profile timezone.
- The user dismissed "You charge $150/hour." The same contract page cannot produce that proposal again.
- Three separate contracts show the same legal business name — that earns vote-count promotion to a confirmed fact, still not a direct write to the workspace record.
- A client's polished email is not evidence for the operator's voice profile; only the operator's own samples are.
- Salt notices a goal looks 80% done. The recomputer updates `ai_progress` (and only that column); it never edits the goal's status to done.

Executable today: the propose-and-confirm loop, ICP proposals, voice learning, service enrichment, and the goal `ai_progress` recomputer (shipped 2026-07-03) run now. No typed engine executes Me fields — and by policy it never would write identity or business scalars. Identity/business provenance waits for Phase 6 (the provenance `entity_type` CHECKs do not admit operator or workspace). The matrix above is the policy those pieces grow into.
