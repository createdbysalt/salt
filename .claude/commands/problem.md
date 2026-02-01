---
name: problem
description: "Define the problem worth solving. Identifies the High-Expectation Customer, their functional/emotional/social jobs, and validates this is a hair-on-fire problem worth betting on."
---

# /problem - Problem Definition Command

Define the problem worth solving before exploring solutions. This command ensures you're building something users will love, not just use.

## Purpose

Most product failures happen because teams solve the wrong problem, or solve a nice-to-have instead of a hair-on-fire need. This command forces clarity on:

- **WHO** specifically would be devastated without this (High-Expectation Customer)
- **WHAT** jobs they're trying to accomplish (functional, emotional, social)
- **WHY** this is urgent now (hair-on-fire test)
- **HOW** we'll know we succeeded (very disappointed test)

## When to Use

- After `/research` validates an opportunity worth exploring
- Before `/solution` to lock in the problem definition
- When you have an idea but aren't sure if it's worth building
- When stakeholders disagree on what problem you're solving

## Usage

```bash
# Basic usage - interactive Q&A
/problem "Client meeting booking"

# With research context
/problem "Client meeting booking" --from-research calendar-booking

# Quick mode for smaller features
/problem "Add dark mode" --quick

# Deep mode for major features
/problem "Client portal messaging" --deep
```

## The Process

### Phase 1: Urgency Assessment

First, determine if this is worth solving at all.

**Hair on Fire Test:**
- 🔥🔥🔥 **Burning:** Users are desperate, actively seeking solutions, will pay/switch immediately
- 🔥🔥 **Hot:** Significant pain, but users have workarounds they tolerate
- 🔥 **Warm:** Nice-to-have, would be pleasant but not urgent

**Questions to ask:**
1. What's happening RIGHT NOW that makes this urgent?
2. What are users currently doing to solve this? How painful is it?
3. Would they grab a brick to solve this problem, or shrug and move on?

**Red flags (probably not hair-on-fire):**
- "It would be nice if..."
- "Someday we should..."
- "Competitors have it..."
- No user complaints or requests

### Phase 2: High-Expectation Customer (HXC)

Identify WHO specifically would love this most. Not "users" - a vivid, specific person.

**The HXC is:**
- The most discerning user who will push for the best solution
- The user whose needs, when satisfied, will satisfy broader users
- Someone you can describe in their own language, with their own words

**Bad HXC definition:**
> "Freelancers who want to manage clients"

**Good HXC definition:**
> "Solo creative director running a $200-500k/year studio, juggling 3-5 active
> clients, using a mess of Notion + Calendly + email. They're drowning in admin
> but refuse to hire because they want to stay lean. They'd pay premium for
> anything that saves them 5+ hours/week. They say things like 'I just want
> to do the creative work' and 'I'm not a business person, I'm a designer.'"

### Phase 3: Jobs to be Done

Capture the three layers of jobs:

**Functional Job (what they're trying to DO):**
> "When [situation], I want to [action], so I can [outcome]."

Example: "When I close a new client, I want them to book a kickoff call instantly, so I can maintain momentum while they're excited."

**Emotional Job (how they want to FEEL):**
> "When [situation], I want to feel [emotion], so I can [psychological benefit]."

Example: "When managing multiple clients, I want to feel in control and organized, so I can show up confidently to calls instead of scrambling."

**Social Job (how they want to be PERCEIVED):**
> "When [situation], I want to be seen as [perception], so I can [social benefit]."

Example: "When a client books with me, I want to be seen as professional and established, so they feel confident they made the right choice."

### Phase 4: Current State Analysis

Understand how they solve this today:

- **Current workaround:** What do they do now?
- **Pain points:** What's frustrating about it?
- **Willingness to switch:** What would make them change?
- **Magic wand:** If they could wave a magic wand, what would they want?

### Phase 5: Success Vision

Define what success looks like:

**"Very Disappointed" Hypothesis:**
> If we build this right, [X%] of our HXC users would answer "very disappointed"
> if they could no longer use it.

The magic number is **40%**. Slack hit 51%. Superhuman started at 22% and grew to 58%.

**Qualitative signals:**
- What would users SAY? (quotes we want to hear)
- What would users FEEL? (emotions we want to evoke)
- What would users DO? (behaviors we want to see)

**Quantitative metrics:**
- Leading indicators (adoption, engagement)
- Lagging indicators (retention, NPS)

---

## Output Format

```markdown
# Problem: [Feature Name]

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

---

## High-Expectation Customer (HXC)

**Who specifically would be devastated without this?**

[Vivid, specific description using their own language. Not "users" -
a real person you can picture.]

**Why are they the right customer to design for?**

[They represent the sharpest need. Satisfy them and broader users follow.]

**In their own words:**

> "[A quote that captures their frustration or desire]"

---

## Jobs to be Done

### Functional Job
**When** [situation],
**I want to** [action],
**So I can** [outcome].

### Emotional Job
**When** [situation],
**I want to feel** [emotion],
**So I can** [psychological benefit].

### Social Job
**When** [situation],
**I want to be seen as** [perception],
**So I can** [social benefit].

---

## Current Alternatives

**What do they do today?**
[Tools, workarounds, manual processes]

**What's frustrating about it?**
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

**What would "magic" look like?**
[Their ideal solution, no constraints]

---

## Success Vision

### "Very Disappointed" Hypothesis

If we build this right, **[X%]** of HXC users would be "very disappointed"
if they could no longer use it.

**Confidence:** HIGH / MEDIUM / LOW
**Basis:** [Why do we believe this?]

### Qualitative Success

**Users will say:**
> "[Quote we want to hear]"

**Users will feel:**
- [Emotion 1]
- [Emotion 2]

**Users will do:**
- [Behavior 1]
- [Behavior 2]

### Quantitative Success

| Metric | Target | Timeframe |
|--------|--------|-----------|
| [Metric 1] | [Target] | [When] |
| [Metric 2] | [Target] | [When] |

---

## Non-Goals

What are we explicitly NOT solving in this problem definition?

- ❌ [Non-goal 1]
- ❌ [Non-goal 2]

---

## Open Questions

What do we still need to learn?

- [ ] [Question 1]
- [ ] [Question 2]

---

## Verdict

**Status:** 🔥 HAIR ON FIRE / ⚠️ IMPORTANT / 💭 NICE-TO-HAVE

**Recommendation:** PROCEED TO /solution / NEEDS MORE RESEARCH / KILL

**Reasoning:**
[Why this verdict?]
```

---

## Interactive Flow

When run interactively, the command asks:

### Urgency Questions
```
1. What's happening RIGHT NOW that makes this urgent?
   A. Users are actively complaining/requesting this
   B. We're losing deals/users because we lack this
   C. Competitors are pulling ahead with this
   D. It's on our roadmap but no specific trigger
   E. Other: [specify]

2. How are users solving this today?
   A. Painful manual workaround
   B. Using a competitor/separate tool
   C. Just not doing it (giving up)
   D. Not sure - need to research
```

### HXC Questions
```
3. Who would be MOST devastated without this?
   [Free text - describe them vividly]

4. What do they say about this problem?
   [Free text - use their actual words if possible]
```

### Jobs Questions
```
5. What are they trying to DO? (functional job)
   When [situation], I want to [action], so I can [outcome].

6. How do they want to FEEL? (emotional job)
   When [situation], I want to feel [emotion], so I can [benefit].

7. How do they want to be PERCEIVED? (social job)
   When [situation], I want to be seen as [perception], so I can [benefit].
```

### Success Questions
```
8. What would make this a success?
   A. Users adopt it (X% using within Y weeks)
   B. Users love it (NPS > X, "very disappointed" > 40%)
   C. Business impact (reduces churn, increases conversion)
   D. All of the above
   E. Custom metrics: [specify]
```

---

## Modes

### `--quick` Mode
For smaller features. Abbreviated flow:
- Hair on fire assessment
- Brief HXC description
- Primary functional job only
- Key success metric

### `--deep` Mode
For major features. Extended flow:
- Full urgency analysis with evidence
- Detailed HXC with interview quotes
- All three job types with multiple instances
- Comprehensive success metrics
- Competitive analysis
- Risk assessment

---

## Output Location

```
tasks/
└── problem-[feature-name].md
```

---

## Next Steps

After completing `/problem`:

1. **If 🔥 HAIR ON FIRE:** Proceed to `/solution`
2. **If ⚠️ IMPORTANT:** Consider if timing is right, may proceed with caution
3. **If 💭 NICE-TO-HAVE:** Park it, focus on hair-on-fire problems first

```bash
# Proceed to solution exploration
/solution "Feature name" --from-problem feature-name
```

---

## Anti-Patterns to Avoid

**❌ Vague HXC:**
"Users who want better project management"

**✅ Vivid HXC:**
"Solo creative directors billing $150-300/hr who refuse to hire because they love the craft but are drowning in client admin"

---

**❌ Feature-first thinking:**
"We need a calendar integration"

**✅ Job-first thinking:**
"Users need to book calls without email back-and-forth so they can maintain momentum with new clients"

---

**❌ Functional job only:**
"I want to schedule meetings"

**✅ Functional + Emotional + Social:**
"I want to schedule meetings (functional) so I feel in control of my time (emotional) and clients see me as professional (social)"

---

**❌ Assuming urgency:**
"Everyone wants this"

**✅ Validating urgency:**
"3 users mentioned this unprompted, 2 churned citing this gap, it's the #2 feature request"

---

## Methodology References

This command is based on:

- **Jobs-to-be-Done Framework** (Clayton Christensen) - Functional, emotional, social jobs
- **High-Expectation Customer** (Superhuman/Rahul Vohra) - Focus on most discerning users
- **Hair on Fire Test** (Sequoia) - Urgency validation
- **Sean Ellis Test** ("Very Disappointed") - Product-market love measurement
- **Outcome-Driven Innovation** (Tony Ulwick) - Outcome-focused problem definition

See `.claude/skills/product-planning/` for detailed methodology guides.

---

## Example

See the Calendar Booking example in `.claude/skills/product-planning/examples/problem-calendar-booking.md`
