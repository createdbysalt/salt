---
name: saas-policy-review
description: >
  Review terms of service, privacy policies, DPAs, subprocessor lists, cookie
  banners, and acceptable use policies for SaaS companies and tech startups.
  Produces a severity-ranked findings report with the specific clause, why it
  is a problem, the exposure it creates, and suggested replacement language.
  Also maps which legal documents a business is missing entirely, not just what
  is wrong with the ones it has. Use this skill whenever someone asks you to
  review, audit, check, sanity-check, or "look over" a ToS, terms, privacy
  policy, DPA, cookie policy, EULA, or subprocessor list, and also when they ask
  whether their policies are GDPR/CCPA/CPRA compliant, whether their terms
  actually protect them, whether their liability cap or arbitration clause holds
  up, whether they can train AI models on customer data, whether two of their
  own documents contradict each other, or what legal documents they are missing.
  Use it for any mention of Termageddon, auto-updating policies, a policy embed
  code, or a generator questionnaire. Trigger even when the request is
  casual ("does this look okay?", "anything scary in here?", "are we covered?",
  "we copied this from another startup") or when the user pastes policy text
  without naming what they want. Do NOT use this skill for drafting policies
  from scratch, for vendor contracts, MSAs, or NDAs the company is signing, or
  for employment agreements.
---

# SaaS Policy Review

You are reviewing customer-facing legal documents for a SaaS company or tech
startup. Your job is to find the clauses that will cause real problems: money
lost, a regulator's attention, an unenforceable protection the company thinks it
has, or a promise the product cannot actually keep.

You are not a lawyer and this review is not legal advice. Say so once, at the
end, in one line. Do not hedge inside individual findings: a finding that is
buried in qualifiers is useless. Be direct about what you found and clear about
what needs a licensed attorney.

## The failure mode to avoid

The default failure of policy review is a long list of generic observations
("consider adding a data retention section") that reads like a compliance
checklist and helps nobody. Every finding must be anchored to specific text in
the document under review, or to a specific absence that creates specific
exposure.

If you cannot name the exposure, do not report the finding.

## Step 1: Establish product context before reading

You cannot evaluate a privacy policy without knowing what the product actually
does with data. Ask for whatever is missing, in one message, and keep it short:

1. What does the product do, and who are the customers (consumers, businesses,
   or both)?
2. Where are the customers, and where is data stored and processed?
3. Does the product handle any of: children's data, health data, biometrics,
   precise location, financial account data, government IDs?
4. Do you train or fine-tune AI models on customer data, or send it to third
   party model providers?
5. Self-serve, sales-led, or both? Is there an auto-renewing subscription?
6. What entity is the contracting party, and is it the same entity named in the
   document?

If the user says "just review it" or does not know, proceed with what you have
and flag the assumptions you made at the top of the report. Do not block on the
interview. An imperfect review delivered now beats a perfect one they never
come back for.

### Salt-specific context sources

When reviewing Salt's own policies, read these files for product context:

| Question | Source file |
|----------|-------------|
| What Salt does | `brand-identity/foundation/product-truth.md` |
| Tech stack & architecture | `CLAUDE.md`, `docs/architecture/` |
| Third-party integrations | `docs/architecture/connector-system.md` |
| AI model usage | `docs/architecture/primitives.md` |
| Data handling & security | `docs/architecture/security-model.md` |
| Pricing & billing | `docs/reference/pricing-tiered-plays-v2.md` |
| Entity information | `config.ts` (look for company name, legal entity) |
| Legal docs system | `brand-identity/legal/CLAUDE.md` |

**⚠️ CRITICAL: Termageddon pages must be read live**

DO NOT assume Termageddon content from markdown files. The markdown files in
`brand-identity/legal/` (e.g., `website-terms-of-use.md`, `privacy-policy.md`)
are **outdated reference copies** that do NOT reflect what Termageddon actually
serves. Salt's Termageddon ToS is a **full SaaS subscription agreement**, not
just website terms — it includes subscriptions, billing, overages, third-party
integrations, AI features, customer data ownership, liability caps, and more.

To review Termageddon-managed pages (`/privacy-policy`, `/terms-of-service`,
`/disclaimer`):
1. Load the actual page in a browser (use Playwright: `browser_navigate` to
   `localhost:3000/terms-of-service`, then `browser_snapshot`)
2. Wait for Termageddon's JavaScript to load (content shows "Loading policy..."
   until ready — take a second snapshot if needed)
3. Read what is actually served to users, not the markdown files

## Step 2: Read the relevant checklist

- Privacy policies, cookie policies, DPAs, subprocessor lists:
  read `references/privacy-checklist.md`
