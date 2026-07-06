---
slug: keeper-organizations-records
kind: profile
name: Organizations Records
player_slug: keeper
description: Maintain durable organization records from trusted domain, people, work, billing, file, and relationship evidence.
when_to_use: |
  Runs when Capture or a system play resolves an organization from a company domain, invoice, payment, work item, file, meeting, or explicit user request.
  Re-runs when new directly linked people, work, billing, or workspace context can improve the organization record.
trigger:
  type: capture
  signal: org_resolved
---

# Organizations Records

## What this does

Keeper owns the durable organization record policy: which company-like evidence qualifies as an organization, which existing organization should update, which fields can be filled, which people and work belong to the organization, and which history must remain append-only. It covers the organization detail surface:

1. **Identity** - name, slug, domain, website, migrated-client identity, and whether the evidence is actually an organization.
2. **Relationship and status** - the org scope of the shared `relationship_type` vocabulary (`client`, `prospect`, `lead`, `past_client`, `partner`, `vendor`, `unknown`; `team` and `personal` are person-only) plus `record_status` (`active`, `inactive`).
3. **People graph** - linked people, primary contact, billing contact, team aliases, and ambiguous shared inboxes.
4. **Work and billing context** - active work, invoices, payments, outstanding balance, retainers, and client health evidence tied to the organization.
5. **Files, notes, and activity** - linked files, user notes, Salt-authored notes, provenance, and activity history.

Activity history, audit logs, raw capture events, tool execution logs, and provenance history are trust records. Salt may append new provenance or a clearly attributed Keeper activity entry for work it performed, but it never rewrites, deletes, or backfills historical events.

Executable today: the typed profile engine writes website, industry (free text plus taxonomy parent/child), relationship status, and key contact. The broader ownership policy below defines the operating model for future Organization Memory work.

## Field contract

The organization record has **16 contracted fields** (canon: `brand-identity/product-internal/features/keeper-field-contracts.md`, Orgs section). Every vocabulary comes from the taxonomy registry (`app/_features/memory/taxonomy/registry.ts`); Keeper never invents a value outside a registry vocabulary.

| Field | Format / vocabulary | Keeper write policy |
|-------|---------------------|---------------------|
| Name | text | Ask first |
| Billing Email | email | Ask first |
| Industry | `industry_parent` vocabulary | Ask first (inference rules run below the default threshold, so they propose rather than apply) |
| Industry Sub-category | `industry_child` vocabulary (must belong to the selected parent) | Ask first |
| Relationship | `relationship_type` vocabulary, org scope | Ask first (rules engine applies above the workspace threshold — that threshold IS the consent dial) |
| Primary Contact | reference — writes go through the `organization_people` join table, not a column | Ask first |
| Primary Contact Name | text | Derived from the primary contact; never written directly |
| Street Address / Line 2 / City / State / Postal Code | text | Ask first |
| Country | `country` vocabulary (ISO 3166-1 alpha-2) | Ask first |
| Tax ID | text (VAT, EIN, etc.) | Ask first |
| Website | url | Ask first (the domain rule applies above threshold for a missing website only) |
| Record Status | `record_status` (`active` / `inactive`) | **Auto-apply, derived**: aggregated across the org's linked people, work, and billing using the 90-day activity signals. Keeper only writes it when no one has explicitly set it and never overrides a manual choice. |

Relationship values Keeper must handle but no rule infers today: `lead`, `past_client`, `unknown`. Downgrading `client` to `past_client` is always a review case, never automatic. The legacy `other` value exists only on the legacy column and must not be written to new records.

## Organization detail page coverage

