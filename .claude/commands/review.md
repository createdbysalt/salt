# /review - Conversion Audit Command

## Purpose
Audit all project outputs against conversion best practices before client handoff. Identifies gaps, misalignments, and missed opportunities that could hurt conversion rates.

## When to Use
- Before presenting work to clients
- Before handing off to design or development
- When completing a project phase
- When something feels "off" but unclear what
- For quality assurance on any deliverable

## Usage

```
/review [scope or specific instructions]
```

**Examples:**
```
/review Audit all GreenLeaf Organics outputs before client presentation
/review Check the sitemap and page briefs for conversion issues
/review Review the homepage page brief specifically
/review Full audit before design phase
```

## Prerequisites

### Can Audit (Any Combination)
- [ ] Client DNA (from `/discover`)
- [ ] Brand Voice Profile (from `/discover`)
- [ ] ICP Profiles (from `/icp`)
- [ ] User Journey Map (from `/icp`)
- [ ] Strategic Sitemap (from `/strategy`)
- [ ] Page Briefs (from `/strategy`)
- [ ] Content Requirements (from `/strategy`)
- [ ] Design Brief (from `/brief`)
- [ ] Visual System (from `/brief`)
- [ ] Component Specs (from `/brief`)

**Note:** More inputs = more comprehensive audit. Partial audits are valid but will note scope limitations.

---

## Workflow

### Step 1: Scope Definition

Identify what's being audited:
1. **List available inputs** — What documents exist?
2. **Define audit scope** — Full audit or specific focus?
3. **Note limitations** — What's missing that limits the audit?

### Step 2: Context Loading

Load foundational understanding:
1. **Client DNA** — What's the business goal?
2. **ICP Profiles** — Who are we converting? What do they need?
3. **Primary conversion goal** — What's the #1 action we want?
4. **Key objections** — What must be overcome?

### Step 3: Strategic Alignment Check

Verify outputs align with each other:

```
ALIGNMENT MATRIX

ICP ↔ Sitemap
- Does sitemap include pages for each awareness level?
- Are ICP objections addressable within structure?

ICP ↔ Page Briefs  
- Does each page target appropriate ICP segment?
- Are objections addressed in content requirements?

Sitemap ↔ Page Briefs
- Does every sitemap page have a brief?
- Are page purposes consistent?

Strategy ↔ Design
- Does visual hierarchy support conversion?
- Are CTAs properly emphasized?
```

### Step 4: CONVERT Framework Audit

Apply the seven-dimension framework:

| Dimension | Question |
|-----------|----------|
| **C**larity | Is the value proposition immediately clear? |
| **O**bjections | Are customer objections proactively addressed? |
| **N**avigation | Can users find what they need easily? |
| **V**alue | Is the benefit obvious at every step? |
| **E**vidence | Is there sufficient proof? |
| **R**elevance | Does content match user awareness level? |
| **T**rust | Are there adequate trust signals? |

Score each 1-5 with supporting observations.

### Step 5: Page-Level Audit

For each key page:
1. **Apply CONVERT framework** — Score all 7 dimensions
2. **Check ICP alignment** — Does it serve the target audience?
3. **Evaluate conversion path** — Is the CTA clear and compelling?
4. **Note issues** — Document with severity and location

### Step 6: Gap Analysis

Identify missing elements:

**Content Gaps:**
- FAQ? Case studies? Comparison page? Process explanation?

**Trust Gaps:**
- Testimonials? Logos? Certifications? Team photos?

**Conversion Gaps:**
- Email capture? Chat? Multiple CTAs? Urgency?

**Technical Gaps:**
- Mobile experience? Form optimization? Load time?

### Step 7: Risk Assessment

Identify potential conversion killers:
1. **Business risks** — Competitive gaps, weak differentiation
2. **User risks** — Friction points, missing information
3. **Technical risks** — Performance, mobile, accessibility

### Step 8: Synthesize and Prioritize

1. **Compile all issues** — Group by severity
2. **Apply severity criteria:**
   - 🔴 Critical: Will significantly hurt conversion (fix before launch)
   - 🟠 High: Likely hurting conversion (fix in first iteration)
   - 🟡 Medium: May be hurting conversion (fix when possible)
   - 🟢 Low: Optimization opportunity (nice to have)
