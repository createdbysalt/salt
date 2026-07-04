---
slug: keeper-entity-notes
kind: profile
name: Entity Notes
player_slug: keeper
description: Author durable learnings about people, organizations, and work from captured evidence.
when_to_use: |
  Runs when Capture or a system play extracts facts, preferences, context, relationships, or flags from emails, meetings, conversations, or work.
  Creates proposed notes for user review; high-confidence notes can auto-confirm based on workspace threshold.
trigger:
  type: capture
  signal: entity_learning_extracted
---

# Entity Notes

## What this does

Keeper authors structured learnings about people, organizations, and work. These notes capture durable information that doesn't fit into profile fields but matters for relationship context:

1. **Facts** - Objective information Salt learned (e.g., "Works at Acme as VP Engineering")
2. **Preferences** - How this person/org prefers to work (e.g., "Prefers email over calls")
3. **Context** - Background information about the relationship (e.g., "First payment received June 15")
4. **Relationships** - How entities connect to others (e.g., "Referred by Jane Smith")
5. **Flags** - Things that need attention (e.g., "No contact in 45 days")

All Salt-authored notes are created with provenance (source, confidence, because) and respect the user's auto-apply threshold setting. Notes below threshold create Play cards for review.

## When it runs

- **Email processed** - Extract facts from signatures, mentioned titles, company info
- **Meeting completed** - Extract context from meeting summary or notes
- **Payment received** - Create context note about billing relationship
- **Relationship status changed** - Create context note explaining the transition
- **Inactivity detected** - Create flag note when no contact for extended period
- **New connection made** - Create relationship note about how entities are linked

## How it works

1. **Extract learning** - Capture or intelligence processes extract structured facts from evidence.
2. **Classify note kind** - Determine if it's a fact, preference, context, relationship, or flag.
3. **Set confidence** - Based on evidence strength and extraction quality.
4. **Check threshold** - If `confidence >= autoApplyThreshold`, auto-confirm the note.
5. **Create note or Play** - Below threshold, create proposed note AND a Play card for review.
6. **Record provenance** - Store source, source_ref, confidence, because for transparency.

## What you approve

High-confidence notes can auto-confirm:
- Facts extracted from email signatures with clear patterns
- Context notes from system events (payments, status changes)
- Relationship notes from explicit references

Review is always required for:
- Preferences inferred from limited data
- Flags that could have false positives
- Any note that might be subjective

## Note authoring rules

```json
{
  "version": 1,
  "note_kinds": ["fact", "preference", "context", "relationship", "flag"],
  "rules": [
    {
      "id": "note-first-payment",
      "trigger": "payment_received",
      "entity_type": "person",
      "note_kind": "context",
      "template": "First payment received on {{payment_date}}",
      "confidence": 95,
      "because": "Payment event confirmed in billing system"
    },
    {
      "id": "note-meeting-context",
      "trigger": "meeting_completed",
      "entity_type": "person",
      "note_kind": "context",
      "template": "{{meeting_summary}}",
      "confidence": 75,
      "because": "Extracted from meeting summary"
    },
    {
      "id": "note-email-title",
      "trigger": "email_signature_parsed",
      "entity_type": "person",
      "note_kind": "fact",
      "template": "{{parsed_title}} at {{parsed_company}}",
      "confidence": 85,
      "because": "Extracted from email signature"
    },
    {
      "id": "note-status-change",
      "trigger": "relationship_status_changed",
      "entity_type": ["person", "organization"],
      "note_kind": "context",
      "template": "Relationship changed from {{from_status}} to {{to_status}}",
      "confidence": 95,
      "because": "Status transition recorded"
    },
    {
      "id": "note-inactivity-flag",
      "trigger": "no_contact_45_days",
      "entity_type": "person",
      "note_kind": "flag",
      "template": "No contact in 45 days",
      "confidence": 90,
      "because": "No emails, meetings, or messages since {{last_contact_date}}"
    },
    {
      "id": "note-referral",
      "trigger": "referral_detected",
      "entity_type": "person",
      "note_kind": "relationship",
      "template": "Referred by {{referrer_name}}",
      "confidence": 80,
      "because": "Reference detected in conversation or meeting"
    }
  ]
}
```

## Workspace settings

The `keeper-entity-notes` blueprint uses `profile_playbook_settings` for threshold configuration:

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_apply_threshold` | 85 | Notes >= this confidence auto-confirm |
| `ai_fallback_enabled` | true | Allow AI extraction when rules don't match |

## Note lifecycle

1. **Proposed** - Salt created the note, awaiting user review
2. **Confirmed** - User approved the note or it auto-confirmed
3. **Dismissed** - User said the note is wrong

Dismissed notes are hidden but not deleted for audit purposes.
