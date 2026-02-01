# Opportunity Scoring

## Source
Tony Ulwick, Outcome-Driven Innovation (ODI) / Strategyn

## The Concept

Opportunity Scoring quantifies which customer needs are most underserved. It combines two dimensions:
1. **Importance:** How much does the customer care about this outcome?
2. **Satisfaction:** How well do current solutions address this outcome?

**The formula:**
```
Opportunity Score = Importance + (Importance - Satisfaction)
```

Or equivalently:
```
Opportunity Score = Importance + max(Importance - Satisfaction, 0)
```

This gives **double weight to importance** because:
- A need that's important AND underserved is a massive opportunity
- A need that's not important doesn't matter even if underserved
- A need that's satisfied doesn't need more investment even if important

## The Opportunity Landscape

```
                    HIGH Importance
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    │    OVER-SERVED       │   BIG OPPORTUNITY    │
    │   (High satisfaction │   (High importance,  │
    │    High importance)  │    Low satisfaction) │
    │                      │                      │
LOW ──────────────────────────────────────────────── HIGH
Satisfaction               │                      Satisfaction
    │                      │                      │
    │   APPROPRIATELY      │    TABLE STAKES      │
    │      SERVED          │   (Low importance,   │
    │   (Low importance,   │    High satisfaction)│
    │    Low satisfaction) │                      │
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
                    LOW Importance
```

## Scoring Scale

Typically scored 1-10 on each dimension:

| Score | Importance | Satisfaction |
|-------|------------|--------------|
| 10 | Critically important | Perfectly satisfied |
| 8-9 | Very important | Mostly satisfied |
| 6-7 | Moderately important | Somewhat satisfied |
| 4-5 | Slightly important | Partially satisfied |
| 1-3 | Not important | Not at all satisfied |

## Calculating Opportunity Score

**Example:**
| Outcome | Importance | Satisfaction | Score |
|---------|------------|--------------|-------|
| "Find past client conversations quickly" | 9 | 3 | 9 + (9-3) = 15 |
| "Generate professional invoices" | 7 | 8 | 7 + (7-8) = 7* |
| "Track project profitability" | 8 | 4 | 8 + (8-4) = 12 |
| "Send automated reminders" | 5 | 2 | 5 + (5-2) = 8 |

*When satisfaction > importance, the gap is 0 (no opportunity)

**Interpretation:**
- Score > 12: Strong opportunity (underserved, important)
- Score 10-12: Moderate opportunity
- Score < 10: Weak opportunity (either satisfied or unimportant)

## How to Collect the Data

### Method 1: Customer Surveys

Ask customers to rate each outcome:

**Importance question:**
> "When [doing the job], how important is it to [outcome]?"
> Scale: 1 (Not at all important) to 10 (Critically important)

**Satisfaction question:**
> "When using [current solution], how satisfied are you with your ability to [outcome]?"
> Scale: 1 (Not at all satisfied) to 10 (Completely satisfied)

### Method 2: Inference from Research

When you can't survey, infer from:
- Customer interviews (qualitative → estimate)
- Support ticket frequency (proxy for importance + dissatisfaction)
- Feature request frequency
- Churn reasons
- Competitor reviews

**Mark confidence levels:**
- SURVEYED: Direct customer data
- INFERRED: Estimated from qualitative research
- HYPOTHESIS: Best guess, needs validation

### Method 3: Competitive Analysis

Rate how well competitors satisfy each outcome:
- If all competitors score low → Industry-wide opportunity
- If one competitor scores high → Learn from them or differentiate elsewhere

## Applying to Salt Core

### Step 1: List ICP Outcomes

From `target-audience.md`, extract desired outcomes:

**Designer-Developer Outcomes:**
- "Justify premium pricing to skeptical clients"
- "Appear as a 'real studio' not a freelancer"
- "Know if a project will be profitable before accepting"
- "Spend less time on admin, more on billable work"
- "Feel confident presenting technical work"

### Step 2: Score Each Outcome

| Outcome | Importance | Satisfaction | Score | Source |
|---------|------------|--------------|-------|--------|
| Justify premium pricing | 10 | 2 | 18 | target-audience.md: "fear of being exposed as fraud" |
| Appear as real studio | 9 | 3 | 15 | target-audience.md: "identity crisis" |
| Know project profitability | 8 | 4 | 12 | INFERRED: common complaint |
| Reduce admin time | 7 | 5 | 9 | INFERRED |
| Present technical work confidently | 9 | 4 | 14 | target-audience.md: "imposter syndrome" |

