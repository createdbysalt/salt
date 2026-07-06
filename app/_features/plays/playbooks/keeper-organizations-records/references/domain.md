# Organizations Records Domain Reference

## Entity

Organizations Records owns durable organization memory: company records, domains, relationship status, linked people, linked work, billing evidence, file context, notes policy, activity boundaries, and provenance for Keeper-filled organization fields.

## Fields It Can Read

- `organizations.name` - canonical display name.
- `organizations.domain` - normalized company domain used for dedupe and website inference.
- `organizations.website` - public website, usually derived from a trusted domain or verified profile.
- `organizations.industry` - category or vertical when directly sourced or user-corrected.
- `organizations.relationship_status` - relationship lifecycle: org scope of the shared `relationship_type` registry vocabulary (`client`, `prospect`, `lead`, `past_client`, `partner`, `vendor`, `unknown`). Legacy `other` exists only on old rows; never write it.
- `organizations.industry_parent` / `organizations.industry_child` - taxonomy classification (registry `industry_parent`/`industry_child`; child must belong to the parent). Free-text `industry` stays in sync with the formatted label.
- `organizations.record_status` - `active` / `inactive`, derived from 90-day activity aggregated across linked people, work, and billing; never overrides a manual choice.
- Contracted contact/legal fields: billing email, address (street, line 2, city, state, postal code, country), tax ID - ask-first fills from directly linked billing or contact evidence.
- `organization_people` - linked people, primary contact, and roles.
- Work, billing, meetings, conversations, files, spaces, connections, and Me context linked to the organization or domain.

## Record Surfaces It Owns

- Identity and admission - policy-owned; executable creates/updates only when domain or verified id is clear.
- Website - executable today.
- Industry - executable today but normally pending at the default threshold.
- Relationship status - executable today for client/partner/vendor evidence.
- Key contact - executable today only for exact linked person ids and low-risk cases.
- Work/billing/file/person links - policy-owned; exact-link write support can expand later.
- Notes and summaries - policy-owned; user-authored notes are protected.
- Activity, audit logs, raw capture history, routing history, tool execution history, and provenance history - never-touch except appending new provenance/activity for Keeper work.

## Create vs Update Policy

- Create when a non-personal domain, verified customer/contact id, invoice/payment customer, saved organization, shared work, or explicit user request names an organization and no existing organization matches.
- Update when the same domain, migrated client id, verified connected-system id, or user-approved exact match already exists.
- Skip when evidence is thin, automated, suspicious, unrelated, or only a forwarded mention.
- Ask when names are similar but domains differ, the org may be a subsidiary/rebrand, or identity evidence conflicts.

## Admission Policy

- Qualifies as a durable record when company-domain, finance, billing, work, meeting, file, or explicit user evidence points to a real organization.
- Does not qualify when the sender is a newsletter, scam, system sender, generic receipt service, or one-off artifact with no organization relationship.
- Waits for review when only a generic alias, similar name, stale source, or ambiguous merchant string is available.
- Never create from personal/free domains, marketing copy, forwarded signatures, or filename similarity alone.

## Entity Taxonomy

- Person: named human with direct relationship evidence.
- Organization: company, client, vendor, partner, customer, or durable business identity.
- Team inbox or shared alias: contact point for an organization, not a person by default.
- System sender: evidence source only unless tied to a verified organization customer.
- Newsletter or marketing sender: usually skip unless user explicitly saves it as an organization.
- Scam/spam/suspicious sender: skip or quarantine; never create automatically.
- Source artifact only: file, invoice, receipt, email, or app record that may provide evidence but is not itself the organization.

## Identity Resolution And Dedupe

- Update existing record when domain, migrated client id, connected customer id, or exact user-approved identity matches.
- Create new record when company identity is clear and no existing record has the same durable identifier.
- Suggest merge when name, domain variants, people, billing, and work overlap but identifiers are incomplete or conflicting.
- Never auto-merge when domains differ, names are generic, parent/subsidiary relationships are possible, or user-corrected identity disagrees.

## Field Completion Matrix

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never fill from |
|---------|-----------------|-----------|------------|-----------|-----------------|
| Name | User-saved org, customer/contact profile, domain-derived candidate | write | Missing name on create from domain | Rename/rebrand | Guessed legal names |
| Domain | Email domain, verified customer/contact, user correction | write | Missing domain from exact source | Conflicting domains | Personal/free domains |
| Website | Domain, verified profile, user correction | write | `https://{{org_domain}}` at threshold | Domain change | Unrelated scraped links |
| Industry | Verified profile, user correction, repeated direct context | suggest | Only if threshold lowered | Soft inference/conflict | One-off marketing words |
| Relationship status | Payment, invoice, partner/vendor lists | write | Client/partner/vendor above threshold | Past client, downgrade, stale conflict | Alias alone |
| Key contact | User choice, exact linked person, billing owner | suggest/write | Exact linked person when no current primary and threshold passes | Reassignment, multiple candidates | Same-name-only people |
| Work/billing/file links | Exact ids, direct references, user approval | write policy | Exact low-risk links | Weak graph matches | Filename similarity alone |
| Notes/summaries | Direct evidence and user approval | split | Salt-authored note append only | Subjective summaries | Rewrite user notes |
| Activity/history | Events and provenance | never-touch history | Append Keeper action only | Sensitive wording | Rewrite/delete/backfill |

## Value Taxonomy

