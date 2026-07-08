---
slug: keeper-files-records
kind: profile
name: Files Records
player_slug: keeper
description: Maintain durable file records from content extraction, signature-platform evidence, and source-context links.
when_to_use: |
  Runs when Capture resolves a file from uploads, email attachments, connected storage, or signature platforms.
  Re-runs when signature events, extraction results, or new source context can improve the record.
trigger:
  type: capture
  signal: file_resolved
---

# Files Records

## What this does

Keeper owns the durable file record policy: how files get classified, which lifecycle transitions Salt may make, which links a file should carry, and what about a file Salt must never touch. It covers the full file record surface:

1. **Identity** - the file's title, its description, and its kind (document, link, photo, video, audio, transcript, other). Kind is derived from the file's MIME type and is read-only — the editor is read-only because kind derives from the file itself.
2. **Classification** - the business `file_category` (11-value canon: brand_asset, deliverable, contract, invoice, proposal, reference, media, notes, process, screenshot, other) and, for documents, the specific `file_document_type`.
3. **Lifecycle** - the `file_lifecycle_status` for signable documents: draft, sent, viewed, awaiting_signature, signed, expired, archived.
4. **Extracted facts** - due, expiry, and signed dates; amounts in cents with an uppercase currency code; and the follow-up date the user decides.
5. **Links and scope** - person, organization, and work references (attachment edges), the `is_operator_asset` flag that scopes a file to the Me Files tab, client sharing, and tags.

Activity history is append-only. Salt can read the timeline as evidence and can append a clearly attributed activity entry for work Salt actually performed, but it never rewrites, deletes, or backfills what happened.

## Files coverage

The Files Records playbook is the policy owner for the record data that powers the Files directory and the file preview panel (overview and activity).

| Surface | What must be maintained | Ownership policy |
|---------|-------------------------|------------------|
| Directory row | Title, kind, category, lifecycle, updated timestamp | Title and kind are never written by Salt; category and lifecycle follow the policies below. |
| Preview panel | The rendered file or link target | Read-only. Salt never modifies file contents or storage location. |
| Overview | Description, document type, dates, amount and currency, sharing | Classification and extracted dates apply above threshold; description proposals wait for review. |
| Connections | Person, organization, and work attachment edges | Auto-link from exact source context (email attachment → thread participants). Similarity-only links wait for review. |
| Me Files tab | The `is_operator_asset` flag scoping operator-owned assets | Never written by Salt. Empty means FALSE — a record's file, not the operator's own asset. |
| Activity | Timeline of lifecycle events and Salt actions | Append-only. Salt may append entries for changes it made. It never rewrites historical events. |

## When it runs

- **File resolved** - Capture identifies a file from an upload, email attachment, connected storage, or a signature platform.
- **Signature event arrives** - a signature-platform webhook reports sent, viewed, signed, or expired.
- **Extraction completes** - AI extraction proposes category, document type, amounts, or dates from the file's content.
- **New source context arrives** - the file appears in a thread, meeting, or work item that clarifies its links.
- **Manual review starts** - a user opens the file and asks Salt to re-check the fields.

## How it works

1. **Admit or skip** - Salt asks whether the artifact deserves a durable file record. Tracking pixels, email boilerplate images, and duplicate attachments of an already-tracked file do not qualify.
2. **Derive the kind** - Kind comes from the file's MIME type. It is derived from the file itself and is read-only for everyone, including Salt.
3. **Classify from content** - AI extraction proposes the business category and, for documents, the document type. Above threshold the classification applies; below threshold it waits for review.
4. **Extract the facts** - Due, expiry, and signed dates and financial amounts come from document extraction and apply above threshold. The currency for an extracted amount is an ask-first correction (uppercase ISO 4217 registry canon, 10-value set: USD, EUR, GBP, CAD, AUD, CHF, JPY, SGD, NZD, INR).
5. **Track the lifecycle** - Signature-platform evidence drives lifecycle directly: a signed webhook moves the document to signed. Lifecycle changes inferred from conversation ("they said they signed it") are proposals, not writes.
6. **Link from source context** - A file that arrived as an email attachment auto-links to the thread's known participants and their org/work context when the match is exact. Filename similarity alone never creates a link.
7. **Watch expiry as hygiene** - An approaching expiry date is a hygiene signal that surfaces a play card. It is not a field write — Salt does not pre-emptively flip the document to expired.
8. **Set confidence and status** - If `confidence >= autoApplyThreshold`, Salt applies the value. Below threshold, it holds the change for review.
9. **Record provenance** - Salt records the field, value, source, confidence, explanation, status, and evidence so the user can understand or correct the result.