| Detail page surface | What must be maintained | Ownership policy |
|---------------------|-------------------------|------------------|
| Hero | Name, avatar/initials, relationship, last contact, summary, key links | Write or derive from trusted Org, People, Work, and Billing evidence. Quick actions are UI actions, not field claims. |
| Summary / Worth attention | Current org summary and attention context | Salt may generate or refresh from directly linked evidence; subjective or client-facing phrasing waits for review. |
| Details section | Name, record status, website, industry (parent + sub-category), relationship, key contact, last contact, billing email, address (street, line 2, city, state, postal code, country), tax ID | First-class contracted fields. Salt changes the actual field value when policy allows. Last contact is system-derived, not directly editable. |
| Billing metrics | MRR, lifetime revenue, outstanding balance, paid to date | Derived display from Billing records linked to the org. Keeper maintains the links; the metrics are computed, never written. |
| Tags | Low-risk descriptors and workspace-specific labels | Append or update only from repeated directly linked evidence or user correction. |
| Connections tab | People, work, meetings, files, spaces, and source artifacts linked to the org | Add exact, low-risk links above threshold. Merges, domain conflicts, and reassignment wait for approval. |
| Notes tab | User-authored and Salt-authored notes | User notes are protected. Salt appends clearly authored notes with provenance; it never silently edits or deletes user notes. |
| Activity tab | Timeline of things that happened | Append-only. Salt may append clearly attributed entries for actions it performed; it never rewrites history. |
| Health card | Health score inputs and factors | Derived from maintained fields and linked records; the score itself is display logic. |
| Plays card | Plays related to the org | Read-only from play queues. Keeper maintains the links that make play matching reliable. |

## When it runs

- **Organization resolved** - Capture or a system play identifies an organization from a non-personal company domain, invoice customer, payment customer, work item, file, meeting, or explicit user request.
- **New linked evidence arrives** - a person, work item, invoice, payment, file, conversation, meeting, or space is linked to the organization.
- **Manual review starts** - a user opens the organization record and asks Salt to re-check the fields.
- **Manual add via Ask Salt** - the user asks Salt to add or enrich an organization. Keeper scans read-capable connected sources, proposes fields with provenance, and waits for approval before writing user-facing or ambiguous data.

## How it works

1. **Admit or skip** - Salt first decides whether the evidence represents a durable organization. Company domains, invoice customers, payment customers, client portals, shared work, and explicit user requests can qualify. Newsletters, app senders, scams, and thin source artifacts do not.
2. **Classify the entity** - Salt distinguishes an organization from a person, shared alias, team inbox, system sender, source artifact, newsletter, or suspicious sender. A company name or non-personal domain should become an organization, not a fake person.
3. **Resolve identity** - Salt updates an existing organization when the domain, verified connected-system id, migrated client id, or exact user-approved name matches. Similar names, rebrands, subsidiaries, and conflicting domains wait for review.
4. **Limit context** - Salt uses only evidence anchored to the organization id, domain, directly linked people, directly linked work, billing records, meetings, conversations, files, spaces, and Me workspace context. It does not load all memory or all connected-tool history.
5. **Normalize facts** - Salt turns raw context into the registered org signals, and only those: `org_domain_known`, `org_created_from_domain`, `org_has_payment_received`, `org_has_invoice_sent`, `org_has_primary_contact`, `org_has_people`, `org_domain_in_partner_list`, `org_domain_in_vendor_list`, `inferred_industry`, `inferred_industry_parent`, `inferred_industry_child`, plus the extracted value `inferred_key_contact`. Three advisory signals exist for hygiene findings only, never fill rules: `org_missing_industry`, `org_missing_key_contact`, `org_duplicate_domain` — they surface suggestions and merge reviews, never direct field writes.
6. **Evaluate rules per field** - Salt checks website, industry, relationship status, and key contact rules in authored order. The first matching rule for each field wins.
7. **Set confidence and status** - Rule confidence is authored policy. If `confidence >= autoApplyThreshold`, Salt applies the value. If `confidence < autoApplyThreshold`, Salt holds it for review. Equality passes.
8. **Handle conflicts** - Salt does not overwrite user-corrected identity, reassign a primary contact, merge organizations, or change high-impact status when durable memory conflicts with connected evidence. Those cases wait for review.
9. **Record provenance** - Salt records the field, value, source, rule id, confidence, explanation, status, and evidence so the user can understand or correct the result.

## What you approve

High-confidence, low-risk fills can auto-apply: website from a trusted company domain, client status from direct finance evidence, partner/vendor status from Me workspace context, and exact low-risk field updates above threshold.

