# /icp - Ideal Customer Profile Development Command

## Purpose
Build psychologically deep Ideal Customer Profiles from Client DNA and available research data. This command orchestrates the icp-analyst agent and icp-development skill to produce actionable customer intelligence.

## When to Use
- After completing client discovery (`/discover`)
- When preparing for copywriting or design work
- When customer research data becomes available
- When refining targeting for campaigns
- Before site architecture or content strategy

## Usage

```
/icp [context or instructions]
```

**Examples:**
```
/icp Build profiles for GreenLeaf Organics
/icp Analyze these customer interview transcripts
/icp Update the ICP with the new survey data
/icp Create user journey map for the primary ICP
```

## Prerequisites

### Required
- [ ] Client DNA document from `/discover`

### Recommended (improves quality significantly)
- [ ] Customer interviews or surveys
- [ ] Customer reviews (product or competitor)
- [ ] Testimonials or case studies
- [ ] Support ticket themes
- [ ] Sales team insights

### If No Customer Research Available
The command will:
1. Use Client DNA as foundation
2. Mine competitor reviews (if competitors identified)
3. Apply industry patterns (marked as HYPOTHESIS)
4. Flag all insights requiring validation
5. Generate a research plan

---

## Workflow

### Step 1: Prerequisites Check

Verify Client DNA exists:
- If missing → Prompt user to run `/discover` first
- If available → Load and extract audience assumptions

Catalog available research:
- Customer surveys?
- Interview transcripts?
- Reviews to analyze?
- Testimonials?

Rate data quality: RICH / MODERATE / LIMITED / INSUFFICIENT

### Step 2: Load ICP Development Skill

Invoke the `icp-development` skill to ensure:
- Schwartz's 5 Awareness Levels framework
- Pain Point Archaeology methodology
- Desire Mapping (Functional → Emotional → Identity)
- Objection Taxonomy
- Transformation Narrative structure

### Step 3: Research Analysis

If customer research is available:
1. Mine for verbatim voice-of-customer quotes
2. Identify pain point patterns
3. Extract desire expressions
4. Document objection language
5. Find buying trigger events
6. Note transformation language

If only competitor data available:
1. Analyze competitor reviews for market voice
2. Mark all insights as INFERRED or HYPOTHESIS
3. Flag for validation

### Step 4: Awareness Assessment

For each emerging ICP segment:
1. Assess primary awareness level
2. Document evidence for assessment
3. Define content strategy implications
4. Note messaging approach

### Step 5: Build ICP Profiles

Create structured profiles including:
- Segment definition
- Psychographic profile (values, beliefs, fears)
- Pain points (with evidence and confidence)
- Desires (functional, emotional, identity)
- Objections (with counter-arguments)
- Buying triggers
- Transformation narrative
- Messaging hooks

### Step 6: Map User Journey

For primary ICP:
1. Map awareness-stage journey
2. Document customer state at each stage
3. Identify content needs per stage
4. Note friction points and drop-off risks
5. Define conversion triggers

### Step 7: Generate Outputs

Create files in outputs directory:

```
/mnt/user-data/outputs/
├── {client}_icp_primary.json
├── {client}_icp_secondary.json (if distinct segment exists)
├── {client}_user_journey.json
└── {client}_research_gaps.json
```

### Step 8: Present Summary

Provide actionable summary:
- Key ICP insights (3-5 bullets)
- Confidence level with explanation
- Critical research gaps
- Messaging implications
- Recommended next steps

---

## Output Quality Standards

### ICP Profile Must Include:
- [ ] Psychographics (not just demographics)
- [ ] Awareness level with evidence
- [ ] At least 3 pain points with quotes/sources
- [ ] At least 3 desires with emotional depth
- [ ] Key objections with counter-arguments
- [ ] Transformation narrative (before/after)
- [ ] Confidence levels on all insights

### User Journey Must Include:
- [ ] All awareness stages mapped
- [ ] Customer state (thinking/feeling/doing) per stage
- [ ] Content needs per stage
- [ ] Conversion triggers
- [ ] Drop-off risks

### Research Gaps Must Include:
- [ ] What's missing
- [ ] Impact on ICP quality
- [ ] Recommended research method
- [ ] Priority level

