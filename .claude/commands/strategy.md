# /strategy - Site Strategy & Architecture Command

## Purpose
Create conversion-optimized site architecture based on Client DNA and ICP insights. This command orchestrates the ux-strategist agent and conversion-architecture skill to produce strategic sitemaps, page briefs, and content requirements.

## When to Use
- After completing client discovery (`/discover`) and ICP development (`/icp`)
- When planning site structure for a new project
- When redesigning an existing site's architecture
- Before wireframing or design work
- When defining page-level conversion goals

## Usage

```
/strategy [context or instructions]
```

**Examples:**
```
/strategy Create site architecture for GreenLeaf Organics
/strategy Plan the page structure for their new marketing site
/strategy Define conversion flows for B2B SaaS landing pages
/strategy Build sitemap optimized for their solution-aware audience
```

## Prerequisites

### Required
- [ ] Client DNA (from `/discover`)
- [ ] ICP Profiles (from `/icp`)

### Highly Recommended
- [ ] User Journey Map (from `/icp`)
- [ ] Competitor site analysis
- [ ] Business goals and priorities

### Nice to Have
- [ ] Existing site analytics
- [ ] SEO keyword research
- [ ] Sales team input

**If prerequisites are missing:** The command will note limitations and recommend completing discovery and ICP work first.

---

## Workflow

### Step 1: Context Loading

Load all available inputs:
- Client DNA → Business model, offerings, goals
- ICP Profiles → Audience psychology, awareness levels, objections
- User Journey → Stage-by-stage needs

Verify minimum requirements are met.

### Step 2: Define Site Goals

Establish primary and secondary site goals:
- What is the ONE thing this site must accomplish?
- What secondary goals matter?
- How will success be measured?

### Step 3: Map Awareness to Architecture

Using the `conversion-architecture` skill:
1. Determine primary audience awareness level
2. Map entry points for each awareness level
3. Define pages needed for each level
4. Plan paths from awareness to conversion

### Step 4: Design Page Hierarchy

Create strategic sitemap:
1. Define primary navigation
2. Organize pages by purpose (conversion, persuasion, education)
3. Establish URL structure
4. Map internal linking strategy

### Step 5: Define User Flows

Map key paths through the site:
1. Primary conversion flow (main ICP → primary goal)
2. Objection-handling flow (skeptical → convinced)
3. Nurture flow (not ready → captured for follow-up)
4. Secondary ICP flows (if applicable)

### Step 6: Create Page Briefs

For each strategic page:
1. Define page purpose (ONE job)
2. Specify target audience and awareness level
3. List content requirements based on ICP
4. Set conversion goals (primary and secondary)
5. Identify objections to address
6. Specify proof elements needed

### Step 7: Generate Content Requirements

Document what each page needs:
1. Content blocks with purpose
2. Messaging direction (not final copy)
3. Proof elements to gather
4. Assets needed

### Step 8: Generate Outputs

Create files in outputs directory:

```
/mnt/user-data/outputs/
├── {client}_sitemap.json
├── {client}_page_briefs.json
├── {client}_content_requirements.json
└── {client}_user_flows.json
```

### Step 9: Present Summary

Provide actionable summary:
- Site goals and primary conversion action
- Key architectural decisions with rationale
- Page inventory with priorities
- Primary user flow visualization
- Critical content needs
- Recommended next steps

---

## Output Quality Standards

### Strategic Sitemap Must Include:
- [ ] Clear site goals and success metrics
- [ ] Awareness-based entry strategy
- [ ] Logical page hierarchy
- [ ] Navigation structure
- [ ] All pages with justified purpose

### Page Briefs Must Include:
- [ ] Single job statement per page
- [ ] Target awareness level
- [ ] Content requirements tied to ICP
- [ ] Conversion goals (primary + secondary)
- [ ] Objections to address (from ICP)
- [ ] Proof elements needed

### User Flows Must Include:
- [ ] Entry point to conversion path
- [ ] User psychology at each step
- [ ] Friction points identified
- [ ] Mitigation strategies
- [ ] Alternative paths for non-converters

### Content Requirements Must Include:
- [ ] Content blocks per page
- [ ] Messaging direction (ICP-informed)
- [ ] Proof elements to gather
- [ ] Asset needs

---

## Handling Common Scenarios

### Scenario: No ICP Data
```
STOP. ICP data is required for strategic architecture.
Recommend: "Run /icp first to build customer profiles. Architecture without audience psychology produces generic sites that don't convert."
```

### Scenario: Multiple Distinct ICPs
```
Create separate entry paths for each ICP.
Consider: Segment landing pages or "For [Role]" sections.
Document: Which pages serve which ICP, where paths converge.
```

### Scenario: Complex Product/Service Offering
```
Organize by user need, not product catalog.
Consider: "Solutions for [Use Case]" over "Products" list.
Create: Guided paths (quiz, assessment) to help navigation.
```