Review is always required for organization merges, domain conflicts, rebrands, parent/subsidiary decisions, primary contact reassignment when another person is already primary, archive/restore/status-lifecycle changes, user-authored notes, subjective summaries, and any client-facing wording.

## Workspace context

Organizations Records depends on bounded context, not broad search.

**What it uses**

- **Connected evidence** - communication sources for domains and aliases, finance sources for payments, billing sources for invoices, scheduling sources for meetings, and documents/files for directly linked organization evidence.
- **People memory** - people linked to the organization, people with matching company domains, key contact candidates, and user-corrected organization links.
- **Work and Billing memory** - active work, completed work, invoices, payments, retainers, outstanding balances, and billing contacts directly tied to the organization.
- **Me memory** - workspace domains, partner domains, vendor domains, and business context that calibrates relationship status.
- **Spaces and Connections** - collaboration boundaries and graph links that scope where the organization relationship applies.

**What it ignores**

- Unrelated people, organizations, work, files, billing records, conversations, meetings, and connected-app history.
- Same-name organizations without domain, client id, connected-system id, or user-confirmed relationship evidence.
- Generic aliases and system senders unless they point to a durable organization contact point.

## Record lifecycle

**Qualifies as an organization when**

- A non-personal domain appears in direct relationship evidence.
- A payment, invoice, contract, portal customer, saved company, or explicit user request names the organization.
- Work, files, meetings, or conversations are directly anchored to a company identity.

**Does not qualify as an organization when**

- The evidence is only a newsletter sender, app notification, receipt-only system sender, spam/scam, or unrelated merchant artifact.
- The source is a generic alias with no company domain or user-confirmed organization.
- The company name is mentioned only in forwarded text, marketing copy, or an unrelated attachment.

**Create, update, merge, or skip**

- Update an existing organization when the same domain, migrated client id, or verified connected-system id already exists.
- Create a new organization when company-domain or user-approved evidence is clear and no existing record matches.
- Suggest a merge when names, domains, people, billing, and work strongly overlap but identifiers differ.
- Never auto-merge same-name organizations across different domains, parent/subsidiary structures, or unrelated work contexts.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Admission and identity | User request, company domain, verified customer/contact id, invoice/payment customer, migrated client id | Write policy | Create/update exact domain or verified id matches | Similar names, rebrands, subsidiaries, conflicting domains | Scam, newsletter, system sender, unrelated merchant |
| Name | User-saved org, connected customer/contact, domain-derived candidate | Write policy | Fill missing name on create | Rename existing org, rebrand, parent/subsidiary naming | Marketing copy, guessed legal names |
| Domain and website | Company email domain, verified customer website, user correction | Write policy | Fill missing website from trusted domain above threshold | Domain change, conflicting domains, personal/free domains | Scraped unrelated links, forwarded signatures |
| Industry | Verified profile, user correction, repeated direct org context, taxonomy inference | Suggest policy | None by default: all industry rules (free text 80, parent 80, child 75) run below the default 85 threshold, so they propose; they apply only if the workspace lowers its threshold | Soft inference, conflicting categories, child without a matching parent | One-off marketing phrases, values outside the industry taxonomy |
| Billing email, address, tax ID | Verified customer/billing records, signature blocks, user correction | Write policy | None by default | Fill or correct from directly linked billing/contact evidence | Scraped footers, forwarded content, unrelated documents |
| Record status | 90-day activity signals aggregated across linked people, work, and billing; user action | Write policy (derived) | Derive active/inactive from the aggregate signals when no one has explicitly set it | Any change on top of an explicit manual choice; archive and restore | Overriding a manual status choice; silent destructive or visibility changes |
| Tags | User correction, repeated directly linked evidence, explicit workspace facts | Write policy | Low-risk tags from strong repeated evidence | Preference-like or client-facing labels | One-off comments, unrelated workspace memory |
| Relationship status | Payments, invoices, partner/vendor domains, workspace context | Write policy | Client/partner/vendor from direct evidence above threshold | Past-client, other, status downgrade, stale/conflicting evidence | Generic alias alone, weak domain-only evidence |
| Key contact | Explicit user choice, linked person role, billing contact, primary conversation owner | Suggest policy | Exact linked person only when no current primary and confidence passes | Reassign existing primary, ambiguous multiple contacts | Same-name-only people, aliases, system senders |
| Work and billing links | Exact ids, invoices, payments, contracts, user approval | Write policy | Add exact low-risk links above threshold | Weak graph links, reassignment, duplicate customer matches | Filename/name similarity alone |
| Notes and summaries | User notes, Salt notes, directly linked evidence | Split ownership | Append Salt-authored notes with provenance | Subjective summary, client-facing phrasing | Rewrite or delete user notes |
| Activity and audit history | Activity entries, provenance, capture logs, tool logs | Append-only evidence | Append new Keeper provenance/activity for Keeper work | Sensitive activity wording | Rewrite, delete, backfill, mutate history |