3. **Prioritize by impact × effort**
4. **Identify quick wins**

### Step 9: Generate Outputs

Create audit report:

```
/mnt/user-data/outputs/
└── {client}_conversion_audit.json
```

### Step 10: Present Summary

Provide actionable summary:
- Overall score and readiness assessment
- Top 3-5 issues that must be fixed
- Top strengths (what's working)
- Prioritized recommendation list
- Clear next steps

---

## Output Quality Standards

### Executive Summary Must Include:
- [ ] Overall score (1-10)
- [ ] Conversion readiness status
- [ ] Top issues (max 5)
- [ ] Top strengths (at least 2)
- [ ] Key recommendation

### Issues Must Include:
- [ ] Unique ID for tracking
- [ ] Severity level with color
- [ ] Specific location in outputs
- [ ] What's wrong (finding)
- [ ] Why it matters (impact)
- [ ] How to fix it (recommendation)
- [ ] ICP connection (where relevant)

### Recommendations Must Be:
- [ ] Specific and actionable
- [ ] Prioritized by impact × effort
- [ ] Connected to conversion impact
- [ ] Achievable with available resources

---

## Severity Criteria

### 🔴 Critical (Fix Before Launch)
- Missing primary CTA on key pages
- Value proposition unclear or absent
- Trust killers (looks unprofessional, scammy)
- Broken conversion paths
- Major ICP objections completely unaddressed

### 🟠 High (Fix in First Iteration)
- CTA weak or poorly placed
- Important objections unaddressed
- Missing key trust signals
- Generic copy that doesn't differentiate
- Mobile experience gaps

### 🟡 Medium (Fix When Possible)
- Suboptimal placement of elements
- Missing secondary conversion paths
- Minor trust gaps
- Copy could be stronger
- Enhancement opportunities

### 🟢 Low (Optimization Backlog)
- A/B test candidates
- Minor copy tweaks
- Nice-to-have features
- Polish items

---

## Common Patterns to Flag

### Homepage Issues
- Hero doesn't state what you do/sell
- No CTA above the fold
- Multiple competing CTAs
- No social proof visible
- Value proposition is features, not benefits

### Product/Service Page Issues
- No way to buy/signup/contact
- Features without benefits
- No pricing or path to pricing
- No differentiation from alternatives
- Objections avoided, not addressed

### Form Issues
- Too many fields for the ask
- No indication of what happens next
- No privacy assurance
- Generic submit button
- No social proof near form

### Trust Issues
- No testimonials or generic ones
- No logos or credentials
- No team/founder humanization
- Security/privacy not addressed
- Contact info hidden

---

## Anti-Hallucination Rules

### Cite Sources
Every issue must reference the specific document and location:
```
✓ "Homepage page brief [hero section] specifies headline 
    'Welcome to GreenLeaf' which doesn't communicate value proposition"
```

### Connect to ICP
Every issue should tie to customer psychology:
```
✓ "ICP Primary's #1 objection is trust in 'clean' claims [ICP Profile: objections]. 
    No certifications or testing proof in product page brief [content requirements]."
```

### Be Specific
Recommendations must be actionable:
```
✗ "Improve the CTA"
✓ "Change CTA from 'Submit' to 'Get My Free Quote' and increase button height to 48px minimum"
```

### Prioritize Ruthlessly
- Maximum 5 critical issues
- Maximum 10 high issues
- Roll up minor issues into categories

---

## Integration

### Consumes
All outputs from previous agents:
- `/discover` outputs (Client DNA, Brand Voice)
- `/icp` outputs (ICP Profiles, User Journey)
- `/strategy` outputs (Sitemap, Page Briefs, Content Requirements)
- `/brief` outputs (Design Brief, Visual System, Component Specs)

### Produces Outputs For
- Project team (issues to fix before proceeding)
- Client (quality assurance documentation)
- `creative-director` agent (project status assessment)
- Future comparison (baseline for measuring improvements)

---

## Example Interaction

**User:** `/review Audit GreenLeaf before client presentation`

**Agent Response:**

```
## Conversion Audit: GreenLeaf Organics

### Documents Reviewed
✓ Client DNA
✓ ICP Profiles (Primary + Secondary)
✓ Strategic Sitemap  
✓ Page Briefs (12 pages)
✓ Content Requirements
⚠ Design Brief (not yet created)

---

### Executive Summary

**Overall Score: 7.2/10**
**Conversion Readiness:** Needs Work

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 4 |
| 🟡 Medium | 6 |
| 🟢 Low | 3 |

**Top Issues:**
1. 🔴 Homepage hero doesn't state product category
2. 🟠 Price objection (#3 in ICP) not addressed anywhere
3. 🟠 No before/after proof for effectiveness claims
4. 🟠 All CTAs use generic "Shop Now" copy
5. 🟠 Mobile conversion path not specified

**Top Strengths:**
- ICP objection mapping is thorough
- Sitemap correctly routes by awareness level
- "Why GreenLeaf" section directly addresses trust

**Key Recommendation:** Fix homepage clarity first—visitors won't know this is skincare within 5 seconds, causing immediate bounces.

---

### CONVERT Scores

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Clarity | 3/5 | Homepage hero lacks product category |
| Objections | 4/5 | Trust covered; price objection missing |
| Navigation | 5/5 | Clean structure, logical paths |
| Value | 4/5 | Benefits clear; "why now" absent |
| Evidence | 3/5 | Reviews exist; no before/after |
| Relevance | 4/5 | Awareness mapping solid |
| Trust | 4/5 | Good foundation; needs founder story |

---

### Critical Issues

#### 🔴 ISS-001: Homepage Doesn't State Product Category

**Location:** Page Brief > Homepage > Hero Section
**Finding:** Headline direction is "Transform your skin naturally" with no mention of "skincare" or "organic beauty"
**Impact:** Visitors won't understand what you sell within 5 seconds. High bounce risk.
**ICP Connection:** Solution-aware visitors are comparing options—need instant category confirmation
**Recommendation:** 
- Add product category to headline: "Organic skincare that actually works"
- OR add clear subheadline: "Premium clean beauty for sensitive skin"

---

### High Issues

[4 additional high-severity issues with same detail level...]

---

### Gaps Identified

**Missing Pages:**
- FAQ page (addresses objections at scale)
- Before/After gallery (visual effectiveness proof)
- Ingredient deep-dive (transparency proof)

**Missing Trust Elements:**
- Founder story in About page
- Certifications/testing badges
- Press mentions

**Missing Conversion Elements:**
- Exit-intent email capture
- Quiz for undecided visitors

---

### Prioritized Recommendations

| # | Recommendation | Impact | Effort |
|---|----------------|--------|--------|
| 1 | Fix homepage hero clarity | High | Low |
| 2 | Add FAQ page to sitemap | High | Medium |
| 3 | Specify testimonial themes | High | Low |
| 4 | Create benefit-focused CTAs | Medium | Low |
| 5 | Add before/after gallery | Medium | Medium |

---

### Next Steps

**Immediate (before design):**
1. Update homepage page brief with product category clarity
2. Add FAQ page and before/after to sitemap

**Before launch:**
3. Client provides testimonials matching specified themes
4. Certifications/testing info gathered for product pages

**Post updates:**
5. Re-run `/review` to verify critical issues resolved

---

### Files Generated
- `greenleaf_conversion_audit.json`

Ready to address these issues, or questions about specific findings?
```

---

## Command Variations

### Focused Audits

```
/review homepage
→ Deep-dive on homepage page brief only

/review user flows
→ Audit the conversion paths specifically

/review trust signals
→ Focus on trust/evidence/credibility gaps

/review mobile
→ Mobile-specific conversion issues
```

### Comparative Audits

```
/review vs competitor [URL]
→ Gap analysis against competitor (requires web access)

/review vs previous version
→ Compare to earlier outputs (requires history)
```

### Quick Checks

```
/review quick
→ High-level check, critical issues only

/review checklist
→ Just the CONVERT scores, no detailed analysis
```