### Step 3: Prioritize

Rank by opportunity score:
1. **Justify premium pricing** (18) — Massive opportunity
2. **Appear as real studio** (15) — Strong opportunity
3. **Present technical work confidently** (14) — Strong opportunity
4. **Know project profitability** (12) — Moderate opportunity
5. **Reduce admin time** (9) — Weaker opportunity

### Step 4: Generate Ideas

Focus ideation on high-scoring opportunities:

**For "Justify premium pricing" (Score: 18):**
- ROI calculator showing client value delivered
- Competitive intelligence reports for positioning
- Data dashboards proving ongoing impact
- Proposal templates with value-based framing

## Integration with Other Frameworks

### Opportunity Scoring + Kano

| Opportunity Score | Kano Category | Implication |
|-------------------|---------------|-------------|
| > 12 | Likely Performance or Delighter | High investment justified |
| 10-12 | Likely Performance | Moderate investment |
| < 10 | Likely Basic (if important) or Table Stakes | Cover basics, don't over-invest |

### Opportunity Scoring + OST

Use scores to prioritize branches of the Opportunity Solution Tree:

```
Outcome: Grow studio revenue
├── [Score: 18] Justify premium pricing ← FOCUS HERE
│   ├── Solution A
│   └── Solution B
├── [Score: 15] Appear as real studio ← SECONDARY
│   └── Solutions...
└── [Score: 9] Reduce admin time ← LOWER PRIORITY
    └── Solutions...
```

### Opportunity Scoring + Value vs. Effort

Combine opportunity score with effort estimate:

| | Low Effort | High Effort |
|---|-----------|-------------|
| **High Opportunity (>12)** | Quick Win — DO FIRST | Major Project — Plan carefully |
| **Low Opportunity (<10)** | Fill-in — Maybe | Time Sink — Avoid |

## Common Mistakes

### Mistake 1: Only Looking at Importance
```
❌ WRONG: "Invoicing is important, let's build better invoicing"
✓ RIGHT: "Invoicing is important but satisfaction is already high (8/10). Opportunity score is only 7. Look elsewhere."
```

### Mistake 2: Ignoring the Math
```
❌ WRONG: "This outcome has low satisfaction (3), big opportunity!"
✓ RIGHT: "Low satisfaction but also low importance (4). Score = 5. Not worth it."
```

### Mistake 3: Surveying Non-Users
```
❌ WRONG: Asking potential customers who haven't experienced the job
✓ RIGHT: Survey people actively doing the job you serve
```

### Mistake 4: Leading Questions
```
❌ WRONG: "How important is it to have AI-powered invoicing?" (solution-framed)
✓ RIGHT: "How important is it to send professional invoices quickly?" (outcome-framed)
```

## Confidence Levels

Always mark data source:

| Level | Description | Use |
|-------|-------------|-----|
| **SURVEYED** | Direct customer survey data (n>30) | High confidence, act on it |
| **QUALITATIVE** | From interviews/research (n=5-20) | Medium confidence, validate with more data |
| **INFERRED** | Estimated from indirect signals | Lower confidence, use as hypothesis |
| **HYPOTHESIS** | Best guess | Lowest confidence, requires validation |

## In `/ideate`

### Phase 6: Multi-Framework Evaluation

For each idea, calculate opportunity score:

```json
{
  "idea": "ROI calculator for client presentations",
  "opportunity_scoring": {
    "outcome_addressed": "Justify premium pricing to clients",
    "importance": 10,
    "satisfaction_current": 2,
    "opportunity_score": 18,
    "confidence": "INFERRED",
    "source": "target-audience.md fears table"
  }
}
```

### Prioritization

Combine opportunity score with other frameworks for final ranking:

```
Composite Score =
  (Opportunity Score × 0.25) +
  (Strategic Alignment × 0.30) +
  (Differentiation × 0.20) +
  (Inverse Effort × 0.15) +
  (Kano Bonus × 0.10)
```

## Key Quote

> "Innovation is about identifying what job customers are trying to get done, understanding all of their desired outcomes, and determining which of those outcomes are underserved."
> — Tony Ulwick

## Anti-Patterns

**❌ Gut-feel prioritization:** "I think this is important" without data

**❌ Satisfaction bias:** Building for already-satisfied needs

**❌ Importance bias:** Ignoring satisfaction levels

**❌ Feature-framed outcomes:** "Users want better dashboards" vs. "Users want to track project profitability"

**❌ Static scores:** Not updating as market and competition evolve
