# Contract Review — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

Solo operators sign their own contracts and rarely have a lawyer on call.
Contracts already arrive in Salt — uploads, Drive/Dropbox capture, email
attachments land in `resources`, where content analysis classifies them
(`category: contract`, `document_type: msa|nda|sow`). The detection exists;
this playbook listens for it. When a file is classified as a contract, Salt
reads the actual document, files a plain-English review as a note on the
file record, and — when the review flags something worth changing — drafts
one consolidated pushback email to the counterparty.

## Decisions

- **`record_condition` trigger on resources, not a `file_shared` signal.**
  The condition fires only when content analysis writes `category:
  contract` — deterministic, no LLM, no agent run on every shared file.
  The write hook in `memoryUpdateField` is the primary path; the 2h
  scanner sweep catches classification drift. This required extending the
  record-condition vocabulary to the `resource` entity (schema enum,
  route-key map, sweep table map).
- **The file's location comes from the Memory record.** v1 searched every
  connected storage app for "something contract-like". v2 fetches
  `memory.file_context` (new capability) — provider, external URL, AI
  summary, linked counterparty — so the agent does a targeted read, not a
  crawl. The verdict line still gates the review: we never "review" a
  document we couldn't read.
- **The review is the output — filed as a note on the file.** The
  `memory_update` output type existed in the schema vocabulary but the
  executor never handled it; wiring it (output branch + resume path +
  `SALT_WRITE_MEMORY_NOTE` sentinel) fixes it for every playbook, not just
  this one. `approval: ask` — the note queues as "Add note to <file>" and
  approving writes it through the canonical note path with the play run as
  provenance. The note persists on the record and shows up on the file's
  detail view.
- **Flags path: one approval covers the card the owner read.** When the
  review flags something, the run pauses on the send step before the
  output stage — so the note rides along in `approval_context` and is
  filed after the approved send executes. One card shows review + email;
  one approval covers both. A note failure after the send does not fail
  the run (the send already landed; the note is recoverable).
- **Pushback email is the owner's own negotiation email.** One
  consolidated message covering every flag at or above the severity
  threshold — collegial, paste-ready, no legalese, and deliberately no
  Salt disclaimer inside the email body (the review alongside it carries
  the posture). Send waits for the human; Open in Gmail writes a review
  draft from the same letter.
- **No classify step between review and pushback.** Classify requires an
  object/array source and draft steps produce strings; the review ends
  with a machine-checkable `REVIEW_OUTCOME: FLAGS|CLEAN` line and the
  pushback branch gates on it directly. Same deterministic gate, one less
  moving part.

## Legal posture (do not soften)

The danger zone is the *clean* review, not the flagged one — "nothing
needs changing" reads as a green light, and a green light from an AI on a
legal document is where unauthorized-practice-of-law exposure lives.
Rules, enforced in the prompt and locked by eval `promptIncludes`
assertions:

1. Every review ends with the disclaimer, no exceptions — including clean
   ones: "Salt isn't a lawyer and this isn't legal advice."
2. Critical flags name the next step: "Have a licensed attorney look at
   this clause before you respond."
3. No clearance language, ever. Forbidden phrases: "safe to sign",
   "looks good", "nothing to worry about", "approved". A clean review
   says what was checked and found standard for this kind of agreement —
   triage, not a green light — and that only a lawyer can give a
   definitive read.
4. The note carries the disclaimer too — it persists on the record and
   can be read later, out of context.
5. The pushback email carries no disclaimer — it's the owner's own email.

The ToS layer already disclaims professional advice
(`brand-identity/legal/early-access-terms.md` §7). Naming contract reviews
explicitly there is a legal-doc edit, deliberately not bundled here.

## Edge cases

- **Classifier misfire** (a proposal tagged `contract`): the agent's
  verdict stays FOUND only when the text is contract-like; MISSING ends
  the run quietly — no note, no email, no invented flags.
- **Storage disconnected / unreadable file**: MISSING with the reason
  ("Google Drive disconnected…") — the run ends quietly; reconnecting
  storage lets the next classification or sweep re-fire.
- **No counterparty email on file**: the pushback draft starts with
  "[No email on file — add the recipient]" — same convention as
  Invoice Reminder.
- **Re-classification of the same file**: record-condition dedup (72h
  cooldown on playbook+entity+condition) keeps repeat writes quiet; the
  note content is idempotent in shape ("reviewed <date> — N flags").
- **Severity inflation**: instructions forbid rating boilerplate as
  critical — a review that cries wolf trains the owner to ignore flags.

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| contract-with-flags | no | Happy path: found → review with critical flag + attorney-next-step → pushback email paused on send; prompt carries the disclaimer and forbidden-phrase list |
| clean-contract | no | Standard terms → review note queued (memory_update), no email; disclaimer and triage framing present in the prompt |
| not-a-contract | yes | Classifier misfire → MISSING → quiet end, no note, no fake review |
| file-unreadable | yes | Storage disconnected → MISSING with reason → quiet end |
