# Breach Exposure and Founder Liability

Read this whenever the user asks about being sued, about what happens if they
get breached or hacked, about personal liability, about liability caps, or about
protecting themselves. Also read it on any review for a bootstrapped or
pre-revenue company, since the calibration advice differs from a funded company.

## Start by correcting the premise, once, kindly

Users ask for documents that protect them "even if there is a breach." No
document does that. Say so plainly and early, then be useful:

**What contracts can do:** cap what a *customer* can recover from you in
contract, disclaim warranties, shift some risk back to the customer, and require
disputes to happen somewhere and in some form that is cheaper for you.

**What contracts cannot do:** eliminate statutory breach notification duties,
prevent a regulator from acting, defeat a negligence claim by a non-party,
override consumer protection law, or stop anyone from filing. A cap limits what
a plaintiff *collects*. It does not stop the lawsuit, and defense costs are
often the real damage for a bootstrapped company.

The honest framing: you cannot make yourself unsueable. You can make yourself
expensive to sue, cheap to defend, and boring to target. Do not let a user walk
away believing their terms made them immune, because that belief causes them to
skip the controls that actually work.

## The stack that actually protects a bootstrapped founder

Assess all five. Documents are only one layer, and not the strongest one.

**1. Entity separation.** A properly maintained corporation or LLC is what keeps
a company lawsuit from becoming a personal one. It is not automatic. Veil
piercing arguments feed on commingled funds, personal expenses run through the
business, no separate bank account, missing corporate formalities, and
undercapitalization. Confirm: separate accounts, no personal expenses on the
business card, minutes or written consents for major decisions, stock issued and
83(b) filed, registered agent current, franchise tax paid. Note that founders
remain personally liable for their own torts, fraud, personal guarantees, and
certain unpaid payroll taxes regardless of entity.

**2. Insurance.** This is the layer bootstrapped founders skip and the one that
actually pays defense costs. Cyber liability and technology errors and omissions
coverage is available to pre-revenue and early SaaS companies at a cost that is
small relative to a single demand letter. Coverage typically responds to breach
response costs, notification, forensics, regulatory defense, and third party
claims. If the user has none, that is a finding, and often the most valuable one
in the report. Also check whether any customer contract requires insurance the
user does not carry, which is a breach of contract on day one.

**3. Contractual risk allocation.** Liability cap, warranty disclaimer,
indemnity, dispute resolution. See calibration below.

**4. Truthful security representations.** See the section on marketing claims.
This is the single most common way a small SaaS turns a breach into an
enforcement action or a class action.

**5. Actual security practice and breach readiness.** Encryption at rest and in
transit, access control, logging, vendor review, and a written incident response
plan with the notification clock understood in advance. This is not a legal
document but it determines the legal outcome, and one control below has direct
legal effect.

## Encryption has direct legal effect

Worth calling out separately because it is the highest-leverage control a
bootstrapped founder can implement cheaply.

Many US state breach notification statutes contain a safe harbor for data that
was encrypted and where the key was not also compromised. California's private
right of action for data breaches is similarly limited to nonencrypted and
nonredacted personal information. The practical effect is that encryption at
rest can be the difference between a notification event with class action
exposure and a non-event.

Verify the current scope of any specific statute rather than relying on this
summary, and note that the safe harbor generally fails if the encryption keys
were compromised alongside the data.

## Calibrating the liability cap

Users who are afraid of being sued push for the most aggressive cap possible.
That instinct produces documents that fail in exactly the situation they were
written for. Guide them to a cap that survives instead.

- **A cap that is effectively zero is attackable.** Fees paid on a free tier, or
  a nominal fixed dollar amount, combined with a total warranty disclaimer, is
  the fact pattern courts examine for unconscionability. A cap that gets struck
  leaves the user with no cap at all.
- **A one-sided cap is a deal blocker.** Mutual caps get signed. One-sided ones
  get redlined, and the redline usually ends worse than if the cap had been
  mutual from the start.
- **Expect a data breach carve-out to be requested.** Sophisticated customers
  ask for breach and confidentiality claims to sit outside the general cap, or
  under a higher super-cap, commonly a multiple of annual fees. Refusing
  entirely is a losing position. Deciding the multiple in advance is a stronger
  one, and it should be a number the user's insurance can actually cover. A
  super-cap above policy limits is a promise made with personal money.