## What you approve

High-confidence extraction auto-applies: category, document type, due/expiry/signed dates, and amounts, each above threshold. Lifecycle transitions backed by signature-platform evidence apply automatically.

Some surfaces always wait: classification below threshold; lifecycle transitions inferred from conversation rather than platform evidence; description text; currency corrections; the follow-up date (Salt suggests, you decide); and any link based on similarity rather than exact source context.

## Workspace context

Files Records depends on bounded context, not broad search.

**What it uses**

- **The file itself** - MIME type, extracted text, and document structure.
- **Signature platforms** - sent, viewed, signed, and expired events for signable documents.
- **Source context** - the email thread, meeting, work item, or upload action the file arrived through.
- **People, Org, and Work memory** - only records tied to the source context's participants.

**What it ignores**

- Unrelated people, orgs, work, billing records, meetings, and conversations.
- Other files, except exact-duplicate detection.
- Broad workspace memory not anchored to this file's source context.

**Time policy**

- The trigger is evidence-based, not scheduled.
- Expiry-approaching hygiene uses the file's own expiry date; it surfaces a signal rather than writing a field.
- Treat conflicting extraction results across versions of a file as a review case, not an auto-apply case.

## Record lifecycle

**Qualifies as a file record when**

- The user uploads it, links it, or asks Salt to track it.
- It arrives as an attachment or artifact tied to a known person, org, work item, or meeting.
- A signature platform or connected storage reports a document relevant to this workspace.

**Does not qualify when**

- It is email boilerplate: signature images, tracking pixels, logos in footers.
- It is an exact duplicate of an already-tracked file — that is new source context for the existing record, not a new record.
- It is an unrelated artifact with no tie to any person, org, work, or meeting in the workspace.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Title | Upload name, user rename | User only | None | None | Renaming or "cleaning up" titles |
| Kind | MIME type of the file itself | Derived, read-only | None — derived from the file | None | Any write; the editor is read-only by design |
| URL (link-kind files) | The user | User only | None | None | Rewriting link targets |
| Category | AI extraction from content | Write policy | Extraction above threshold | Extraction below threshold, reclassifying a user-set category | Guessing from the filename alone |
| Document type | AI extraction from content | Write policy | Extraction above threshold for document-kind files | Extraction below threshold, conflicts with category | Assigning to non-document kinds |
| Description | Extraction, source context | Write policy | None by default | Propose a short description with provenance | Overwriting user-written descriptions |
| Lifecycle | Signature-platform events | Write policy | Platform-evidenced transitions (sent, viewed, signed, expired) | Transitions inferred from conversation or content | Skipping states or reversing signed |
| Due / Expiry / Signed dates | Document extraction, signature platform | Write policy | Extraction above threshold; signed date from platform evidence | Conflicting dates across document versions | Editing dates to change hygiene signals |
| Follow-up date | Salt suggestion, user decision | Split ownership | None — Salt suggests, you decide | Propose a follow-up date with reasoning | Setting it silently |
| Amount + currency | Document extraction | Write policy | Amount extraction above threshold | Currency set or correction (uppercase ISO 4217 registry canon, 10-value set) | Converting amounts between currencies |
| Person/org/work links | Exact source context (thread participants, meeting, work item) | Write policy | Exact source-context match above threshold | Similarity-only matches, reassigning existing links | Filename-similarity links |
| Shared with client | The user | User only | None | None | Any visibility change |
| Operator asset flag | The user | User only | None | None | Any write; empty means FALSE — a record's file, not the operator's asset |
| Tags | User correction, repeated directly linked evidence | Write policy | Low-risk tags from strong repeated evidence | Anything that affects sharing or reporting | One-off comments, unrelated memory |
| File contents and storage | The file itself | Read-only | None | None | Modifying contents, moving storage, or re-uploading |
| Provenance and explanations | Rule output, confidence, evidence, source | Read-only history | Append new provenance rows | Correct the current field via review | Rewrite provenance history |
| Activity and audit history | Lifecycle events, extraction runs, Salt actions | Append-only evidence | Append a clearly attributed Salt activity entry | Any sensitive or high-impact activity entry | Rewrite, delete, backfill, or mutate historical events |