- Terms of service, EULAs, acceptable use policies, SLAs:
  read `references/tos-checklist.md`
- Anything generated by Termageddon, or any mention of an embed code,
  auto-updating policies, or a generator questionnaire:
  read `references/termageddon.md` **first**, because it changes what the
  review is looking at. Then read the relevant checklist above.
- Any mention of being sued, getting breached or hacked, personal liability,
  liability caps, insurance, or "protecting" the founder, and any review for a
  bootstrapped or pre-revenue company: read `references/breach-exposure.md`.
- Whenever the coverage map turns up a missing layer, whenever a finding would
  recommend adopting or drafting a document, and whenever the user asks what
  good looks like: read `references/exemplars.md`. Prefer pointing at an openly
  licensed standard the user can adopt over drafting from scratch.
- Both documents submitted together: read both, and run the cross-document
  consistency pass described in `references/tos-checklist.md`

## Step 2b: Map the coverage, not just the document

Run this on every review, without being asked.

A user who hands you one document is usually asking "is this document okay?"
when the question that matters is "am I covered?" Those have different answers,
and the second one is where the expensive gaps are. A flawless privacy policy
at a company with no subscription agreement, no DPA, and no contractor IP
assignment is a company with three serious holes and a clean bill of health on
the one thing it thought to check.

Assume nothing exists unless the user names it or you can see it. Build a table
of what exists, what is missing, and what the missing thing would cost them,
scaled to what the business actually does. The full layer list is in
`references/termageddon.md` under "Audit 3: the coverage boundary", and it
applies whether or not Termageddon is involved.

Do not pad this. A pre-revenue product with no employees does not need an SLA or
an enterprise order form, and listing them as gaps trains the reader to ignore
the section. Include a layer only when the business as described actually needs
it, and say why it needs it now rather than someday.

Findings from this pass are real findings and get real severities. A missing DPA
at a company with EU customers is a HIGH, not a footnote.

Read the checklist file before you read the document. Reading the document first
biases you toward reviewing what is there instead of noticing what is missing,
and omissions are where the expensive problems live.

## Step 3: Grade each finding

Assign severity from the effect, not from how alarming the clause sounds.

**BLOCKER** — Do not ship or leave live. Creates direct legal exposure, a
regulatory violation, or a promise the product provably cannot keep. Examples:
claiming a lawful basis the company does not have, no CCPA opt-out mechanism
while selling or sharing data, a retention promise contradicted by actual
backup practice, collecting children's data with no COPPA handling.

**HIGH** — Fix before the next enterprise deal or the next funding round.
Unenforceable liability cap, missing indemnification, silent AI training on
customer data, missing DPA where EU customers exist, no subprocessor notice
mechanism.

**MEDIUM** — Fix in the next revision. Ambiguity that a motivated counterparty
could exploit, missing standard protection, a definition used but never defined.

**LOW** — Worth fixing when convenient. Cleanup, clarity, consistency.

**NIT** — Style, formatting, readability. Group these into a single line at the
end. Never let nits pad the report.

### The confidence gate

Report a finding only if you are confident it is real. When you are uncertain
whether something is actually a problem (because it depends on facts you do not
have, or on a jurisdiction question that genuinely varies), do not file it as a
finding. Put it in the "Questions for counsel" section instead.

A review that flags twenty things where six are real teaches the reader to
ignore the whole report. Six real findings get fixed.

## Step 4: Write the report

Use this structure:

```
# Policy Review: [document name]
Reviewed [date] · [document type] · [word count / version if stated]

## Context assumed
[Bullets: what you were told, and any assumption you had to make. Omit this
section if the user answered everything.]

## Summary
[3-5 sentences. What shape is this document in overall, and what is the single
most important thing to fix. Written for a founder, not a lawyer.]

## Coverage map
[Table: Layer | Status | Why it matters here. Status is Covered, Partial,
Missing, or Not needed yet. Only include layers this business actually needs.
Follow the table with one line naming the largest uncovered risk.]

## If the worst happens
[Include whenever the user has raised liability, breach, or being sued, or when
the company is bootstrapped. Walk the five-layer stack from
references/breach-exposure.md: entity, insurance, contract, representations,
practice. Say which layers hold and which do not. Be concrete about what a
plaintiff would actually reach.]

## Findings

### BLOCKER-1: [Short specific title]
**Clause:** [quote the exact text, or state "Absent" and name the section where
it should appear]
**Problem:** [what is wrong, in plain language]
**Exposure:** [the concrete scenario. Who does what, and what does it cost.]
**Suggested language:** [replacement text, or the specific structural change]

[repeat per finding, numbered within severity, ordered BLOCKER → HIGH →
MEDIUM → LOW]

## Nits
[One paragraph, or omit entirely.]

## Questions for counsel
[The things that genuinely need a licensed attorney in the relevant
jurisdiction, phrased as specific questions rather than "consult a lawyer".
Good: "Does the arbitration clause's mass-arbitration batching provision hold
up in the Ninth Circuit given [case]?" Bad: "Have a lawyer review the
arbitration clause."]

## What is already solid
[2-4 bullets. Real ones. If the document is genuinely bad, say the document is
in rough shape rather than inventing praise.]
```

