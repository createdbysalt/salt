# People Records Domain Reference

## Entity

People records in Salt, plus the policy for deciding whether incoming evidence should become a person, an organization, a shared alias, a system sender, a source artifact, or nothing. People Records owns the durable person record as policy: identity, relationship, status, contact details, organization links, overview, notes, tags, connections, and record-state boundaries. Activity and audit history are append-only evidence: Salt AI may append entries for actions it actually performed, but it never rewrites or deletes historical activity.

## Fields It Can Read

- `email` - the resolved person's email address.
- `signals.has_payment_received` - whether payment evidence exists for the person in a finance source.
- `signals.has_invoice_sent` - whether invoice evidence exists for the person.
- `signals.is_bidirectional_thread` - whether there is a two-way conversation.
- `signals.you_initiated` - whether the user initiated the relationship.
- `signals.has_calendar_meeting` - whether meeting evidence exists.
- `signals.has_signature` - whether email signature evidence exists.
- `signals.email_count` - bounded email activity count.
- `extracted_title` - title extracted from signature context.
- `contextFacts.workspace_domains` - workspace domains from Me.
- `contextFacts.partner_domains` - partner domains from Me.
- `contextFacts.vendor_domains` - vendor domains from Me.

## Record Surfaces It Owns

Policy ownership covers the full durable person record:

- Identity: name, email, phone, avatar, portal identity, and whether the entity is a human person.
- Relationship and status: `relationship_type`, directory `relationship_status`, lifecycle meaning, and review boundaries.
- Role and organization: title, primary organization, role, and organization membership.
- Contact context: verified contact details, tags, preferences, metadata, and workspace-specific facts.
- Overview and notes: current profile summary, Salt-authored notes, and protected user-authored notes.
- Connections and links: people, orgs, work, files, spaces, conversations, meetings, and source artifacts linked to the person.
- Record state: archive, restore, active/inactive, and other high-impact state transitions.
- Provenance: explanations for proposed or applied changes.

Executable today:

- `relationship_type` - allowed values: `client`, `prospect`, `team`, `partner`, `vendor`, `personal`, `unknown`.
- `title` - title string resolved from `{{extracted_title}}`.
- `org_link` - organization domain resolved from `{{org_domain}}` and recorded as provenance.

Never owned for rewrite/delete: Activity timeline, audit logs, raw capture events, routing history, tool execution history, finding history, and provenance history. Salt reads these as evidence and may append new Salt-authored activity/provenance entries when it changes current record fields, but it does not rewrite historical entries.

## People Detail Page Surface Map

People Records must maintain the data contract for the whole People detail page, not only the first executable fields.

| UI surface | Record data required | Salt policy |
|------------|----------------------|-------------|
| Hero | Name, initials/avatar, lifecycle, relationship, last contact, summary, primary organization, active work, outstanding balance, next meeting, MRR | Maintain or derive from trusted People, Org, Work, Billing, Meeting, Conversation, and Activity evidence. |
| Overview: Summary | Current profile summary and worth-attention reason | Generate/update from directly linked evidence with provenance; wait on subjective/client-facing language or conflicts. |
| Overview: Account | Status, email, phone, job title, organization, relationship, retainer, MRR | Change actual fields when approved by policy. Do not create a separate "why Salt filled this in" field surface. |
| Overview: Tags | Tags, preferences, and workspace-specific labels | Add/update low-risk tags from repeated directly linked evidence or user correction. |
| Connections tab | Organizations, work, meetings, people, files, spaces, source artifacts | Add exact links above threshold; ask for weak graph links, merges, identity unification, and org reassignment. |
| Payments tab | Invoices, payment evidence, outstanding balance, retainer, MRR | Use generic finance and billing sources unless the playbook is specifically about one app. |
| Files tab | Linked files, category, updated timestamp | Link exact files from directly related work, meetings, conversations, or user actions. |
| Notes tab | User notes, Salt notes, backlinks | User notes are protected. Salt may append Salt-authored notes with provenance. |
| Activity tab | Historical actions, Salt actions, system events | Append-only. Salt can append entries for field updates/suggestions it performed; never rewrite/delete/backfill history. |
| Client health card | Health inputs: recency, invoices, meetings, worth-attention signals, relationship context | Derived display. People Records maintains the inputs, not arbitrary score overrides. |
| Plays card | Related plays in approval/scheduled/team queues | Read-only from Plays. People Records maintains person/org/work links that make matching reliable. |
| Spaces card | Person-space links and visibility context | Add exact links when evidence is explicit; approval required for visibility, membership, or ownership changes. |

