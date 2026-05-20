# Opportunity Solution Tree (OST)

## Source
Teresa Torres, "Continuous Discovery Habits"

## The Concept

The Opportunity Solution Tree is a visual framework that connects business outcomes to customer opportunities to potential solutions. It ensures you're solving real problems, not just building features.

```
                    ┌─────────────┐
                    │   OUTCOME   │
                    │ (Business   │
                    │   Goal)     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼─────┐
    │OPPORTUNITY │  │OPPORTUNITY │  │OPPORTUNITY │
    │  (Unmet    │  │  (Unmet    │  │  (Unmet    │
    │   Need)    │  │   Need)    │  │   Need)    │
    └──────┬─────┘  └──────┬─────┘  └────────────┘
           │               │
      ┌────┼────┐     ┌────┼────┐
      │    │    │     │    │    │
   ┌──▼─┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼──┐
   │Sol │ │Sol│ │Sol│ │Sol│ │Sol│
   │ A  │ │ B │ │ C │ │ D │ │ E │
   └────┘ └───┘ └───┘ └───┘ └───┘
```

## The Four Components

### 1. Outcome
**What:** The measurable business goal you're pursuing
**Characteristics:**
- Specific and measurable
- Time-bound
- Within your team's influence
- Connected to business value

**Examples:**
- "Increase trial-to-paid conversion by 15%"
- "Reduce churn from 8% to 5%"
- "Grow average deal size to $10k"