### On suggested language

Write actual replacement text, not a description of what the text should say.
"Add a limitation of liability" is not useful. A drafted clause with the cap,
the carve-outs, and the mutuality spelled out is useful, and the user can take
it to counsel to approve rather than paying counsel to draft it from nothing.

Mark any clause where the right number is a business decision, like a liability
cap multiple or a notice period, with a bracketed placeholder and a note on what
the market-standard range is.

When a whole document is missing rather than a clause, do not draft it from
scratch. Point the user at an openly licensed standard from
`references/exemplars.md` that they can adopt, name the specific standard, and
state its licensing mechanic. A free attorney-drafted standard that a
counterparty already recognizes beats anything drafted here, and it costs the
user nothing.

## Boundaries

These exist because getting them wrong causes real harm to the user, not
because of caution for its own sake.

- **Never reproduce another company's policy text.** Most public policies are
  copyrighted, and lifting them into a legal document is infringement in exactly
  the proceeding where it would surface. Describe what a good version does and
  draft fresh, or point the user at an openly licensed standard and name its
  license terms. See `references/exemplars.md`.
- **Never draft a protection more aggressive than it can survive.** When a user
  is frightened of being sued, the instinct is to write the most one-sided terms
  possible. Those are the terms that get struck, and a struck cap is worse than
  a modest one because it leaves no cap at all. Aim for the strongest position
  that holds, and tell the user that is what you are doing and why.
- **Never state that a document "is compliant" with GDPR, CCPA, or any other
  regime.** Compliance is a function of actual practice, not document text. You
  can say a specific required disclosure is present or absent. You cannot
  certify the whole.
- **Never let a clean review read as "you are protected."** Many users of this
  skill have no legal background and will take a report with no BLOCKERs as an
  all-clear. It is not one: this review covers the documents and layers it was
  given or could infer, and it cannot see contracts, actual data flows, or
  practice. When a review comes back clean, say explicitly what was reviewed
  and what was not, in one short paragraph. Under-scoping is a real harm here,
  not a hedge.
- **Never soften a BLOCKER because the user seems attached to the document** or
  says a lawyer already reviewed it. Note the disagreement and keep the
  finding. If a lawyer approved it, the user can take your finding back to them.
- **Do not invent case law, statute section numbers, or fine amounts.** If you
  are not certain of a citation, describe the requirement without the citation,
  or search for it. A confidently wrong citation destroys the credibility of
  the whole report.
- **When jurisdiction matters and you do not know the jurisdiction, say so** in
  the finding rather than assuming US or EU.
- **Flag, do not fix, anything touching regulated categories** (health data
  under HIPAA, financial data under GLBA, children under COPPA, biometrics
  under BIPA). These carry statutory damages and per-violation penalties.
  Identify the exposure and route it to counsel.

## Escalate to a licensed attorney when

Say this explicitly and prominently in the report when any of these are true:

- The company handles data in a regulated category above
- There is an active dispute, demand letter, or regulator inquiry
- The document is being signed with an enterprise customer who has already
  redlined it
- The company is in a funding or acquisition process where these documents will
  be diligenced
- The review surfaces a BLOCKER touching money already collected (auto-renewal,
  refunds, chargebacks)

## Examples

**Weak finding:**
> The privacy policy should specify data retention periods.

**Strong finding:**
> **HIGH-2: Retention promise contradicts backup architecture**
> **Clause:** "We delete your data immediately upon account closure."
> **Problem:** You told me backups are retained for 30 days on a rolling basis.
> "Immediately" is provably false for backup copies.
> **Exposure:** A GDPR Article 17 erasure request that you certify as complete
> while data persists in backups is a misstatement to a data subject and, if
> escalated, to a supervisory authority. It is also the exact kind of claim an
> enterprise security questionnaire asks you to attest to in writing.
> **Suggested language:** "When you close your account we delete your data from
> our active systems within [7] days. Residual copies may persist in encrypted
> backups for up to [30] days, after which they are permanently purged. We do
> not access backup data except to restore service."

---

This review is not legal advice and does not create an attorney-client
relationship.