## Create vs Update Policy

- Create: current field engine cannot create people. Capture should create a person only when admission policy passes and identity resolution does not match an existing person.
- Update: fill supported fields when a rule or fallback result is available for a resolved person.
- Skip: no qualifying human relationship evidence, automated sender, scam/spam, newsletter, generic alias without confirmation, no matching rule, no fallback, missing required placeholder value, or context not anchored to the person.
- Ask for review: thin evidence, generic aliases, possible organization-only identity, possible duplicate, confidence below threshold, fallback inferences at default threshold, empty resolved values, stale evidence, or conflicts between memory and connected-tool evidence.

## Admission Policy

Qualifies as a durable person record when at least one strong human relationship signal exists:

- user explicitly saved or approved the person,
- direct reply thread or meaningful two-way conversation,
- calendar meeting with the person,
- payment, invoice, contract, project, portal activity, or shared work tied to the person,
- trusted connected contact record,
- explicit relationship in Spaces or Connections,
- email identity includes a human name and is tied to a real interaction.

Does not qualify when:

- sender is automated: `noreply@`, `no-reply@`, `donotreply@`, app alerts, receipts, delivery notifications, calendar bots,
- sender is a generic alias: `billing@`, `support@`, `hello@`, `info@`, `sales@`, `admin@`, unless user confirms a person behind it,
- message is newsletter, marketing blast, cold bulk outreach, scam, spam, phishing, or scraped contact,
- evidence is only a company name, domain, invoice company, payment merchant, or system source,
- there is no reply, meeting, payment, work, saved contact, or explicit user action.

Waits for review when:

- the sender looks human but has only one weak signal,
- the sender could be a person or an organization alias,
- a domain maps to multiple possible orgs,
- the person might already exist under another email,
- the signal is stale, forwarded, or contradicted by durable memory.

Never create from:

- scam/phishing evidence,
- pure newsletters or broadcast lists,
- app/system senders,
- generic aliases without confirmation,
- raw domains or company names without a human anchor.

## Entity Taxonomy

- Person: named human with direct relationship evidence or user approval.
- Organization: company, client business, vendor business, payment merchant, invoice customer, domain, or workspace/team entity.
- Team inbox or shared alias: generic inbox connected to an organization, not a person by default.
- System sender: automated app, receipt, notification, calendar bot, or delivery sender. It can provide evidence but should not become a person.
- Newsletter or marketing sender: broadcast identity that should not enter People automatically.
- Scam/spam/suspicious sender: ignored or quarantined, never auto-created.
- Source artifact only: file, email, invoice, meeting, or payment record that informs another entity but is not itself a person.

## Identity Resolution And Dedupe

- Update existing record when the exact email already exists, a verified connected-system id matches, or user-approved identity mapping exists.
- Create new record when admission passes and no existing person matches email, connected id, or strong person/org context.
- Suggest merge when name, organization, domain, conversations, work, and connected-source evidence strongly overlap but identifiers differ.
- Never auto-merge when the same name appears across different organizations, domains conflict, personal and work emails are only loosely related, or either record has user-corrected facts.