---

## Handling Common Scenarios

### Scenario: No Customer Research
```
Proceed with competitor review mining + industry inference.
Mark all insights as HYPOTHESIS.
Generate detailed research plan.
State: "ICP confidence: LOW - recommend customer validation before high-stakes use"
```

### Scenario: Conflicting Data Points
```
Document both data points with sources.
Do NOT resolve by assumption.
Present as: "Conflicting signal: [A] vs [B]. Recommend clarifying via [method]"
```

### Scenario: Multiple Distinct Audiences
```
Create separate ICP profiles.
Designate PRIMARY (largest/most valuable).
Note overlap and differences.
Create separate journey maps if journeys differ significantly.
```

### Scenario: B2B with Multiple Stakeholders
```
Create profiles for:
- End User (daily user)
- Economic Buyer (budget holder)
- Technical Evaluator (if applicable)
- Champion (internal advocate)

Map influence and objections for each.
```

---

## Integration

### Consumes
- Client DNA (from `/discover`)
- Customer research data (if provided)
- Competitor information (from DNA or user input)

### Produces Outputs For
- `/strategy` command (uses ICP for positioning)
- `/sitemap` command (uses journey for architecture)
- `/copy` command (uses pain/desire/objection language)
- `/wireframe` command (uses journey stages)
- `conversion-reviewer` agent (validates ICP alignment)
- `landing-page-copywriter` skill
- `website-copywriter` skill

---

## Example Interaction

**User:** `/icp Build profiles for GreenLeaf Organics using the customer reviews I uploaded`

**Agent Response:**

```
## ICP Analysis: GreenLeaf Organics

### Data Sources
✓ Client DNA loaded
✓ 34 customer reviews analyzed (uploaded file)
✓ 12 testimonials from DNA
✗ No interview data
✗ No survey data

**Data Quality: MODERATE**

---

### ICP Profiles Identified

**PRIMARY: "The Conscious Upgrader"**

| Attribute | Value |
|-----------|-------|
| Who | Women 28-42 ready to switch from mass-market |
| Awareness | SOLUTION-AWARE (comparing options) |
| Key Pain | "I can't trust 'natural' claims anymore" |
| Key Desire | Feel good about what touches my skin |
| Key Objection | "Is this actually clean or just marketing?" |
| Trigger | Skin reaction to current product OR article about toxins |

*Confidence: MEDIUM (review evidence, no direct interviews)*

**SECONDARY: "The Ingredient Detective"**

| Attribute | Value |
|-----------|-------|
| Who | Research-driven buyers who read every label |
| Awareness | PRODUCT-AWARE (evaluating specifics) |
| Key Pain | "Most brands hide behind vague claims" |
| Key Desire | Know exactly what I'm putting on my body |
| Key Objection | "Where's the third-party testing?" |
| Trigger | Deep-dive research moment, Reddit thread |

*Confidence: MEDIUM (review evidence)*

---

### Key Messaging Insights

**Pain Language (verbatim from reviews):**
- "I've been burned by greenwashing before"
- "I spent $200 on products that broke me out"
- "I don't have time to research every ingredient"

**Desire Language (verbatim):**
- "I just want something that works AND is clean"
- "I want to stop worrying about what I'm using"
- "I want to feel confident, not paranoid"

**Objection Pattern:**
87% of hesitation mentions TRUST. Top concerns:
1. "How do I know it's actually clean?" (23 mentions)
2. "Will it actually work?" (18 mentions)
3. "Is it worth the price?" (12 mentions)

---

### Critical Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No customer interviews | Can't validate emotional depth | 5-8 calls, 20min each |
| No survey data | Can't quantify priorities | Post-purchase survey |
| No churn data | Don't know why they leave | Exit survey |

---

### Files Generated
- `greenleaf_icp_primary.json`
- `greenleaf_icp_secondary.json`
- `greenleaf_user_journey.json`
- `greenleaf_research_gaps.json`

---

### Recommended Next Steps
1. Review ICPs for accuracy against your intuition
2. Prioritize closing the interview gap (highest impact)
3. Proceed to `/strategy` when ready (noting confidence level)
4. Update ICPs when new research arrives

Ready for `/strategy` or `/sitemap`?
```