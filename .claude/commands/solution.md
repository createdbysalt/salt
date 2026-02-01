---
name: solution
description: "Explore solution options with the 11-star framework, emotional design, and micro-interactions. Brainstorm approaches that will delight users, not just satisfy requirements."
---

# /solution - Solution Exploration Command

Explore how to solve the problem in ways users will love. This isn't about picking the first idea - it's about designing for delight.

## Purpose

After `/problem` defines what's worth solving, `/solution` explores HOW to solve it in ways that create genuine love, not just functional satisfaction. This command ensures:

- **Multiple options explored** before committing (avoid first-idea bias)
- **11-star thinking** pushes beyond "good enough" to "remarkable"
- **Emotional design** addresses visceral, behavioral, and reflective needs
- **Micro-interactions specified** - the details that create delight
- **Delighters identified** - unexpected touches that surprise users

## When to Use

- After `/problem` validates a hair-on-fire problem worth solving
- Before `/prd` to lock in the approach
- When you have a clear problem but aren't sure how to solve it
- When you want to push beyond the obvious solution

## Usage

```bash
# Basic usage - interactive exploration
/solution "Client meeting booking"

# With problem context
/solution "Client meeting booking" --from-problem calendar-booking

# Quick mode for smaller features
/solution "Add dark mode" --quick

# Deep mode for major features
/solution "Client portal messaging" --deep
```

## The Process

### Phase 1: Recap the Problem

Before exploring solutions, ground in the problem:

- Who is the HXC?
- What are their functional/emotional/social jobs?
- What would "magic" look like to them?

This prevents solutions that drift from user needs.

### Phase 2: The 11-Star Exercise

Airbnb's framework for designing remarkable experiences:

| Stars | Level | Description |
|-------|-------|-------------|
| 1-2 | Broken | Doesn't work at all |
| 3-4 | Bad | Works but frustrating |
| 5 | Expected | Standard, meets expectations |
| 6 | Good | Better than expected |
| 7 | Great | Notably impressive |
| 8 | Amazing | Tell-your-friends good |
| 9 | Incredible | Changes expectations |
| 10 | Unbelievable | Seems impossible |
| 11 | Magical | Absurdly, impossibly delightful |

**The Exercise:**

1. **Define 5-star:** What's the baseline expected experience?
2. **Extrapolate to 11-star:** What would be absurdly delightful? (Go crazy)
3. **Work backward:** What's the feasible sweet spot? (Usually 6-8 stars)

**Example - Meeting Booking:**
- **5-star:** Client can see availability and book a time
- **7-star:** Calendar opens pre-filtered to their timezone, confirms instantly
- **9-star:** AI suggests optimal times based on project phase, auto-sends agenda
- **11-star:** Holographic meeting room materializes in their office

**Sweet spot:** 7-star is feasible and remarkable.

### Phase 3: Solution Options

Explore 2-3 distinct approaches. For each:

**How it works:**
High-level description of the approach

**Kano Classification:**
- **Basic features:** Table stakes, must have (absence = dissatisfaction)
- **Performance features:** More is better (linear satisfaction)
- **Delighters:** Unexpected joy (absence = no problem, presence = delight)

**Three Levels of Emotional Design:**

| Level | What It Is | Design Question |
|-------|------------|-----------------|
| **Visceral** | First impression, sensory | "Does it look/feel beautiful?" |
| **Behavioral** | Usability, effectiveness | "Does it work smoothly?" |
| **Reflective** | Personal meaning, identity | "Does it make me feel good about myself?" |

**Effort/Impact assessment:**
- Build effort
- Expected user impact
- Trade-offs

### Phase 4: Micro-Interactions

The details that create delight. For each key interaction:

| State | Behavior | Intended Emotion |
|-------|----------|------------------|
| **Default** | How it looks at rest | Inviting, clear |
| **Hover** | Response to mouse over | Alive, responsive |
| **Focus** | Keyboard/accessibility focus | Acknowledged |
| **Active/Pressed** | During click/tap | Immediate feedback |
| **Loading** | While waiting | Progress, patience |
| **Success** | Completion/confirmation | Accomplishment, joy |
| **Error** | Something went wrong | Guided, not blamed |
| **Empty** | Zero/no-data state | Opportunity, not broken |
| **Disabled** | Can't interact | Clear why, not frustrating |

**The "Back of the Fence" Details:**
Steve Jobs' father: "You've got to make the back of the fence just as good as the front."

What details might users never consciously notice, but contribute to the feeling of quality?

### Phase 5: Delight Criteria

Beyond "acceptance criteria" (does it work?), define "delight criteria" (does it spark joy?):

**What would make users say "I love this"?**