- **Consumer-facing products face different enforceability analysis than B2B.**
  If the product has consumer users, route the cap and the arbitration clause to
  counsel rather than reasoning about them here.
- **Carve-outs run both ways.** The user's own payment and indemnity obligations
  sitting outside the cap is normal and is what makes the rest defensible.

## Marketing claims are the real trap

For a small SaaS, the most likely path from breach to lawsuit is not the breach
itself. It is the distance between what the company said about its security and
what it actually did. That gap is what turns an incident into a deceptive
practices claim under the FTC Act and state consumer protection statutes, and it
is what a plaintiff's lawyer reads first.

Audit these sources for security claims, because they are representations even
though they are not in the policy documents:

- Marketing site, especially a security or trust page
- Pricing page feature lists
- Sales decks and one-pagers
- Completed security questionnaires (these are signed written representations)
- Support macros and email templates
- Onboarding copy and in-app microcopy

Flag any of the following unless the user can substantiate it today:

- "Bank-level" or "military-grade" encryption, with no stated standard
- "SOC 2 compliant" when the reality is in progress, or a Type I described as a
  Type II, or an expired report
- "HIPAA compliant" from a company with no BAA and no HIPAA program
- "GDPR compliant" stated as a completed status
- "We never share your data" alongside a subprocessor list or an ad pixel
- "Your data is 100% secure" or any absolute guarantee
- Certification badges the company does not currently hold
- Penetration testing claims with no recent test
- Uptime figures presented as a commitment with no SLA behind them

Each of these is a MEDIUM at minimum, and a HIGH where the claim is
substantively false. Fixing them costs a copy edit. Leaving them costs a case.

## What you cannot contract away

Include these in the report when the user's framing suggests they think the
documents solve the problem:

- **Breach notification.** All US states impose notification duties, with
  varying triggers, timelines, and attorney general reporting thresholds. GDPR
  requires notification to the supervisory authority within 72 hours of
  awareness where the criteria are met, and to affected individuals where the
  risk is high. As a processor, the duty is to notify the controller without
  undue delay. None of this is waivable by a customer agreement.
- **Regulatory enforcement.** A contract binds the parties. It does not bind the
  FTC, a state attorney general, or an EU supervisory authority.
- **Statutory private rights of action.** Where a statute grants individuals the
  right to sue, a terms-of-service disclaimer does not remove it. California
  provides such a right for breaches of certain unencrypted personal information
  caused by a failure to maintain reasonable security, with per-consumer
  statutory damages. Verify current thresholds and amounts rather than quoting
  from memory.
- **Your liability for your vendors.** If a subprocessor is breached, the
  customer's claim runs to the user. The user's recourse against the vendor is a
  separate contract that may or may not exist and may or may not be worth
  anything.

## Findings this pass should generate

Report these as normal findings with normal severities, not as an appendix.

- No cyber liability or tech E&O insurance, at a company holding customer data
- Liability cap absent, effectively zero, one-sided, or above insurance limits
- Security claims in marketing that outrun actual practice
- No incident response plan or no defined notification owner
- No encryption at rest where personal data is stored
- Entity hygiene failures that support a veil piercing argument
- No DPA or breach notification clause with customers who need one
- No vendor or subprocessor agreements behind a promise made to customers
- Insurance required by a signed customer contract that the user does not carry

## Sequencing for a bootstrapped company

Users with no legal budget need an order, not a list. Recommend one, tied to
what the business actually does today, and be explicit that the order is about
cost of failure rather than completeness.

The general shape: entity hygiene and truthful marketing copy first because they
cost nothing but time. Then insurance, because it converts an unbounded risk
into a known monthly cost and it pays for the defense. Then the subscription
terms with a calibrated cap. Then the DPA and subprocessor list, which can wait
until the first customer who asks, but only if the user knows that customer is
coming. Encryption at rest belongs wherever it fits engineering, but say plainly
that it carries legal weight and should not sit behind feature work.

Say which items genuinely need a lawyer and which do not. A founder who believes
everything needs a lawyer does none of it.
