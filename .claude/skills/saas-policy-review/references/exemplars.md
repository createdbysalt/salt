# Exemplars: Best-Documented Public Legal Documents

Read this when the review needs a comparison point, when the user asks what
"good" looks like, when a finding recommends adopting a standard, or when the
coverage map turns up a missing layer the user needs to build from scratch.

Use these to answer "what does a well-drafted version of this clause look like"
rather than as a source of text to paste.

## The copy-paste trap

The most common way a startup ends up with bad terms is copying a good
company's terms. The document was drafted for a different business model, a
different data footprint, a different jurisdiction, and a different risk
appetite. Copying it imports clauses that do not apply, omits ones that do, and
leaves references to services the copier does not operate. It also produces the
worst kind of confidence, because the document looks professional.

Worse, most public policies are simply copyrighted. Copying them is
infringement, and doing so in a legal document is a bad look in exactly the
proceeding where it would surface.

So split the list in two, and be explicit with the user about which half they
are looking at.

## Tier 1: Openly licensed and actually adoptable

These are published under licenses that permit reuse. For a bootstrapped
founder with no legal budget, this tier is the single highest-value resource in
the review, and recommending it is often more useful than any drafting note.

Read the license before recommending adoption. The differences matter.

### Bonterms — enterprise-grade standard agreements

Standard Agreements published under CC BY 4.0, with Standard Playbook Items
under CC0. The suite covers Mutual NDA, Cloud Terms (SaaS), Professional
Services Agreement, Business Associate Agreement, Data Protection Addendum, and
Software License Terms. Drafted to be neutral between vendor and customer rather
than favoring either side, which is why enterprise counterparties accept them
with less negotiation. Also mirrored on GitHub, so the drafting history is
visible.

**The critical mechanic:** you do not edit the standard terms. You incorporate
them unmodified and customize through a Cover Page. Editing the body breaks the
license, and Bonterms requires you to remove references to them if you do. This
is a feature: the counterparty can trust an unmodified standard without reading
it line by line.

Best used for: a SaaS subscription agreement, a DPA, an SLA, and an NDA. Exactly
the layers Termageddon does not cover.

### Common Paper — startup-oriented standard agreements

Free, Creative Commons licensed, drafted by a committee of attorneys spanning
vendors, procurement, boutique firms, and large firms. The suite includes a
Cloud Service Agreement, Mutual NDA, Data Processing Agreement, Design Partner
Agreement, Service Level Agreement, and a click-to-accept Terms of Service.

The Terms of Service version is a customized form of the Cloud Service Agreement
structured for online posting and click-acceptance rather than signature, which
means self-serve and enterprise deals can run off the same foundation. That
matters for a company that will start self-serve and later sell to enterprise,
because it avoids a rewrite at the worst possible moment.

Common Paper also publishes benchmark data drawn from proposed and signed
contracts, which is useful when a user asks whether a term is normal. The
benchmarks answer that empirically rather than by assertion.

Best used for: a founder who needs a full commercial stack quickly and wants to
know which terms are market.

### GitHub site-policy — the best documented policy set in existence

