---
name: prd
description: "Generate a detailed Product Requirements Document with acceptance AND delight criteria. Produces production-ready specs for Ralph execution."
---

# /prd - Product Requirements Document

Create detailed Product Requirements Documents that are clear, actionable, and designed for products users will love. Includes acceptance criteria (does it work?) AND delight criteria (does it spark joy?).

## Purpose

The PRD is the final specification before building. It translates the problem and solution exploration into detailed, buildable requirements. This command ensures:

- **Functional completeness** - every requirement is explicit and testable
- **Emotional design preserved** - delight criteria carry through from /solution
- **Micro-interactions specified** - the details that create quality feel
- **Ralph-ready output** - clear enough for autonomous execution

## When to Use

- After `/solution` defines the approach to bet on
- When you have a clear problem AND solution, ready to specify
- For smaller features, can be used directly (skip /problem and /solution)

## Usage

```bash
# Full flow - with context from previous commands
/prd "Client meeting booking" --from-solution calendar-booking

# Direct usage for smaller features
/prd "Add dark mode toggle"

# Decompose into parallel streams for large features
/prd "Sprint 3 Client Journey" --decompose

# Quick mode for small features
/prd "Fix button alignment" --quick
```

## The Process

### Phase 1: Context Check

If `--from-solution` is provided, pull in:
- Problem definition (HXC, jobs)
- Solution approach (chosen option)
- Emotional design targets
- Micro-interactions
- Delight criteria

If not provided, ask clarifying questions.

### Phase 2: Clarifying Questions

Ask only critical questions where the input is ambiguous:

```
1. What is the primary goal of this feature?
   A. Improve user experience
   B. Add new capability
   C. Fix existing problem
   D. Other: [specify]

2. Who is the target user?
   A. Studio owner (primary)
   B. Client (via portal)
   C. Both
   D. Other: [specify]

3. What's the appetite (time budget)?
   A. Small (1 week)
   B. Medium (2 weeks)
   C. Large (6 weeks)
   D. Already defined in /solution

4. What's the scope?
   A. Minimal loveable version
   B. Full-featured implementation
   C. Backend/API only
   D. UI only
```

Users can respond with "1A, 2C, 3B, 4A" for quick iteration.

### Phase 3: PRD Generation

Generate comprehensive PRD with all sections.

---

## PRD Structure

### 1. Overview

**Feature:** [Name]
**Appetite:** [1 week / 2 weeks / 6 weeks]
**Status:** Draft / Ready for Review / Approved

Brief description of the feature and the problem it solves.

### 2. Problem Context