**What it never touches**

Salt never modifies a file's contents or storage location, never renames a file, never changes client visibility, and never sets the operator-asset flag. Kind is derived from the file itself and is read-only for everyone. Provenance and activity history are trust records: Salt appends clearly attributed entries for its own actions and nothing else.

**Negative examples**

- A logo image in an email footer should not become a file record.
- "acme-contract-v2.pdf" should not link to Acme on the filename alone; the thread participants or work context must match.
- A client writing "I signed it this morning" proposes a signed transition; only the signature platform's event applies it.
- A contract expiring next week gets a hygiene play card — Salt does not flip it to expired early.
- A brand-kit PDF the operator uploaded for their own business is not Salt's to flag as an operator asset; the user sets that scope.

Executable today: the typed profile engine writes **category, lifecycle_status, organizationId, personId, and workId** — nothing else. The ownership policy above governs the durable file record and the roadmap for the engine as it grows.

```json
{
  "version": 1,
  "fields": ["category", "lifecycle_status", "organizationId", "personId", "workId"],
  "rules": [
    {
      "id": "file-lifecycle-sent",
      "field": "lifecycle_status",
      "when": { "signal": "file_signature_event_sent", "op": "eq", "value": true },
      "set": { "value": "sent" },
      "confidence": 95,
      "because": "Signature platform reports the document was sent"
    },
    {
      "id": "file-lifecycle-viewed",
      "field": "lifecycle_status",
      "when": { "signal": "file_signature_event_viewed", "op": "eq", "value": true },
      "set": { "value": "viewed" },
      "confidence": 92,
      "because": "Signature platform reports the document was viewed"
    },
    {
      "id": "file-lifecycle-signed",
      "field": "lifecycle_status",
      "when": { "signal": "file_signature_event_signed", "op": "eq", "value": true },
      "set": { "value": "signed" },
      "confidence": 95,
      "because": "Signature platform reports the document was signed"
    },
    {
      "id": "file-lifecycle-expired",
      "field": "lifecycle_status",
      "when": { "signal": "file_signature_event_expired", "op": "eq", "value": true },
      "set": { "value": "expired" },
      "confidence": 95,
      "because": "Signature platform reports the document expired"
    },
    {
      "id": "file-category-inferred",
      "field": "category",
      "when": { "signal": "inferred_category", "op": "exists" },
      "set": { "value": "{{inferred_category}}" },
      "confidence": 80,
      "because": "Document extraction classified the file category"
    },
    {
      "id": "file-org-source-match",
      "field": "organizationId",
      "when": { "signal": "file_source_context_match", "op": "eq", "value": true },
      "set": { "value": "{{inferred_organization_id}}" },
      "confidence": 85,
      "because": "Source context (thread, meeting) links to an organization"
    },
    {
      "id": "file-person-source-match",
      "field": "personId",
      "when": { "signal": "file_source_context_match", "op": "eq", "value": true },
      "set": { "value": "{{inferred_person_id}}" },
      "confidence": 85,
      "because": "Source context (thread, meeting) links to a person"
    },
    {
      "id": "file-work-linked",
      "field": "workId",
      "when": { "signal": "inferred_work_id", "op": "exists" },
      "set": { "value": "{{inferred_work_id}}" },
      "confidence": 80,
      "because": "File context links to a work item"
    }
  ]
}
```
