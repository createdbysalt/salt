---
slug: keeper-entity-notes
kind: profile
name: Entity Notes
player_slug: keeper
description: Author durable learnings about people, organizations, and work from captured evidence.
when_to_use: |
  Runs when Capture or a system play extracts facts, preferences, context, relationships, or flags from emails, meetings, conversations, or work.
  Salt-authored notes propose by default; only objective system-event notes may auto-confirm at the workspace threshold.
trigger:
  type: capture
  signal: entity_learning_extracted
---

# Entity Notes

## What this does

Keeper authors structured learnings about people, organizations, and work. Notes capture durable information that doesn't fit into contracted profile fields but matters for relationship context. Notes are the overflow memory of the record system — everything with a proper field goes in the field (see the per-surface record playbooks); everything else worth remembering becomes a note.

Note kinds (`note_kind` column, registry canon):

1. **fact** - Objective information Salt learned (e.g., "Works at Acme as VP Engineering")
2. **preference** - How this person/org prefers to work (e.g., "Prefers email over calls")
3. **context** - Background information about the relationship (e.g., "First payment received June 15")
4. **relationship** - How entities connect to others (e.g., "Referred by Jane Smith")
5. **flag** - Things that need attention (e.g., "No contact in 45 days")
6. **general** - Default for user-authored notes with no classification

## How the system actually works (implemented today)

Two authoring paths write to the shared `notes` table, scoped by `entity_type` (`person` | `organization` | `work`) + `entity_id`:

| Path | author_type | source | status on create | note_kind |
|------|-------------|--------|------------------|-----------|
| User writes a note (EntityNotesTab) | `user` | `manual` | `confirmed` | `general` |
| Salt authors a note (`createSaltNote` action) | `salt` | `ai_capture` / `ai_inference` / `system` | `proposed`, or `confirmed` if `confidence >= auto_apply_threshold` | classified by the author |

Every Salt-authored note carries provenance: `source`, `source_ref` (the capture/email/meeting id that evidences it), `confidence`, and the explanation shown to the user. Proposed notes surface inline in the entity's Notes tab with Confirm/Dismiss controls.

**Not wired yet (honesty note):** no producer currently calls `createSaltNote` — the capture/intelligence pipeline does not yet extract entity learnings into notes, and there is no rule/trigger engine for note authoring. The action, threshold setting, provenance columns, and Confirm/Dismiss UI all exist and are tested; the extractor that feeds them is future work. The `trigger` frontmatter above declares the intended capture signal but nothing dispatches on it yet (see the trigger-truth workstream in the playbook-authoring plan). Until the extractor exists, notes are user-authored plus whatever chat-side system plays create with explicit user approval.

## Write policy

Field-contract canon: notes are **ask-first**. In practice:

- **Salt-authored notes default to `proposed`.** The user confirms or dismisses them on the entity's Notes tab.
- **Auto-confirm is reserved for objective system-event notes** — things that are mechanically true (a payment landed, a status transition was recorded). Extractors must author subjective or inferred notes (preferences, flags, anything with judgment in it) below the workspace threshold so they always propose. When in doubt, propose.
- **User notes are protected.** Salt never edits, rewrites, or deletes a user-authored note. Corrections happen by proposing a new Salt note or by the user editing their own.
- **Dismissed notes stay dismissed.** They are hidden from reads but kept for audit. A dismissed note must not be re-proposed from the same evidence.
- **Memory-write monopoly applies.** Among playbooks, only Keeper mutates notes. Chat-side `memory_*` system plays are the human-in-chat path and are unaffected; acting playbooks that learn something emit signals/captures for Keeper to process — they never write notes directly.

## Workspace settings

The `keeper-entity-notes` blueprint reads `profile_playbook_settings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_apply_threshold` | 85 | Salt notes at or above this confidence are created `confirmed`; below it, `proposed`. Applies only to objective system-event notes per the write policy above. |

Changing the threshold only changes `proposed` vs `confirmed` on create. It never changes what evidence was used, the provenance recorded, or the protections on user-authored notes.

## Note lifecycle

1. **Proposed** - Salt created the note; it awaits Confirm/Dismiss on the entity's Notes tab.
2. **Confirmed** - The user approved it, or an objective system-event note cleared the threshold.
3. **Dismissed** - The user said it's wrong. Hidden from reads and from downstream consumption, kept for audit, never re-proposed from the same evidence.

Pinning and archiving are user actions; Salt does not pin, unpin, or archive notes.

## How notes are consumed

Confirmed notes are read back into Salt's working context (memory-consumption canon):

- **Entity narratives** - person/org summaries read confirmed notes only, pinned-first, bounded (~5 recent, character-capped) so one verbose note cannot flood the context.
- **Play creation** - the scoped memory loader feeds confirmed entity notes (bounded count and length) into play drafting for the entities involved.
- Proposed and dismissed notes are never consumed. Confirmation is the consent gate between "Salt noticed something" and "Salt acts on it."

## Distinct from operator memory facts

Notes about the **operator** (the user themselves) do not live here. The Me surface uses `operator_memory_facts` with its own proposed → confirmed/revised/dismissed loop, vote counts, and provenance receipts — owned by the `keeper-me` playbook. Entity notes are always about a person, organization, or work record in the workspace's memory, never about the operator.

## Negative examples

- A meeting summary belongs on the meeting record, not as a person note — link it, don't duplicate it.
- "Client seems frustrated" is subjective: it must propose, never auto-confirm, regardless of extraction confidence.
- A fact that belongs in a contracted field (title, relationship, website) goes through the field's record playbook and its rules — not a note.
- A dismissed "Prefers email over calls" must not reappear because the same email thread was re-processed.
- An acting playbook that notices a referral emits a capture/signal for Keeper; it does not write a relationship note itself.