### Scenario: Redesign (Existing Site)
```
Analyze: What's working? (Keep)
Identify: What's missing? (Add)
Question: What's not performing? (Reconsider)
Preserve: URL equity where possible.
```

### Scenario: Client Has Strong Opinions
```
Document client requests.
Evaluate against ICP data.
If conflict: Present recommendation with rationale, note client preference.
Flag: "Client requests [X] which may conflict with ICP insight [Y]. Recommend testing."
```

---

## Integration

### Consumes
- Client DNA (from `/discover`)
- ICP Profiles (from `/icp`)
- User Journey Map (from `/icp`)
- Competitor analysis (if available)

### Produces Outputs For
- `/wireframe` command (uses page briefs for page-level wireframes)
- `/brief` command (uses sitemap for design scope)
- `/copy` command (uses content requirements)
- `conversion-reviewer` agent (validates against strategy)
- Design team (page briefs for wireframing)
- Development team (sitemap for build planning)

---

## Example Interaction

**User:** `/strategy Create site architecture for GreenLeaf Organics`

**Agent Response:**

```
## Site Strategy: GreenLeaf Organics

### Prerequisites Verified
✓ Client DNA: Organic skincare, DTC, subscription goal
✓ ICP Primary: "The Conscious Upgrader" (Solution-aware)
✓ ICP Secondary: "The Ingredient Detective" (Product-aware)
✓ User Journey: Trust-focused, research-heavy decision

---

### Site Goals

**Primary Goal:** Convert first-time purchasers
**Metric:** Purchase conversion rate
**Target:** 3%+ (industry benchmark: 2.5%)

**Secondary Goals:**
1. Capture email for non-purchasers (lead magnet)
2. Drive subscription signups (post-first-purchase)
3. Build trust through transparency

---

### Architecture Strategy

**Primary Audience Awareness:** Solution-aware (comparing clean beauty options)
**Implication:** They know they want clean beauty; we need to differentiate and prove we're actually clean (not greenwashing).

**Entry Point Strategy:**

| Awareness | Entry | Key Pages |
|-----------|-------|-----------|
| Problem-aware | Blog SEO | "What's in your skincare?" content |
| Solution-aware | Social, organic | Homepage, Why GreenLeaf |
| Product-aware | Brand search | Products, Reviews, Ingredients |
| Most-aware | Email, retargeting | Shop, Bundles, Offers |

---

### Recommended Sitemap

```
Home
├── Shop
│   ├── All Products
│   ├── By Concern
│   │   ├── Acne & Blemishes
│   │   ├── Anti-Aging
│   │   ├── Hydration
│   │   └── Sensitive Skin
│   ├── Bundles & Sets
│   └── Subscribe & Save
├── Why GreenLeaf [KEY DIFFERENTIATOR]
│   ├── Our Ingredients
│   ├── Our Standards (certifications)
│   └── Clean Beauty Guide
├── Results [TRUST BUILDER]
│   ├── Reviews
│   └── Before & After
├── About
│   ├── Our Story
│   └── Our Founders
├── Blog
└── Help
    ├── FAQ
    ├── Shipping & Returns
    └── Contact
```

**Key Decision: "Why GreenLeaf" Section**
*Rationale:* Primary ICP's top objection is trust ("Is this actually clean?"). Dedicating a section to ingredients and standards addresses this before they shop.
[Source: ICP Primary, Objection #1: "How do I know this is actually clean?"]

---

### Primary User Flow

```
Solution-Aware Visitor (Social/Organic Traffic)
        │
        ▼
┌─ Homepage ─────────────────────────────────┐
│ Orient + Route (CTA: Shop or Learn More)   │
└────────────────────────────────────────────┘
        │
        ├── Ready to shop ──► Shop by Concern
        │                         │
        │                         ▼
        │                   Product Page
        │                         │
        │                         ▼
        │                   Add to Cart → Checkout
        │
        └── Needs trust ──► Why GreenLeaf
                              │
                              ▼
                        Our Standards
                              │
                              ▼
                        Reviews/Results
                              │
                              ▼
                        Shop (now convinced)
```

---

### Page Priority

| Priority | Pages |
|----------|-------|
| Critical | Homepage, Product Pages, Cart/Checkout, Why GreenLeaf |
| Important | By Concern categories, Reviews, Our Standards |
| Supporting | About, Blog, FAQ, Shipping |

---

### Files Generated
- `greenleaf_sitemap.json` — Full sitemap with rationale
- `greenleaf_page_briefs.json` — Detailed brief for each page
- `greenleaf_content_requirements.json` — Content needs per page
- `greenleaf_user_flows.json` — Documented conversion paths

---

### Recommended Next Steps
1. Review sitemap for alignment with business priorities
2. Identify any missing pages or concerns
3. Proceed to `/wireframe` for page-level structure
4. Or `/brief` for design direction

Ready for wireframing or design brief?
```