## Field Completion Matrix

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never fill from |
|---------|-----------------|-----------|------------|-----------|-----------------|
| Admission and identity | User approval, exact email, verified contact record, direct relationship evidence | Write policy | Create/update clear people above threshold | Thin evidence, possible duplicate, personal-plus-work email, user-corrected identity | Scam, newsletter, system sender, raw company/domain without human anchor |
| Name | User-saved contact, signature, verified connected contact, explicit user request | Write policy | Fill missing name from verified human identity | Overwrite existing user-set name | Marketing copy, forwarded signatures, guessed names |
| Contact details | User-saved contact, verified contact record, signature, portal/contact records | Write policy | Existing verified email and high-confidence direct contact facts | Phone/social from text, stale or conflicting details | Scraped footers, unrelated docs, forwarded content |
| Relationship and status | Payments, invoices, workspace domains, partner/vendor lists, direct conversation and meeting signals | Write policy | Client/team/partner/vendor when confidence passes threshold | Prospect, personal, fallback, stale or conflicting evidence | Spam, newsletter, generic alias alone, system sender alone |
| Title | Email signature, trusted contact profile, user correction | Write policy | Verified title above threshold | Signature-derived or profile-derived title below threshold, conflicting titles | Guessed seniority, marketing copy, unrelated forwarded signature |
| Organization and role | Company domain, invoice customer, payment customer, connected org record, user correction | Write policy | Missing organization from high-confidence org/domain evidence | Reassign existing org, personal email, ambiguous domain, conflicting orgs | Personal domains, system/app domains, generic aliases alone |
| Tags and preferences | User correction, repeated directly linked behavior, explicit workspace facts | Write policy | Low-risk tags from repeated strong evidence | Preference changes that affect client-facing work | One-off comments, unrelated workspace memory |
| Overview and summary | Conversations, meetings, work, files, billing, user-approved facts tied to person | Write policy | Current summary above threshold with provenance | Subjective or client-facing phrasing, conflicts with user corrections | Raw memory dumps, unrelated history, private activity details |
| Notes | User notes, Salt notes, directly linked evidence | Split ownership | Append Salt-authored notes with provenance above threshold | Subjective, sensitive, or user-facing notes | Rewrite/delete user-authored notes |
| Connections and links | Exact ids, organization membership, work/file/space relations, user approval | Write policy | Missing low-risk exact links above threshold | Merges, identity unification, org reassignment, weak graph links | Invented links, same-name-only links |
| Record state | 90-day activity signals (communication, open work, billing activity, scheduled ahead), user action | Write policy (derived) | Derive active/inactive from the 90-day signals when no one has explicitly set it (NULL source) | Any change on top of an explicit manual choice; archive and restore | Overriding a manual status choice; silent destructive or visibility changes |
| Provenance and explanations | Rule output, confidence, evidence, source, blueprint version | Read-only history | Append new provenance rows | Correct current field through review | Rewrite provenance history |
| Activity and audit history | Activity entries, capture events, routing decisions, tool executions, finding history | Append-only evidence | Append a clearly attributed Salt activity entry for a change Salt actually made | Sensitive, subjective, high-impact, or ambiguous activity entries | Rewrite, delete, backfill, summarize as fact, or mutate historical events |

## Value Taxonomy

Relationship values (shared `relationship_type` vocabulary — registry canon):

- `client` - payment or invoice evidence.
- `prospect` - user initiated contact and no stronger evidence matched.
- `lead` - identified contact with no two-way conversation about work yet. No rule infers it; user-set or ask-first only.
- `past_client` - former paying customer with no open work or active conversation. Never set automatically; client→past_client downgrades are always ask-first.
- `team` - email domain matches a workspace domain.
- `partner` - email domain matches a partner domain.
- `vendor` - email domain matches a vendor domain.
- `personal` - reserved for future personal-context evidence.
- `unknown` - fallback when no relationship can be inferred.

Record status values (`record_status` vocabulary):

- `active` - communication in the last 90 days, open work, billing activity in 90 days or an open balance, or something scheduled ahead.
- `inactive` - none of the 90-day signals and nothing scheduled. Keeper derives this but never overrides an explicit manual choice.

## Signals

Fill-rule signals (`PersonProfileSignalKey` in records-engine types):

