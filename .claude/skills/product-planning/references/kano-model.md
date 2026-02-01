# Kano Model

## Source
Noriaki Kano, 1984

## The Concept

Not all features are equal. The Kano Model classifies features by their impact on satisfaction:

| Type | Presence Effect | Absence Effect | Strategy |
|------|-----------------|----------------|----------|
| **Basic** | Expected, no extra satisfaction | Strong dissatisfaction | Must have all |
| **Performance** | More = more satisfaction | Less = less satisfaction | Invest proportionally |
| **Delighter** | Strong positive surprise | No negative effect | Include unexpected ones |

## The Three Types

### Basic (Must-Have)
Features users expect. Having them doesn't impress; lacking them causes frustration.

**Examples:**
- Login works
- Data saves correctly
- Errors don't lose work
- Reasonable load times

**Strategy:** Cover all basics before anything else. No amount of delighters compensates for missing basics.

### Performance (More is Better)
Features where more/better = more satisfaction. Linear relationship.

**Examples:**
- Faster load times
- More storage
- Better search results
- More customization options

**Strategy:** Invest where you can beat competitors. Performance features are differentiators.

### Delighters (Excitement)
Unexpected features that surprise and delight. Absence doesn't hurt; presence creates love.

**Examples:**
- Clever micro-animation on success
- AI that anticipates your needs
- Personalized touches
- Easter eggs and surprises

**Strategy:** Include 1-2 delighters per feature. They create word-of-mouth.

## The Decay Effect

**Delighters become basics over time.**

- Pull-to-refresh was a delighter (Tweetie, 2008)
- Now it's a basic - users expect it

This means:
- Continuous innovation on delighters is required
- Today's competitive advantage is tomorrow's table stakes
- Never stop pushing on what creates delight

## Application in Salt-Core

### In `/solution`

For each solution option, classify:
```
**Kano Classification:**
| Type | Features |
|------|----------|
| Basic (must-have) | [List] |
| Performance (more is better) | [List] |
| Delighters (unexpected joy) | [List] |
```

### In `/prd`

Ensure:
- All basics are covered in acceptance criteria
- Performance targets are specified
- At least 1 delighter is included per major feature

## How to Identify Feature Types

### Ask Users
1. "How would you feel if this feature was included?"
2. "How would you feel if this feature was NOT included?"

**Response Matrix:**
| If Included → Like | If Excluded → Dislike | = Basic |
| If Included → Like | If Excluded → Neutral | = Delighter |
| If Included → Proportional | If Excluded → Proportional | = Performance |

### Observe Behavior
- Basics: Users complain when missing
- Performance: Users compare to alternatives
- Delighters: Users share with others, unsolicited

## Prioritization Strategy

1. **First:** Cover all basics (no exceptions)
2. **Then:** Invest in 2-3 performance differentiators
3. **Always:** Include 1-2 delighters

**The mistake:** Skipping basics to work on delighters. A beautiful product that doesn't work is just broken.

## Anti-Patterns

**❌ Only basics:** Functional but forgettable. No differentiation.

**❌ Only delighters:** Impressive but unusable. Users churn after the novelty wears off.

**❌ Treating delighters as basics:** Over-engineering delighters. They should be light touches, not major investments.

## Key Insight

> "The opposite of a dissatisfier is not a satisfier - it's the absence of dissatisfaction."

Fixing bugs doesn't create love. It just removes hate. Delighters create love.
