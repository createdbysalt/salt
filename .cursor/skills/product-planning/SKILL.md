# Product Planning Skill

Methodologies and frameworks for building products users love, not just use.

## Overview

This skill provides the research-backed frameworks used by `/ideate`, `/problem`, `/solution`, and `/prd` commands. It encodes best practices from Superhuman, Airbnb, Linear, Stripe, Teresa Torres, and Blue Ocean Strategy into a systematic approach.

## The Core Philosophy

**Products users love are designed, not accidental.**

The difference between products users *use* and products users *love*:

| Products Users Use | Products Users Love |
|-------------------|---------------------|
| Solve functional jobs | Solve functional + emotional + social jobs |
| Meet expectations | Exceed expectations with delighters |
| Work correctly | Feel delightful |
| Designed for "users" | Designed for High-Expectation Customer |
| Spec says "what to build" | Spec says "how it should feel" |
| Features from gut feel | Features from systematic ideation |

## The Pipeline

```
/ideate → /research → /problem → /solution → /prd → /ralph
    │          │           │           │          │
    │          │           │           │          └── Detailed spec with delight criteria
    │          │           │           └── 11-star exploration, emotional design
    │          │           └── HXC, jobs, hair-on-fire validation
    │          └── External intelligence, competitive analysis
    └── Brand-aligned opportunity identification
```

**The flow:**
1. **`/ideate`** — Generate and prioritize opportunities (WHAT might be worth building)
2. **`/research`** — Deep-dive specific questions (if needed)
3. **`/problem`** — Validate the problem and define WHO has it (is this worth solving?)
4. **`/solution`** — Explore HOW to solve it delightfully (multiple options)
5. **`/prd`** — Specify exactly WHAT to build (acceptance + delight criteria)
6. **`/ralph`** — Build it autonomously

---

## Key Frameworks

### Ideation Frameworks

#### 1. Opportunity Solution Tree (OST)
From Teresa Torres. Connect business outcomes → customer opportunities → solutions → experiments. Ensures you're solving real problems.

See: `references/opportunity-solution-tree.md`

#### 2. Blue Ocean ERRC
From Kim & Mauborgne. Eliminate, Reduce, Raise, Create — find uncontested market space by doing fewer things better AND creating new value.

See: `references/blue-ocean-errc.md`

#### 3. Six Paths Framework
From Kim & Mauborgne. Look across industry boundaries: alternative industries, strategic groups, buyer groups, complementary products, functional-emotional orientation, and time trends.

See: `references/six-paths-framework.md`

#### 4. Opportunity Scoring
From Tony Ulwick (ODI). Quantify opportunities: `Importance + (Importance - Satisfaction)`. Prioritize what's important AND underserved.

See: `references/opportunity-scoring.md`

---

### Problem Validation Frameworks

#### 5. High-Expectation Customer (HXC)
From Superhuman. Focus on the most discerning users who will push for the best solution. Satisfy them and broader users follow.

See: `references/high-expectation-customer.md`

#### 6. Jobs to be Done (JTBD)
From Clayton Christensen. Capture functional, emotional, and social jobs — not just features.

See: `references/jobs-to-be-done.md`

#### 7. Hair on Fire Test
From Sequoia. Validate that the problem is urgent, not nice-to-have. Would users grab a brick to solve it?

See: `references/hair-on-fire.md`

#### 8. "Very Disappointed" Test
From Sean Ellis. Measure product-market love with the 40% threshold. 40%+ "very disappointed" = PMF.

See: `references/very-disappointed-test.md`

---

### Solution Design Frameworks

#### 9. 11-Star Experience
From Airbnb. Design for absurdly delightful, then work backward to the feasible sweet spot (7-8 stars).

See: `references/11-star-experience.md`

#### 10. Kano Model
From Noriaki Kano. Classify features as Basic (must-have), Performance (more is better), or Delighter (unexpected joy).

See: `references/kano-model.md`

#### 11. Three Levels of Emotional Design
From Don Norman. Design for Visceral (first impression), Behavioral (usage), and Reflective (meaning) responses.