- `has_payment_received` - finance/payment evidence exists.
- `has_stripe_payment` - legacy compatibility alias for `has_payment_received`; new rules use the generic signal.
- `has_invoice_sent` - invoice evidence exists.
- `is_bidirectional_thread` - email/conversation evidence includes two-way communication.
- `you_initiated` - user initiated the relationship.
- `has_calendar_meeting` - calendar/meeting evidence exists.
- `has_signature` - signature evidence exists.
- `email_count` - bounded email count for the person.
- `email_domain_is_personal` - email domain is a known personal domain.
- `email_domain_matches_workspace` - email domain appears in Me workspace domains.
- `email_domain_in_partner_list` - email domain appears in Me partner domains.
- `email_domain_in_vendor_list` - email domain appears in Me vendor domains.

Advisory signals (hygiene findings and record-status derivation only — never fill rules):

- `person_no_contact_30_days` - no communication evidence in the last 30 days.
- `person_appears_in_multiple_orgs` - the person is linked to more than one organization; review case for the org link.
- `person_duplicate_email` - another person record shares this email; merge suggestion, never auto-merge.

## Context Budget

### Connected tools

- Required: email/capture evidence with a resolved person and email.
- Optional: communication, finance, billing, scheduling, meeting, and signature evidence.
- Ignored: unrelated connected-app history and any source not anchored to the person, domain, org, work, space, or connection.

### Memory scope

- Entity anchor: resolved person id and email domain.
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me.
- Relation filters: directly linked person, org, work, billing, conversation, meeting, team owner, and Me workspace context.
- Time window: newest directly linked evidence; future windows must define exact lookback/staleness rules.
- Max records: only normalized facts needed for the three fields, not raw memory dumps.
- Ranking: user-corrected People/Org memory, Me workspace facts, direct billing evidence, direct conversation/meeting evidence, then weaker contextual hints.

### Operating surfaces

- Spaces: use only if the person relationship is space-specific or a client/project space scopes visibility.
- Connections: use when relationship graph context confirms how the person/org/source is connected.
- Visibility or approval boundary: low-confidence and conflicting updates wait on the person profile.
- Trigger scope: Capture `person_resolved` in the current workspace; future space-scoped triggers must say which space.

### Time

- Trigger schedule/deadline/elapsed-time rule: evidence-based trigger, not scheduled.
- Lookback/lookahead window: newest directly linked evidence for the resolved person unless a future rule defines a window.
- Timezone/business-day assumption: not relevant for current field filling.
- Recency or staleness rule: stale/conflicting evidence waits for review until explicit recency rules exist.

### LLM context

- Facts passed: normalized signals, domain context, threshold, and current supported fields.
- Facts excluded: raw connected-app history, all workspace memory, unrelated people/orgs/work/files/billing/conversations/meetings/teams/me data.
- Max input paths: current profile rules do not use an LLM step; future LLM fallback should pass normalized facts only.

### Degradation

- If a required source is missing: wait for Capture to resolve a person/email.
- If optional sources are missing: evaluate remaining signals and hold uncertain values for review.
- If too many records match: use directly linked person/domain context first and ignore broad matches.
- If evidence conflicts: hold for review unless a stronger explicit rule and provenance support auto-apply.

## Decision Order

1. Decide whether the incoming evidence qualifies for a durable People record.
2. Classify the entity as person, organization, alias, system sender, newsletter, suspicious sender, or source artifact.
3. Resolve identity against existing people and orgs.
4. Decide create, update, suggest merge, skip, or hold for review.
5. Resolve facts from the person email and bounded signals.
6. For each supported field, scan authored rules in order.
7. Use the first matching rule for that field.
8. Resolve placeholders such as `{{extracted_title}}` or `{{org_domain}}`.
9. Compare confidence to the configured threshold.
10. Mark the result `applied` or `pending`.
11. Write provenance for review and learning.

Executable boundary: Salt's shared records engine evaluates steps 1-4 for admission, classification, and identity decisions. The profile field runner executes steps 5-11 for the currently supported writable fields: `relationship_type`, `title`, and `org_link` provenance. The full matrix above is the ownership policy for the durable person record, not a claim that every surface is executable today.

## Activity And History