From `/problem` or summarized here:
- **HXC:** [Who specifically]
- **Functional Job:** [What they're trying to do]
- **Emotional Job:** [How they want to feel]
- **Success Vision:** [What "very disappointed" looks like]

### 3. Solution Approach

From `/solution` or summarized here:
- **Chosen approach:** [Brief description]
- **Target star-level:** [X-star from 11-star exercise]
- **Key delighters:** [What creates unexpected joy]

### 4. User Stories

Each story includes BOTH acceptance AND delight criteria:

```markdown
### US-001: [Title]

**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria (Does it work?):**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] Typecheck/lint passes
- [ ] **[UI stories]** Verify in browser using dev-browser skill

**Delight Criteria (Does it spark joy?):**
- [ ] [Emotional/quality criterion]
- [ ] [Micro-interaction criterion]

**Micro-Interactions:**
| State | Behavior |
|-------|----------|
| Default | [Description] |
| Hover | [Description] |
| Success | [Description] |
| Error | [Description] |
```

**Story Sizing:**
Each story should be small enough for one Ralph iteration (typically 1-4 hours of work).

### 5. Functional Requirements

Numbered list of specific functionalities:
- **FR-1:** The system must [explicit behavior]
- **FR-2:** When a user [action], the system must [response]

Be explicit and unambiguous. No "should" - only "must."

### 6. Emotional Design Requirements

From `/solution` or defined here:

**Visceral (First Impression):**
- [How it should look/feel immediately]

**Behavioral (During Use):**
- [How interactions should feel]

**Reflective (After Use):**
- [How users should feel about themselves]

### 7. Micro-Interaction Specifications

Detail the key interactions:

| Interaction | State | Behavior | Intended Feeling |
|-------------|-------|----------|------------------|
| [Primary action] | Default | [Description] | [Emotion] |
| | Hover | [Description] | [Emotion] |
| | Active | [Description] | [Emotion] |
| | Loading | [Description] | [Emotion] |
| | Success | [Description] | [Emotion] |
| | Error | [Description] | [Emotion] |

### 8. Delight Details

**"Back of the Fence" Quality:**
Details users may never consciously notice but contribute to quality feel:
- [Detail 1]
- [Detail 2]

**Unexpected Touches:**
- [Delighter 1]: [Why it creates joy]
- [Delighter 2]: [Why it creates joy]

### 9. Non-Goals (Out of Scope)

What this feature will NOT include:
- ❌ [Non-goal 1]
- ❌ [Non-goal 2]

### 10. Technical Considerations

- Known constraints or dependencies
- Integration points with existing systems
- Performance requirements
- Security considerations

### 11. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| [Edge case 1] | [How to handle] |
| [Edge case 2] | [How to handle] |

### 12. Success Metrics

**Quantitative:**
| Metric | Target | Timeframe |
|--------|--------|-----------|
| [Metric 1] | [Target] | [When] |

**Qualitative:**
- Users say: "[Quote we want to hear]"
- Users feel: [Emotion we want to evoke]

**"Very Disappointed" Target:**
[X%] of HXC users would be "very disappointed" without this

### 13. Open Questions

Remaining questions for engineering/design:
- [ ] [Question 1]
- [ ] [Question 2]

---

## Output Format

```markdown
# PRD: [Feature Name]

## Overview

**Feature:** [Name]
**Appetite:** [Timeframe]
**HXC:** [Who this is for]
**Status:** Draft

[Brief description]

---

## Problem Context

**Functional Job:**
When [situation], I want to [action], so I can [outcome].

**Emotional Job:**
When [situation], I want to feel [emotion], so I can [benefit].

**Current Pain:**
[What's broken today]

---

## Solution Approach

**Chosen Approach:** [Name/description]
**Target Experience:** [X]-star
**Key Bet:** [The assumption we're making]

---

## User Stories

### US-001: [Title]

**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] Typecheck passes
- [ ] Verify in browser (if UI)

**Delight Criteria:**
- [ ] [Delight criterion 1]
- [ ] [Delight criterion 2]

**Micro-Interactions:**
| State | Behavior |
|-------|----------|
| Success | [Description] |
| Error | [Description] |

---

### US-002: [Title]

[Same structure]

---

## Functional Requirements

- **FR-1:** [Requirement]
- **FR-2:** [Requirement]
- **FR-3:** [Requirement]

---

## Emotional Design

**Visceral:** [First impression goals]
**Behavioral:** [Interaction feel goals]
**Reflective:** [Self-perception goals]

---

## Micro-Interactions

| Interaction | State | Behavior | Feeling |
|-------------|-------|----------|---------|
| [Action 1] | Default | [Spec] | [Emotion] |
| | Hover | [Spec] | [Emotion] |
| | Success | [Spec] | [Emotion] |
| | Error | [Spec] | [Emotion] |

---

## Quality Details

**"Back of the Fence":**
- [Invisible quality detail 1]
- [Invisible quality detail 2]

**Delighters:**
- [Unexpected touch 1]
- [Unexpected touch 2]

---

## Non-Goals

- ❌ [Not building this]
- ❌ [Not building this]

---

## Technical Considerations

- [Constraint/dependency 1]
- [Constraint/dependency 2]

---

## Edge Cases

| Case | Handling |
|------|----------|
| [Case 1] | [Behavior] |
| [Case 2] | [Behavior] |

---

## Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| [Metric] | [Value] | [When] |

**"Very Disappointed" Target:** [X%]

---

## Open Questions

- [ ] [Question 1]
- [ ] [Question 2]
```

---

## Writing for Ralph

The PRD reader will be Ralph (an autonomous AI agent). Therefore:

- **Be explicit and unambiguous** - no room for interpretation
- **Avoid jargon or explain it** - don't assume knowledge
- **Number requirements** - for easy reference
- **Include concrete examples** - show, don't just tell
- **Keep stories small** - each must complete in one iteration
- **Specify micro-interactions** - Ralph needs to know the details
- **Include delight criteria** - quality matters, not just functionality

---

## Modes

### `--quick` Mode
For small features:
- Abbreviated structure
- Acceptance criteria only (skip delight criteria)
- Skip micro-interactions
- 2-3 user stories max

### `--decompose` Mode
For large features (replaces `/prd-architect`):
- Reads the feature document
- Decomposes into parallel work streams
- Generates multiple PRD files (prd-stream-1.json, etc.)
- Creates execution plan with dependencies
- Outputs to `.claude/ralph/orchestration/`

---

## Output

**Format:** Markdown (`.md`) + JSON for Ralph

**Locations:**
```
tasks/
├── prd-[feature-name].md          # Human-readable PRD
└── prd-[feature-name].json        # Ralph-ready JSON

# For decomposed features:
.claude/ralph/orchestration/exec-[date]-[feature]/
├── execution-plan.json
├── prd-stream-1.json
├── prd-stream-2.json
└── ...
```

---

## Checklist

Before saving the PRD:

**Completeness:**
- [ ] Problem context included (HXC, jobs)
- [ ] Solution approach summarized
- [ ] All user stories have acceptance criteria
- [ ] All UI stories have delight criteria
- [ ] Micro-interactions specified for key actions
- [ ] Non-goals section defines boundaries
- [ ] Edge cases documented

**Quality:**
- [ ] Stories are small (one Ralph iteration each)
- [ ] Requirements are numbered and unambiguous
- [ ] Emotional design targets are clear
- [ ] "Back of the fence" details included
- [ ] Delighters identified

**Ralph-Ready:**
- [ ] No vague language ("works correctly" → specific behavior)
- [ ] Concrete examples where helpful
- [ ] Browser verification for UI stories
- [ ] Typecheck requirement on all stories

---

## Integration with Pipeline

### Full Flow
```bash
/research "Feature idea"          # Validate opportunity
/problem "Feature idea"           # Define problem worth solving
/solution "Feature idea"          # Explore approaches, pick one
/prd "Feature" --from-solution    # Detailed spec
/ralph                            # Build it
```

### Quick Flow (Small Features)
```bash
/prd "Small feature" --quick      # Direct to spec
/ralph                            # Build it
```

### Large Features
```bash
/prd "Sprint document" --decompose  # Break into streams
/ralph-start stream-1               # Parallel execution
/ralph-start stream-2
```

---

## Example: Enhanced User Story

**Before (functional only):**
```markdown
### US-002: Display booking confirmation

**Description:** As a client, I want to see confirmation after booking.

**Acceptance Criteria:**
- [ ] Shows confirmation message
- [ ] Typecheck passes
```

**After (with delight):**
```markdown
### US-002: Display booking confirmation

**Description:** As a client, I want to see confirmation after booking so I feel confident the meeting is scheduled.

**Acceptance Criteria:**
- [ ] Shows confirmation with meeting details (time, timezone, title)
- [ ] Displays calendar add button (Google, Outlook, iCal)
- [ ] Shows what to expect next
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

**Delight Criteria:**
- [ ] Confirmation appears with smooth fade-in animation
- [ ] Meeting card shows studio logo + client name (feels personalized)
- [ ] Subtle success indicator (checkmark animation or color)
- [ ] User feels "that was easy" and "I'm organized"

**Micro-Interactions:**
| State | Behavior |
|-------|----------|
| Appearing | Fade in from booking form, 200ms ease-out |
| Calendar button hover | Subtle lift effect, cursor pointer |
| Success | Green checkmark animates once, then settles |
```

---

## Methodology References

This command integrates:

- **User Stories** (Agile) - As a/I want/So that format
- **Acceptance Criteria** (BDD) - Verifiable checklist
- **Delight Criteria** (New) - Emotional/quality checklist
- **Micro-Interactions** (Dan Saffer) - State-by-state specification
- **Three Levels of Emotional Design** (Don Norman) - Visceral/Behavioral/Reflective
- **"Back of the Fence"** (Steve Jobs) - Invisible quality details

See `.claude/skills/product-planning/` for detailed guides.

---

## Next Steps

After creating the PRD:

```bash
# Convert to Ralph's JSON format (if not auto-generated)
/prd-json tasks/prd-[feature-name].md

# Or proceed directly to execution
/ralph
```