- `relationship_status`: org scope of the shared `relationship_type` registry vocabulary — `client`, `prospect`, `lead`, `past_client`, `partner`, `vendor`, `unknown` (`team`/`personal` are person-only; legacy `other` is never written to new records). No rule infers `lead` or `past_client`; client→past_client downgrades are always ask-first.
- `record_status`: `active` / `inactive` — derived from 90-day activity aggregated across linked people, work, and billing; never overrides a manual choice.
- `industry_parent` / `industry_child`: registry industry taxonomy; child must belong to the selected parent.
- `industry`: short human-readable label; do not invent taxonomy-only values without source evidence.
- `key_contact`: person id for an already linked or linkable person.
- `website`: normalized URL derived from domain or verified profile.

## Signals

- `org_domain_known` - organization has a non-personal domain.
- `org_created_from_domain` - system created the organization from a company domain.
- `org_has_payment_received` - finance source shows payment from this organization.
- `org_has_invoice_sent` - billing source shows invoice/customer relationship.
- `org_has_primary_contact` - exact person id is available as primary contact candidate.
- `org_has_people` - people are linked to the organization.
- `org_domain_in_partner_list` - Me context lists the domain as a partner.
- `org_domain_in_vendor_list` - Me context lists the domain as a vendor.
- `inferred_industry` - verified or directly linked context provides an industry label (free text).
- `inferred_industry_parent` - directly linked context maps to a registry `industry_parent` slug.
- `inferred_industry_child` - directly linked context maps to a registry `industry_child` slug under the inferred parent.

Advisory signals (hygiene findings only — never fill rules):

- `org_missing_industry` - no industry set; surfaces a classify suggestion.
- `org_missing_key_contact` - no primary contact set; surfaces a suggestion when linked people exist.
- `org_duplicate_domain` - another org record shares this domain; merge review, never auto-merge.

## Context Budget

### Connected tools

- Required: none. The playbook can run from durable memory alone.
- Optional: communication sources, finance sources, billing sources, scheduling sources, document/file sources.
- Ignored: unrelated connected-app history, unrelated account-wide customer lists, unrelated file corpora.

### Memory scope

- Entity anchor: organization id, normalized domain, verified customer/contact id, or user-approved name.
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me.
- Relation filters: direct links, matching domain, same migrated client id, same verified external id.
- Time window: newest directly linked evidence first; stale conflict waits for review.
- Max records: enough to rank exact matches and top linked evidence; never load all workspace memory.
- Ranking: exact id/domain > user correction > verified customer/contact > direct work/billing > conversation/meeting > weak text mention.

### Operating surfaces

- Spaces: scope collaboration and visibility.
- Connections: scope graph relationships and relationship context.
- Visibility or approval boundary: cross-space or ambiguous changes wait for review.
- Trigger scope: organization resolved, direct linked evidence changed, manual review, Ask Salt add/enrich.

### Time

- Trigger schedule/deadline/elapsed-time rule: event-based; no scheduled sweep by default.
- Lookback/lookahead window: only directly linked evidence; if a future rule adds windows it must state exact dates.
- Timezone/business-day assumption: not used by this profile playbook.
- Recency or staleness rule: stale/conflicting evidence waits for review.

### LLM context

- Facts passed: normalized signals, direct linked evidence summaries, current fields, provenance, user corrections.
- Facts excluded: unrelated people/orgs/work/billing/files, raw full thread dumps, all connected-app history.
- Max input paths: entity anchor, direct links, and top ranked evidence only.

### Degradation

- If a required source is missing: no required connected source exists; run with durable memory.
- If optional sources are missing: skip the corresponding rules or hold suggestions for review.
- If too many records match: rank exact identifiers first and ask before merge/update.
- If evidence conflicts: keep current durable value and create a pending suggestion.

## Decision Order

1. Classify the incoming evidence as organization, person, alias, system sender, source artifact, newsletter, suspicious sender, or skip.
2. Resolve by exact domain, migrated client id, connected-system id, or user-approved identity.
3. Build bounded facts from directly linked people, work, billing, files, meetings, conversations, spaces, connections, and Me context.
4. Evaluate website, relationship status, industry, and key contact rules in authored order.
5. Apply values above threshold only when the surface is low-risk and not protected by a review boundary.
6. Record provenance for applied and pending suggestions.

## Negative Examples

- `billing@acme.com` should point to Acme as an organization contact point, not create a person.
- `noreply@payments.example` can be finance evidence, not a durable organization on its own.
- A spam domain with no user interaction should be skipped.
- Two organizations with the same name and different domains should wait for review.
- A generic alias without a company domain should wait or become a source artifact.

## Confidence Policy

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Default threshold is 85. Equality applies. Hard evidence from payments, invoices, and explicit workspace domain lists is 88-95. Website-from-domain is 85 because the domain is durable and the write is low-risk. Industry and key-contact inference remain below threshold by default unless the user lowers the threshold or stronger executable signals are added.

Thresholds never authorize merges, rebrands, primary-contact reassignment, protected note rewrites, archive/restore, or history mutation.

## Conflict Policy

User-corrected fields outrank connected-tool evidence. Exact verified ids outrank names. Domain conflicts, stale evidence, multiple key-contact candidates, and status downgrades wait for review.

## Provenance

Keeper records field, value, source, rule id, confidence, status, explanation, blueprint slug/version, and evidence including domain and signal context.

## Activity And History

Activity, audit logs, raw capture history, routing history, tool execution history, finding history, and provenance history are evidence only. Keeper can append new provenance or a new Keeper activity entry for work it performed; it cannot rewrite, delete, backfill, or restate history as if historical facts changed.