Activity is a trust record, not a profile field. Salt can read activity and audit history to understand context. It can append a clearly attributed entry for work Salt actually performed, but it cannot rewrite what happened.

Never mutate:

- person Activity timeline,
- `activity_entries`,
- `capture_events`,
- `capture_routing_decisions`,
- `workspace_tool_executions`,
- intelligence finding history,
- profile provenance history,
- raw connected-source events.

Allowed behavior: append a new, clearly attributed Salt-authored activity entry, Salt-authored note, or provenance row when a current profile field changes or a suggestion is created. Not allowed: editing, deleting, rewriting, backfilling, or summarizing historical events as if the event itself changed.

## Negative Examples

- `noreply@payments.example` should not become a person. It may provide payment evidence for another person or organization.
- `billing@acme.com` should not become a person unless the user confirms it represents a specific human. It may support an Acme organization/contact point.
- `Maya from Acme` with direct replies, a meeting, and an invoice can qualify as a person.
- `Acme Inc.` from an invoice or payment merchant should become an organization, not a person.
- A cold outreach sender with no reply, meeting, payment, work, saved contact, or user action should not enter People automatically.
- A suspected scammer or phishing sender should be ignored/quarantined, not classified as a prospect.
- Two people with the same name at different organizations should never auto-merge.
- A personal email and company email for the same name should suggest a link only when conversations, work, or user approval confirm identity.

## Benchmark Coverage

These lifecycle cases are covered by the People Records benchmark suite:

- `human-reply-qualifies-person` - a named sender with a reply thread and meeting qualifies as a person.
- `noreply-system-sender-skips-person` - `noreply@payments.example` is a system sender and does not create a person.
- `billing-alias-becomes-org-contact-point` - `billing@acme.com` routes to organization/contact-point review, not person creation.
- `newsletter-sender-skips-person` - broadcast newsletter evidence does not create a person.
- `scam-sender-quarantines` - suspicious/phishing evidence is ignored or quarantined.
- `same-email-updates-existing-person` - exact email match updates the existing person.
- `same-name-different-org-waits-merge` - same name across different orgs does not auto-merge.
- `personal-and-work-email-suggests-link` - personal and work email with strong shared context suggests a link but waits for review.

## Confidence Policy

Threshold rule:

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Equality passes. The default threshold is `85`, but the same comparison applies at any configured threshold.

Rule intent:

- `95` finance payment: intended to pass common thresholds.
- `90` invoice/client and partner domain: intended to pass default `85` and stricter `90`.
- `92` workspace team: intended to pass default `85` and `90`.
- `88` vendor domain: intended to pass default `85` but wait at `90`.
- `85` organization domain: intended to pass at default threshold by equality and wait above `85`.
- `80` title from signature: intended to wait at default threshold.
- `75` user-initiated prospect: intended to wait at default threshold.
- `70` fallback known inference: intended to wait at default threshold.
- `40` fallback unknown: intended to wait unless the user intentionally sets a very low threshold.

Threshold settings do not override safety, approval boundaries, RLS, or tool policy.

## Conflict Policy

- User-corrected People/Org memory should be treated as high priority.
- Connected-tool evidence can propose a change but should not silently override a clear correction without review.
- If two relationship rules could apply, authored order decides the rule result for now. Prefer adding a clearer rule rather than relying on ambiguous ordering.
- If a placeholder resolves empty, keep the result pending even when confidence passes.

## Provenance

Every result records:

- field,
- value,
- source (`rule`, `ai_fallback`, or `manual`),
- rule id,
- confidence,
- explanation,
- status,
- evidence,
- blueprint slug and version.

This provenance is how the UI explains the decision and how future learning loops identify improvements.

## Follow-On Scope

The ownership matrix and People detail page surface map above are the policy. Future executable phases should wire additional surfaces one at a time: contact details, organization link writes, summary/overview, Salt-authored notes, tags/preferences, exact graph links, health inputs, billing/retainer fields, file links, space links, activity append entries, and record status proposals. Each new executable surface needs typed field keys or action helpers, provenance, UI review, and eval coverage before it is represented as engine-supported.