**Negative examples**

- `billing@acme.com` can prove Acme is an organization contact point, but it should not become a person.
- `noreply@payments.example` can provide finance evidence, but it is not itself an organization unless tied to a real customer.
- Two companies called Studio North with different domains should never merge automatically.
- A cold bulk outreach domain with no reply, work, meeting, invoice, or saved contact should wait or skip.

Executable today: the JSON below covers the fields the current profile runner can execute. Industry rules intentionally sit below the default 85 threshold so taxonomy classification proposes instead of applying (the field contract says industry is ask-first).

```json
{
  "version": 1,
  "fields": ["website", "industry", "industry_parent", "industry_child", "relationship_status", "key_contact"],
  "rules": [
    {
      "id": "org-website-domain",
      "field": "website",
      "when": { "signal": "org_domain_known", "op": "eq", "value": true },
      "set": { "value": "https://{{org_domain}}" },
      "confidence": 85,
      "because": "The organization has a trusted company domain"
    },
    {
      "id": "org-payment-client",
      "field": "relationship_status",
      "when": { "signal": "org_has_payment_received", "op": "eq", "value": true },
      "set": { "value": "client" },
      "confidence": 95,
      "because": "Finance evidence shows this organization paid you"
    },
    {
      "id": "org-invoice-client",
      "field": "relationship_status",
      "when": { "signal": "org_has_invoice_sent", "op": "eq", "value": true },
      "set": { "value": "client" },
      "confidence": 90,
      "because": "Billing evidence shows you invoiced this organization"
    },
    {
      "id": "org-partner-domain",
      "field": "relationship_status",
      "when": { "signal": "org_domain_in_partner_list", "op": "eq", "value": true },
      "set": { "value": "partner" },
      "confidence": 90,
      "because": "The organization domain is on your partner list"
    },
    {
      "id": "org-vendor-domain",
      "field": "relationship_status",
      "when": { "signal": "org_domain_in_vendor_list", "op": "eq", "value": true },
      "set": { "value": "vendor" },
      "confidence": 88,
      "because": "The organization domain is on your vendor list"
    },
    {
      "id": "org-industry-inferred",
      "field": "industry",
      "when": { "signal": "inferred_industry", "op": "exists" },
      "set": { "value": "{{inferred_industry}}" },
      "confidence": 80,
      "because": "Direct organization context includes an industry label"
    },
    {
      "id": "org-industry-parent-inferred",
      "field": "industry_parent",
      "when": { "signal": "inferred_industry_parent", "op": "exists" },
      "set": { "value": "{{inferred_industry_parent}}" },
      "confidence": 80,
      "because": "Inferred from domain patterns, company name, or existing industry classification"
    },
    {
      "id": "org-industry-child-inferred",
      "field": "industry_child",
      "when": { "signal": "inferred_industry_child", "op": "exists" },
      "set": { "value": "{{inferred_industry_child}}" },
      "confidence": 75,
      "because": "Inferred from specific signals in domain, communications, or work context"
    },
    {
      "id": "org-key-contact-inferred",
      "field": "key_contact",
      "when": { "signal": "org_has_primary_contact", "op": "eq", "value": true },
      "set": { "value": "{{inferred_key_contact}}" },
      "confidence": 82,
      "because": "The linked person is the clearest primary contact for this organization"
    }
  ]
}
```