**NOT outcomes:**
- "Build feature X" (that's a solution)
- "Make users happy" (not measurable)
- "Increase revenue" (too broad)

### 2. Opportunities
**What:** Unmet customer needs, pain points, or desires that, if addressed, would drive the outcome

**Characteristics:**
- Customer-centric (their need, not your idea)
- Problem-framed (not solution-framed)
- Specific enough to act on
- Decomposable into smaller opportunities

**Examples:**
- "Freelancers struggle to justify their rates to clients"
- "Designers feel like imposters when presenting technical work"
- "Studio owners waste 10+ hours/week on admin"

**NOT opportunities:**
- "Add a dashboard" (that's a solution)
- "Users need better UX" (too vague)
- "Improve performance" (not customer-framed)

### 3. Solutions
**What:** Product ideas that address opportunities

**Characteristics:**
- Multiple solutions per opportunity
- Ranging from simple to complex
- Testable through experiments

**Example:** For opportunity "Freelancers struggle to justify rates"
- Solution A: ROI calculator showing client value
- Solution B: Competitive rate benchmarking data
- Solution C: AI-generated value proposition statements
- Solution D: Case study template generator

### 4. Experiments
**What:** Tests to validate solutions before full investment

**Types:**
- Prototype tests
- Wizard of Oz tests
- A/B tests
- Painted door tests
- Concierge tests

## The Power of Decomposition

**Big opportunities are too hard to solve.** Break them down:

```
Opportunity: Win more projects
└── Sub-opp: Stand out from competitors
    └── Sub-sub-opp: Communicate unique value in proposals
        └── Solution: AI proposal writer that highlights differentiation
```

**Teresa Torres' rule:** "First, you start with a teeny tiny opportunity. Smaller opportunities lead to smaller solutions. And smaller solutions mean faster learning."

## Building the Tree

### Step 1: Define the Outcome
Start with a clear, measurable business goal.

```
Outcome: Increase average client LTV from $5k to $25k
```

### Step 2: Map Opportunities
Ask: "What would need to be true for customers to help us achieve this outcome?"

Research sources:
- Customer interviews
- Support tickets
- Feature requests
- Churn reasons
- Win/loss analysis

```
Outcome: Increase LTV to $25k
├── Opp: Clients see ongoing value (not just project delivery)
├── Opp: Switching costs are high (they depend on us)
├── Opp: Monthly touchpoints maintain relationship
└── Opp: Upsell opportunities are visible and natural
```

### Step 3: Decompose Opportunities
Break each opportunity into smaller, more specific sub-opportunities.

```
Opp: Clients see ongoing value
├── Sub: Clients receive monthly performance reports
├── Sub: Clients can track metrics themselves
├── Sub: Clients see improvements over time
└── Sub: Clients understand what we're doing (not black box)
```

### Step 4: Generate Solutions
Brainstorm multiple solutions for the smallest opportunities.

```
Sub: Clients receive monthly performance reports
├── Sol: Automated PDF reports
├── Sol: Live dashboard access
├── Sol: Monthly video walkthrough (recorded)
└── Sol: AI-generated insights email
```

### Step 5: Prioritize and Test
Compare solutions, run experiments, learn, iterate.

## Common Mistakes

### Mistake 1: Solution-First Thinking
```
❌ WRONG: "We should build a dashboard"
   → Then reverse-engineering an opportunity to justify it

✓ RIGHT: "Clients don't know if we're delivering value"
   → Dashboard is ONE potential solution (among many)
```

### Mistake 2: Opportunities Too Big
```
❌ WRONG: "Users want better experience"
   → Too vague to act on

✓ RIGHT: "Users can't find past conversations with specific clients"
   → Specific, actionable, testable
```

### Mistake 3: Skipping to Solutions
```
❌ WRONG: Outcome → Solutions (no opportunities)
   → You're guessing what users need

✓ RIGHT: Outcome → Opportunities (from research) → Solutions
   → You're addressing validated needs
```

### Mistake 4: One Solution Per Opportunity
```
❌ WRONG: One opportunity = one solution
   → No comparison, no learning

✓ RIGHT: Multiple solutions per opportunity
   → Compare, test, find the best approach
```

## Application in Salt-Core

### In `/ideate`
Build an OST from brand identity and ICP research:

```
Outcome: Grow studio revenue to $150k+

Opportunities (from target-audience.md):
├── Win more $10k+ projects
│   ├── Differentiate from commodity designers
│   ├── Justify premium pricing with data
│   └── Create compelling proposals faster
├── Convert projects to retainers
│   ├── Prove ongoing value monthly
│   └── Make cancellation costly (value, not lock-in)
└── Reduce non-billable time
    ├── Automate invoicing/proposals
    └── Streamline client communication
```

### Connecting to ICP Psychology
Map opportunities to ICP fears and desires:

| Opportunity | ICP Fear Addressed | ICP Desire Fulfilled |
|-------------|-------------------|---------------------|
| Justify premium pricing | "Being exposed as fraud" | "Confidence, respect" |
| Prove ongoing value | "Feast-famine cycle" | "Consistent $10k+ months" |
| Create proposals faster | "Scope creep turning profit to loss" | "Freedom from anxiety" |

## Integration with Other Frameworks

**OST + JTBD:**
Opportunities ARE jobs-to-be-done. Frame them as:
- "When [situation], I want to [motivation], so I can [outcome]"

**OST + Kano:**
Classify solutions by Kano category:
- Must-haves: Table stakes solutions
- Performance: Better-is-better solutions
- Delighters: Unexpected joy solutions

**OST + Blue Ocean:**
Run ERRC on each opportunity:
- What can we eliminate that competitors do?
- What can we raise above industry standard?
- What can we create that no one offers?

## Key Quotes

> "Opportunities represent customer needs, pain points, and desires. They aren't features or solutions. They're the reasons why customers might want solutions."
> — Teresa Torres

> "The opportunity space is where we explore 'what to build.' The solution space is where we explore 'how to build it.'"
> — Teresa Torres

> "Start with a teeny tiny opportunity. Smaller opportunities lead to smaller solutions. And smaller solutions mean faster learning."
> — Teresa Torres

## Anti-Patterns

**❌ Feature backlog disguised as OST:** Listing features and calling them opportunities

**❌ Post-hoc rationalization:** Building the OST after deciding what to build

**❌ Static tree:** OST should evolve weekly with new learning, not be a one-time artifact

**❌ Skipping experiments:** Moving from solution to build without testing assumptions