See: `references/emotional-design.md`

#### 12. Micro-Interactions
From Dan Saffer. Specify the details (hover, click, success, error, loading) that create quality feel.

See: `references/micro-interactions.md`

---

## Quick Reference

### The Strategic Ideation Checklist

Before exploring solutions, ensure opportunities are grounded:

**Is This Opportunity Brand-Aligned?**
- [ ] Fits 4-layer architecture (Intelligence, Operations, Delivery, Platform)
- [ ] Strengthens the moat (strategic + technical integration)
- [ ] Serves primary ICP (designer-developers or traditional developers)
- [ ] Matches Linear Standard UX (keyboard-centric, information-dense, fast)

**Is This Opportunity Validated?**
- [ ] Opportunity Score calculated (Importance + Gap)
- [ ] ERRC analysis run vs. competitors
- [ ] Six Paths explored for adjacent opportunities
- [ ] OST connects to measurable outcome

### The Loveability Checklist

Before writing any PRD:

**Is This Problem Worth Solving?**
- [ ] Hair on Fire: Users urgently need this (not nice-to-have)
- [ ] HXC Identified: We know exactly who would be "very disappointed" without it
- [ ] Emotional Job Clear: We know how users want to FEEL, not just what they want to DO

**Will This Solution Be Loveable?**
- [ ] Visceral Design: First impression will be beautiful/satisfying
- [ ] Behavioral Excellence: It will work better than alternatives
- [ ] Reflective Value: Users will feel proud/professional using it
- [ ] Delighters Included: At least one unexpected touch of joy
- [ ] 11-Star Exercise Done: We know what absurd delight looks like

**Is The Spec Complete?**
- [ ] Delight Criteria Defined: What makes users say "I love this"
- [ ] Micro-Interactions Specified: Hover, click, success, error, loading
- [ ] Emotional Response Targeted: Each interaction has intended feeling
- [ ] "Very Disappointed" Testable: Can measure post-launch

---

## Framework Integration Map

How frameworks work together:

```
IDEATION PHASE
├── Opportunity Solution Tree → Breaks outcomes into opportunities
├── Six Paths → Explores beyond immediate competition
├── Blue Ocean ERRC → Differentiates from competitors
└── Opportunity Scoring → Prioritizes what to explore

PROBLEM PHASE
├── HXC Definition → WHO are we solving for
├── JTBD Analysis → WHAT jobs need doing
├── Hair on Fire → HOW urgent is this
└── Very Disappointed Test → HOW to measure success

SOLUTION PHASE
├── 11-Star Exercise → Design for delight
├── Kano Classification → Balance feature types
├── Emotional Design → Design for feelings
└── Micro-Interactions → Design the details

PRD PHASE
├── Acceptance Criteria → What makes it work
├── Delight Criteria → What makes it loved
├── Micro-Interaction Tables → State-by-state specs
└── "Back of the Fence" → Invisible quality details
```

---

## Sources

### Ideation & Strategy
- Opportunity Solution Trees (Teresa Torres, "Continuous Discovery Habits")
- Blue Ocean Strategy (W. Chan Kim & Renée Mauborgne)
- Outcome-Driven Innovation (Tony Ulwick, Strategyn)
- Shape Up (Basecamp)

### Problem Validation
- Superhuman Product-Market Fit Engine (Rahul Vohra)
- Jobs to be Done (Clayton Christensen)
- Hair on Fire Test (Sequoia Capital)
- Sean Ellis Test (Product-Market Fit survey)

### Solution Design
- Airbnb 11-Star Framework (Brian Chesky)
- Kano Model (Noriaki Kano)
- Three Levels of Emotional Design (Don Norman)
- Micro-Interactions (Dan Saffer)
- "Back of the Fence" philosophy (Steve Jobs)

### Product Excellence
- Linear (keyboard-centric, information-dense UX)
- Stripe (document-driven, customer-obsessed)
- Apple (details create quality feel)
