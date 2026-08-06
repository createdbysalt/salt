# Terms of Service Review Checklist

Read this before reading the document under review. Two questions run through
every section: does this protect the company, and would it survive a challenge?
Startups routinely have terms that do the first without the second, which is
worse than having neither because it produces false confidence.

## Contents

1. Formation and assent
2. Parties and entity
3. The service and changes to it
4. Money
5. Customer data and IP
6. Company IP and license grant
7. Acceptable use
8. Third parties and integrations
9. Warranties and disclaimers
10. Limitation of liability
11. Indemnification
12. Term, termination, suspension
13. Uptime and support
14. Dispute resolution
15. Boilerplate that actually matters
16. Enterprise readiness
17. Cross-document consistency

---

## 1. Formation and assent

- The assent mechanism is described and matches reality. Clickwrap (an
  affirmative checkbox or button with the terms adjacent) is enforceable.
  Browsewrap (a footer link) frequently is not.
- Reasonably conspicuous notice of the terms at the point of assent.
- Records of assent are retained (who, when, which version). Without this the
  company cannot prove which version a given customer agreed to, which
  undermines every clause in the document.
- Version history maintained.
- Capacity and authority: the individual accepting on behalf of an entity
  represents they have authority to bind it.

## 2. Parties and entity

- Correct legal entity, correct suffix, correct jurisdiction of formation.
- Matches the entity on the privacy policy, the invoice, the payment
  processor's descriptor, and the bank account.
- Affiliates addressed if customers will be contracting through them.

## 3. The service and changes to it

- The service is described at a level that does not overpromise.
- Right to modify or discontinue features, with notice for material
  degradations. A bare "we may change anything at any time" is common and is a
  problem in enterprise redlines.
- Beta, preview, and free-tier features carved out from warranties, SLAs, and
  support commitments.
- Right to modify the terms themselves: how notice is given, and whether
  continued use constitutes acceptance. For a paid subscription, unilateral
  modification with no notice and no exit right is a weak point. Better
  practice is notice plus the right to terminate before the change takes
  effect.

## 4. Money

The section most likely to produce an actual regulatory problem for a
self-serve SaaS.

- Fees, currency, and what triggers a charge.
- Auto-renewal terms. US federal negative-option rules (ROSCA) and state
  auto-renewal statutes (California's is the strictest, and several other
  states follow) generally require: clear and conspicuous disclosure of the
  renewal terms before the transaction, affirmative consent to the recurring
  charge, an acknowledgment with the terms and cancellation instructions, and
  a cancellation mechanism at least as easy as the signup mechanism. Check the
  product flow, not only the document. A cancel-by-email-only flow behind a
  one-click signup is a live exposure.
- Renewal reminder notices where required by the term length.
- Price change notice period.
- Refund policy: stated, and consistent with what support actually does.
- Taxes: who bears them, and whether prices are inclusive or exclusive.
- Late payment: interest rate (check it is not usurious in the governing
  jurisdiction), suspension rights, collection costs.
- Chargeback handling.
- Overage and usage-based billing mechanics, with a dispute window.
- What happens to prepaid amounts on termination for cause vs convenience.

## 5. Customer data and IP

- Customer retains ownership of its data. Anything else fails enterprise
  review immediately.
- The company gets a license limited to what it needs to provide the service.
  Watch for a broad perpetual irrevocable license to customer content that the
  company does not need and cannot defend.
- AI and machine learning use of customer data is addressed explicitly here,
  not only in the privacy policy. State whether customer content trains
  models, whether there is an opt-out, and whether the default differs by tier.
  Silence on this is now a HIGH finding for any B2B product.
- Feedback license: separate, and typically broad. This one is legitimate.
- Aggregated and de-identified data rights, with a genuine de-identification
  standard rather than a rebranding of the same data.
- Data export and portability on termination, with a defined window.
- Data deletion on termination, consistent with the privacy policy and the DPA.

## 6. Company IP and license grant

- Clear reservation of all rights not expressly granted.
- The license to the customer: scope, seats, territory, term, non-exclusive,
  non-transferable, revocable.
- Restrictions: no reverse engineering, no resale, no competitive
  benchmarking, no scraping, no circumventing usage limits.
- Trademark use and any publicity or logo rights. Many customers strike
  publicity rights, so make it a separate clause rather than burying it.
- Open source components and any pass-through license obligations.

## 7. Acceptable use

- Prohibited conduct and prohibited content.
- Enforcement mechanism: warning, suspension, termination, and whether the
  company is obligated to give notice first.
- Whether the AUP is incorporated by reference and whether it can be updated
  unilaterally.
- For any product with user-generated content or messaging: a notice and
  takedown process, and a DMCA agent registered with the Copyright Office if
  US safe harbor is being relied on. An unregistered agent forfeits the safe
  harbor, and this is a cheap fix that is frequently skipped.

## 8. Third parties and integrations

- Third party services disclaimed: the company is not responsible for them.
- Customer's own third party integrations and who bears the risk.
- App marketplace or platform terms flow-down if applicable.
- Payment processor relationship disclosed.

## 9. Warranties and disclaimers

- Any affirmative warranty given is one the company can actually meet.
- Disclaimer of implied warranties: merchantability, fitness for a particular
  purpose, non-infringement, quiet enjoyment.
