# Hair on Fire Test

## Source
Sequoia Capital, Arc Product-Market Fit Framework

## The Concept

**Would users grab a brick to solve this problem?**

If your hair is on fire, you'd grab anything — a brick, a pillow, whatever's nearby — to put it out. You wouldn't carefully evaluate options or wait for the perfect solution.

"Hair on fire" problems are so urgent that users will adopt imperfect solutions immediately.

## The Three Archetypes

| Archetype | Description | Examples |
|-----------|-------------|----------|
| **Hair on Fire** | Urgent, obvious pain. Users are desperate. | Security breaches, payment processing, critical bugs |
| **Hard Fact** | Requires education. Changes how people work. | CRM adoption, cloud migration, new workflows |
| **Future Vision** | Moonshot. Requires technology breakthroughs. | Self-driving cars, AGI, quantum computing |

## Why It Matters

**Hair on fire problems:**
- Have built-in urgency — no need to create demand
- Create willingness to pay immediately
- Tolerate imperfect v1 products
- Generate word-of-mouth (people share pain)

**Nice-to-have problems:**
- Require demand generation
- Face long sales cycles
- Need polished products to compete
- Don't create urgency

## The Assessment

Ask these questions:

### 1. Urgency
- Is this problem causing pain RIGHT NOW?
- What triggered the urgency?
- What's the cost of not solving it?

### 2. Workaround Pain
- What are users doing today?
- How painful is their workaround?
- How much time/money does it cost?

### 3. Willingness to Act
- Are users actively seeking solutions?
- Would they switch immediately if you solved it?
- Would they pay a premium for urgency?

### 4. Evidence
- Are users complaining unprompted?
- Are they asking for this feature?
- Are competitors winning deals because of this gap?

## Rating Scale

| Rating | Description | Evidence |
|--------|-------------|----------|
| 🔥🔥🔥 **Burning** | Users are desperate, actively seeking solutions | Multiple unprompted requests, churn citing this gap, competitors winning on this |
| 🔥🔥 **Hot** | Significant pain, but workarounds exist | Some requests, workarounds are painful but tolerated |
| 🔥 **Warm** | Nice-to-have, would be pleasant | No complaints about absence, "would be nice" territory |

## Application in Salt-Core

### In `/problem`
Assess the urgency level:
```markdown
## Urgency Assessment

**Hair on Fire Rating:** 🔥🔥🔥 / 🔥🔥 / 🔥

**Evidence:**
- [Signal 1]
- [Signal 2]
- [Signal 3]

**Current Workaround:**
[How do they solve this today?]

**Pain Level:**
[How much does the current situation hurt?]
```

### Decision Gate
- **🔥🔥🔥 Burning:** Proceed immediately
- **🔥🔥 Hot:** Proceed with awareness of demand generation need
- **🔥 Warm:** Question whether to build at all

## Red Flags (Probably Not Hair on Fire)

- "It would be nice if..."
- "Someday we should..."
- "Competitors have it..." (without user demand)
- "I think users want..." (without evidence)
- No user complaints or requests
- Easy workarounds exist

## Green Flags (Probably Hair on Fire)

- Unprompted feature requests
- Users building their own workarounds
- Churn citing this as the reason
- Competitors winning deals on this capability
- Users willing to pay immediately
- "I need this yesterday"

## Sequoia's Advice

> "If you're solving a hair-on-fire problem, you can afford to have a worse product because people are desperate. If you're creating a new category (hard fact or future vision), you need a much better product because you're fighting inertia."

## Anti-Patterns

**❌ Building for warm problems:** Nice-to-haves don't create love

**❌ Assuming urgency:** "Everyone needs this" without evidence

**❌ Confusing competitor features with user demand:** They have it ≠ users want it

**❌ Building perfect solutions for warm problems:** Over-investment in low-urgency features

## Key Questions

Before committing to any feature:

1. **Who has their hair on fire?** (Not "who might use this")
2. **What's the current workaround?** (If none, maybe not that painful)
3. **Would they grab a brick?** (Urgency level)
4. **What evidence do we have?** (Not assumptions)