Published under CC0-1.0 (note that this grants no trademark rights, so strip
GitHub's name and marks). What makes this the strongest teaching resource is not
the text but the process around it: every policy lives in a public repository
under version control, changes ship as pull requests, material changes to the
Privacy Statement or Terms are posted in advance of taking effect, and the full
history of every revision is readable.

This is the place to send a user who wants to understand *why* a clause is
worded the way it is. The commit history and pull request discussion show the
reasoning, which no published policy alone can.

Also the reference set for breadth. The policy universe there includes corporate
terms, acceptable use policies, subprocessor lists, cookie disclosures, DMCA
takedown and counter-notice procedures, government takedown policy, coordinated
vulnerability disclosure, and a bug bounty legal safe harbor. Use it to check
the coverage map against a mature company's actual document inventory.

### Basecamp — plain-language policies under CC BY 4.0

Explicitly published for reuse with a suggested attribution line. The value here
is register. Basecamp's policies are readable by a normal person while remaining
legally operative, which is the hardest thing to achieve in this category and
the thing most startups get wrong in the other direction.

Send a user here when their policies are technically fine but incomprehensible,
or when they are building a consumer-facing product where readability affects
enforceability of assent.

Note the attribution requirement. CC BY means credit is mandatory, not optional.

### Automattic legalmattic — WordPress.com policies under CC BY-SA 4.0

Long-running and well maintained, covering the privacy policy, terms of service,
and related documents.

**Watch the license.** CC BY-SA is share-alike: adapt these and your derivative
must be released under the same license. For most companies that means
open-sourcing their own policies. Some founders are happy with that and some are
not, so surface it rather than letting them discover it later. This is the
license distinction that most reuse advice omits.

## Tier 2: Read for structure, do not copy

These are copyrighted. Study how they organize and scope a problem, then draft
your own. Never lift text.

- **Stripe** — the reference for a platform with a payments layer, complex money
  flows, and a global footprint. Look at how the services agreement, DPA, and
  subprocessor list interlock, and at the order of precedence between them.
- **Slack, Salesforce, AWS, Google Cloud, Microsoft** — the enterprise standard
  for DPAs, subprocessor notice mechanisms, security addenda, and regional data
  transfer terms. If a user is preparing for their first enterprise security
  review, this is the shape of what they will be measured against.
- **Cloudflare** — well-regarded transparency reporting and law enforcement
  request handling, plus a clear separation between the customer-facing terms
  and the abuse and takedown machinery.
- **Vercel, Supabase, Linear, Notion** — current-generation SaaS terms at
  roughly the scale a bootstrapped founder is building toward. Useful for
  calibration, since a solo founder should not be modeling their terms on
  Amazon's.
- **Mozilla and DuckDuckGo** — privacy notices written to be understood, with
  layered summaries above the detail. Good models for a notice-at-collection
  layer.
- **Anthropic, OpenAI, and other model providers** — currently the most
  developed public treatment of AI training, retention, and output terms. Read
  these specifically when reviewing a product with an AI feature, since this is
  the clause area with the least settled convention.

## Primary and regulator sources

When a finding turns on what a law actually requires, prefer these over any
company's interpretation of it:

- **European Data Protection Board** guidelines, for GDPR interpretation
- **UK Information Commissioner's Office**, whose guidance is unusually readable
  and includes practical checklists
- **California Privacy Protection Agency** and the California Attorney General,
  for CCPA and CPRA
- **US Federal Trade Commission** business guidance and published enforcement
  actions. The consent orders are the clearest available statement of what
  crosses the line on security representations, and they read as a list of
  things not to say in marketing copy.
- **IAPP** for tracking the current patchwork of state privacy laws

## How to use exemplars inside a finding

Do not tell the user to "look at how Stripe does it." Name the specific document
and the specific thing it does, and connect it to their gap.

**Weak:**
> Consider adopting a standard SaaS agreement.

**Strong:**
> **HIGH-3: No subscription agreement behind paid plans**
> **Problem:** Your Termageddon Terms and Conditions is a website terms of use.
> It has no subscription term, no liability cap tied to fees, no customer data
> ownership clause, and no IP indemnity. You are charging customers under it.
> **Exposure:** Every commercial dispute defaults to whatever a court reads into
> the relationship. Your first enterprise prospect's counsel will also ask for
> a subscription agreement, and not having one stalls the deal.
> **Fix:** Adopt the Common Paper Terms of Service, which is the Cloud Service
> Agreement restructured for click-acceptance, so self-serve and enterprise run
> off the same foundation later. It is free and Creative Commons licensed. Fill
> the cap, notice period, and governing law using their benchmark data, then
> have a lawyer review the completed version once rather than draft from
> nothing.

Always pair an adoption recommendation with the licensing mechanic (Bonterms:
do not edit the body; Basecamp: attribution required; Automattic: share-alike)
and with a note that the standards' own publishers advise legal review before
use. Recommending a free standard is not the same as recommending the user skip
counsel, and the standards themselves say so.