- Conspicuousness. In the US, UCC-derived rules generally require disclaimers
  of implied warranties to be conspicuous, which is why they appear in caps.
  A disclaimer buried in body text in the same styling as everything else is
  attackable.
- Consumer protection carve-out acknowledging that some jurisdictions do not
  allow certain exclusions.

## 10. Limitation of liability

- A cap exists, and the metric is defined: commonly fees paid in the 12 months
  preceding the claim. Note whether it is a single aggregate cap or resets.
- Exclusion of indirect, incidental, consequential, special, punitive damages,
  and lost profits, revenue, data, and goodwill.
- Carve-outs from the cap. Standard carve-outs run both ways and typically
  include indemnification obligations, breach of confidentiality, gross
  negligence, willful misconduct, and payment obligations. A cap with no
  carve-outs will be redlined; a cap with unlimited carve-outs is not a cap.
- Whether a super-cap applies to data breach or IP indemnity, which is the
  usual enterprise negotiation.
- Mutuality. A one-sided cap is a friction point in every enterprise deal.
- Consumer jurisdiction carve-out.
- Check the cap is not illusory: a cap set at fees paid on a free tier is
  effectively zero, which some courts treat as unconscionable when combined
  with a total warranty disclaimer.

## 11. Indemnification

- Company indemnifies customer for third party IP infringement claims arising
  from the service. Absence of this is a HIGH finding for any B2B product with
  enterprise ambitions.
- Standard remedies for an infringement claim: procure the right, modify, or
  refund and terminate.
- Customer indemnifies company for customer content, customer's use in
  violation of the terms, and customer's own legal violations.
- Procedure: prompt notice, control of defense, cooperation, no settlement
  without consent.
- Exclusions: modifications by customer, combination with other products,
  continued use after notice.

## 12. Term, termination, suspension

- Term and renewal mechanics.
- Termination for convenience: who, with how much notice, and whether refunds
  apply.
- Termination for cause, with a cure period.
- Immediate suspension rights for security risk, non-payment, or AUP breach,
  and whether notice is required.
- Effect of termination: access, data export window, data deletion, fees owed.
- Survival clause listing the sections that survive. Check that it actually
  lists the ones that matter: IP, confidentiality, liability, indemnity,
  dispute resolution, payment obligations accrued.

## 13. Uptime and support

- If an SLA is promised, it is measurable and the exclusions are defined
  (maintenance windows, force majeure, customer-caused, third party network).
- Remedy is stated and is typically a service credit as the sole remedy.
- Credits require a customer claim within a window, or they do not.
- If no SLA is offered, say so rather than implying availability elsewhere in
  the terms or on the marketing site.
- Support scope, channels, and response targets, distinguished from the SLA.

## 14. Dispute resolution

- Governing law and venue, with a jurisdiction the company can actually
  litigate in.
- Arbitration clause, if used: the administering body and rules, seat, who
  pays fees, and whether it is mutual.
- Class action waiver and jury trial waiver.
- Mass arbitration protections. Coordinated individual filings can produce
  arbitration fees far exceeding the value of the dispute. Batching provisions
  and a bellwether process are now standard defensive drafting, and their
  enforceability is evolving. Flag for counsel rather than asserting a
  conclusion.
- Opt-out right from arbitration, with a defined window. Commonly used to
  strengthen enforceability.
- Small claims carve-out.
- Injunctive relief carve-out for IP and confidentiality.
- Limitations period, if shortened, is within what the governing law allows.
- Consumer-facing products face materially different enforceability analysis
  than B2B. If the product serves consumers, this whole section goes to
  counsel.

## 15. Boilerplate that actually matters

- Assignment: company can assign on merger or acquisition; customer generally
  cannot without consent. Getting this backwards complicates an exit.
- Change of control.
- Entire agreement and order of precedence across the ToS, order form, DPA,
  SLA, and AUP. Without an order of precedence, conflicting documents create
  an unresolvable dispute.
- Notice mechanism, including whether in-product notice counts.
- Severability, no waiver, force majeure.
- Export control and sanctions compliance.
- US government end user rights if selling to government.
- Language of the agreement if operating in multiple markets.

## 16. Enterprise readiness

Findings here are usually HIGH rather than BLOCKER, but they are the ones that
stall deals:

- A DPA exists and is incorporated or available.
- Subprocessor list and notice mechanism.
- Security commitments and the certifications actually held.
- Insurance obligations, if any are stated.
- Audit rights that are realistic.
- Mutuality across liability, indemnity, and confidentiality.
- A separate order form or enterprise agreement path exists, rather than
  forcing every large customer to accept unmodified self-serve terms.

## 17. Cross-document consistency

Run this pass whenever more than one document is in scope. These findings are
objective and land harder than interpretive ones.

Check that the following agree across the ToS, privacy policy, DPA,
subprocessor list, cookie policy, SLA, and the marketing site:

- Legal entity name and address
- Data retention and deletion timelines
- Whether customer data trains AI models, and the opt-out default
- Subprocessor and third party recipient lists
- Data residency and hosting regions
- Security certifications claimed
- Uptime commitments
- Refund and cancellation policy
- Governing law and dispute resolution
- Which document controls when they conflict

Any disagreement between two of the company's own documents is at minimum a
MEDIUM finding, and is a HIGH or BLOCKER when it concerns money, deletion, or
AI training.
