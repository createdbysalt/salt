# The "Very Disappointed" Test

## Source
Sean Ellis, Product-Market Fit Survey

## The Concept

Ask users: **"How would you feel if you could no longer use [product]?"**

Options:
1. Very disappointed
2. Somewhat disappointed
3. Not disappointed

**The magic number: 40%**

If 40%+ respond "very disappointed," you have product-market fit. Below that, you don't.

## The Benchmark

| "Very Disappointed" % | Status |
|----------------------|--------|
| <25% | No PMF - major pivot needed |
| 25-40% | Weak PMF - iterate aggressively |
| 40-50% | PMF achieved - optimize |
| 50%+ | Strong PMF - scale |

**Examples:**
- Slack: 51%
- Superhuman: Started at 22%, reached 58%
- Dropbox: 42%

## Why This Question Works

1. **Forward-looking:** Measures dependence, not just satisfaction
2. **Emotional:** "Disappointed" captures feeling, not just function
3. **Binary-ish:** "Very" vs "somewhat" reveals intensity
4. **Actionable:** Clear threshold for decision-making

## How Superhuman Used It

### 1. Segment by Response
Focus on "very disappointed" users. Who are they? What do they love?

### 2. Study the Lovers
What patterns do they share? This defines your High-Expectation Customer.

### 3. Analyze Fence-Sitters
"Somewhat disappointed" users who value your core benefit → Convert these.

### 4. Ignore the Rest
Users who wouldn't be disappointed → Don't build for them.

### 5. Build the Roadmap
- 50% on amplifying what lovers love
- 50% on converting fence-sitters

### 6. Track Relentlessly
Make "very disappointed %" your north star metric.

## Application in Salt-Core

### In `/problem`
Define a hypothesis:
> "If we build this right, [X%] of HXC users would be 'very disappointed'
> if they could no longer use it."

### In `/prd`
Include as success metric:
> **"Very Disappointed" Target:** 40%+ of HXC users

### Post-Launch
Survey users with this exact question. Track the trend.

## Survey Best Practices

### When to Survey
- After users have experienced core value (not first session)
- After 2-3 uses minimum
- Before users churn (to understand both retained and at-risk)

### Sample Size
- 40+ responses for directional signal
- 100+ for statistical confidence
- Segment by user type for richer insights

### Follow-Up Questions

If "very disappointed":
> "What is the main benefit you receive from [product]?"

If "somewhat disappointed":
> "What is the main benefit you receive from [product]?"
> "What would make [product] a must-have for you?"

If "not disappointed":
> "What type of person do you think would benefit most from [product]?"

## The Segmentation Insight

Superhuman's breakthrough: They filtered for "somewhat disappointed" users whose stated benefit matched their core value proposition (speed). These were the convertible users.

**The matrix:**

| Response | Stated Benefit Matches Core? | Action |
|----------|------------------------------|--------|
| Very disappointed | Yes | Double down |
| Very disappointed | No | Understand the adjacent value |
| Somewhat disappointed | Yes | **Convert these** |
| Somewhat disappointed | No | Lower priority |
| Not disappointed | - | Ignore |

## Anti-Patterns

**❌ Surveying too early:** Users who just signed up don't know yet

**❌ Surveying only happy users:** Survivorship bias

**❌ Treating 39% as failure:** It's a guide, not a law

**❌ Ignoring qualitative data:** The "why" matters as much as the number

**❌ Only measuring once:** Track the trend over time

## Key Quote

> "The 'very disappointed' users tell you what's working. The 'somewhat disappointed' users whose benefit matches your vision tell you what to fix."
> — Rahul Vohra