- [ ] [Specific delight moment 1]
- [ ] [Specific delight moment 2]
- [ ] [Specific delight moment 3]

**What unexpected touches are we including?**

- [Delighter 1]: [Why it will surprise/please]
- [Delighter 2]: [Why it will surprise/please]

### Phase 6: Recommendation

Which approach to bet on and why:

- **Chosen approach:** [Name]
- **Why this one:** [Reasoning]
- **Trade-offs accepted:** [What we're giving up]
- **Key bet:** [The assumption we're making]

---

## Output Format

```markdown
# Solution: [Feature Name]

## Problem Recap

**High-Expectation Customer:**
[Brief description from /problem]

**Primary Jobs:**
- Functional: [Job]
- Emotional: [Job]
- Social: [Job]

**What "magic" looks like to them:**
[Their ideal, from /problem]

---

## 11-Star Exercise

### 5-Star (Baseline)
What's the expected, standard experience?

[Description]

### 6-Star (Good)
What would be better than expected?

[Description]

### 7-Star (Great)
What would make them think "this is really well done"?

[Description]

### 8-Star (Amazing)
What would make them tell everyone they know?

[Description]

### 9-Star (Incredible)
What would change their expectations of what's possible?

[Description]

### 11-Star (Impossible Magic)
What would be absurdly, impossibly delightful?

[Description]

### Our Sweet Spot: [X]-Star
What's the feasible magic we can ship?

[Description]

**Why this level:**
[Reasoning - balancing ambition with feasibility]

---

## Appetite

⏱️ **[1 week / 2 weeks / 6 weeks]**

We're willing to spend [X] on this. If it can't be done in that time,
we need to reduce scope, not extend time.

---

## Solution Options

### Option A: [Name]

**How it works:**
[High-level description]

**Kano Classification:**

| Type | Features |
|------|----------|
| Basic (must-have) | [List] |
| Performance (more is better) | [List] |
| Delighters (unexpected joy) | [List] |

**Emotional Design:**

| Level | Design Element | Intended Response |
|-------|----------------|-------------------|
| Visceral | [First impression] | [Feeling] |
| Behavioral | [Usability] | [Feeling] |
| Reflective | [Identity/meaning] | [Feeling] |

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Effort:** [Low / Medium / High]
**Expected Impact:** [Low / Medium / High]

---

### Option B: [Name]

[Same structure as Option A]

---

### Option C: [Name] (Optional)

[Same structure as Option A]

---

## Recommended Approach

**Betting on:** Option [X] - [Name]

**Why:**
[Clear reasoning for this choice]

**Trade-offs we're accepting:**
- [Trade-off 1]
- [Trade-off 2]

**Key bet (the assumption we're making):**
[What we believe that, if wrong, would change this decision]

---

## Micro-Interactions

### [Primary Interaction, e.g., "Booking a Meeting"]

| State | Behavior | Intended Emotion |
|-------|----------|------------------|
| Default | [Description] | [Emotion] |
| Hover | [Description] | [Emotion] |
| Focus | [Description] | [Emotion] |
| Active | [Description] | [Emotion] |
| Loading | [Description] | [Emotion] |
| Success | [Description] | [Emotion] |
| Error | [Description] | [Emotion] |
| Empty | [Description] | [Emotion] |

### [Secondary Interaction]

[Same table structure]

---

## Delight Criteria

**What would make users say "I love this"?**

- [ ] [Delight criterion 1]
- [ ] [Delight criterion 2]
- [ ] [Delight criterion 3]

**Unexpected touches (delighters):**

| Delighter | Why It Delights |
|-----------|-----------------|
| [Touch 1] | [Reasoning] |
| [Touch 2] | [Reasoning] |

**"Back of the Fence" details:**

These details users may never consciously notice, but contribute to quality feel:

- [Detail 1]
- [Detail 2]
- [Detail 3]

---

## Rabbit Holes

Risks and complexities to watch for:

🕳️ **[Rabbit Hole 1]**
Risk: [What could go wrong]
Mitigation: [How to avoid it]

🕳️ **[Rabbit Hole 2]**
Risk: [What could go wrong]
Mitigation: [How to avoid it]

---

## No-Gos

What we're explicitly NOT building:

- ❌ [No-go 1]
- ❌ [No-go 2]
- ❌ [No-go 3]

---

## Open Questions for /prd

What the detailed spec phase needs to figure out:

- [ ] [Question 1]
- [ ] [Question 2]
- [ ] [Question 3]

---

## Verdict

**Status:** 🎯 BET / 🔄 ITERATE / ❌ KILL

**Recommendation:** PROCEED TO /prd / NEEDS REFINEMENT / KILL

**Confidence:** HIGH / MEDIUM / LOW

**Reasoning:**
[Why this verdict]
```

---

## Interactive Flow

When run interactively, the command guides through:

### 11-Star Questions
```
1. What's the baseline expected experience (5-star)?
   [Free text]

2. What would be notably impressive (7-star)?
   [Free text]

3. What would be tell-everyone-you-know good (8-star)?
   [Free text]

4. What would be absurdly, impossibly delightful (11-star)?
   Go crazy here - no constraints.
   [Free text]

5. What's the feasible sweet spot we can actually ship?
   A. 6-star (better than expected)
   B. 7-star (notably impressive)
   C. 8-star (tell-your-friends)
   D. Other: [specify]
```

### Solution Exploration
```
6. What are 2-3 different ways we could solve this?
   [Brainstorm - don't evaluate yet, just generate options]

7. For each option, what's:
   - The basic features (must-have, table stakes)?
   - The performance features (more is better)?
   - The delighters (unexpected touches)?
```

### Emotional Design
```
8. First impression - what should users feel immediately?
   A. "Wow, this is beautiful"
   B. "This looks professional and trustworthy"
   C. "This is simple and clear"
   D. "This feels premium"
   E. Other: [specify]

9. During use - what should the experience feel like?
   A. Fast and effortless
   B. Powerful and capable
   C. Guided and supported
   D. Fun and engaging
   E. Other: [specify]

10. After use - how should they feel about themselves?
    A. Productive and accomplished
    B. Professional and organized
    C. Creative and inspired
    D. In control and confident
    E. Other: [specify]
```

### Micro-Interactions
```
11. What happens on success? (e.g., booking confirmed)
    A. Simple confirmation message
    B. Subtle animation + message
    C. Celebration moment (confetti, sound)
    D. Smooth transition to next step
    E. Custom: [describe]

12. What happens on error?
    A. Clear error message with fix instructions
    B. Inline validation before they try
    C. Graceful fallback with alternatives
    D. Custom: [describe]
```

### Delight Criteria
```
13. What would make users say "I love this"?
    [Free text - be specific about the moments]

14. What unexpected touch could we add?
    [Free text - something they wouldn't expect]
```

---

## Modes

### `--quick` Mode
For smaller features. Abbreviated flow:
- 5-star vs 7-star comparison (skip full 11-star)
- Single recommended approach (skip options comparison)
- Key micro-interactions only
- 2-3 delight criteria

### `--deep` Mode
For major features. Extended flow:
- Full 11-star exercise with all levels
- 3+ solution options with detailed comparison
- Complete micro-interaction matrix
- Extensive delighter brainstorm
- Competitive analysis of approaches
- Risk assessment per option

---

## Output Location

```
tasks/
└── solution-[feature-name].md
```

---

## Next Steps

After completing `/solution`:

1. **If 🎯 BET:** Proceed to `/prd` for detailed spec
2. **If 🔄 ITERATE:** Refine the approach, re-run `/solution`
3. **If ❌ KILL:** Return to `/problem` or abandon

```bash
# Proceed to detailed specification
/prd "Feature name" --from-solution feature-name
```

---

## Anti-Patterns to Avoid

**❌ First-idea bias:**
"We should just build a calendar integration"

**✅ Option exploration:**
"Let's explore: native build vs Cal.com vs Calendly vs hybrid approach"

---

**❌ Functional-only thinking:**
"User can book a meeting. Done."

**✅ Emotional design:**
"User books meeting feeling professional and organized, sees smooth confirmation animation, feels accomplished and confident about the project"

---

**❌ Generic micro-interactions:**
"Shows a loading spinner"

**✅ Intentional micro-interactions:**
"Skeleton UI maintains layout, subtle pulse animation suggests progress, feels responsive not stuck, transitions smoothly to result"

---

**❌ No delighters:**
"It works correctly"

**✅ Designed delighters:**
"After booking, shows 'Meeting with [Client Name]' with their logo, making it feel personal and real"

---

**❌ Scope creep through over-ambition:**
"Let's do 10-star!"

**✅ Feasible ambition:**
"11-star helps us dream, but we're shipping 7-star within our 2-week appetite"

---

## Methodology References

This command is based on:

- **11-Star Experience Framework** (Airbnb/Brian Chesky) - Designing for remarkable
- **Kano Model** (Noriaki Kano) - Basic/Performance/Delighter classification
- **Three Levels of Emotional Design** (Don Norman) - Visceral/Behavioral/Reflective
- **Shape Up** (Basecamp) - Appetite-based scoping, rabbit holes, no-gos
- **Micro-interaction Design** (Dan Saffer) - Details that create delight

See `.claude/skills/product-planning/` for detailed methodology guides.

---

## Example

See the Calendar Booking example in `.claude/skills/product-planning/examples/solution-calendar-booking.md`
