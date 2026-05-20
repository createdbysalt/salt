---
name: deep-research
description: |
  Research methodology framework for pre-build intelligence gathering. Provides structured approaches to investigating features, UX patterns, and product decisions before development begins.

  USE THIS SKILL WHEN:
  - Investigating a feature before building
  - Analyzing user psychology and pain points
  - Evaluating competitive landscape
  - Validating demand signals
  - Researching UX best practices

  PROVIDES: Research frameworks, question formulations, source evaluation criteria, synthesis patterns
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# Deep Research Skill

A methodology framework for conducting rigorous pre-build research that informs better product decisions.

## Core Philosophy

**Research Before Build** — Every feature decision should be informed by evidence, not assumption. This skill provides the frameworks to gather that evidence systematically.

**Confidence Over Certainty** — Perfect information doesn't exist. The goal is to reach sufficient confidence to make informed decisions, while clearly documenting what we don't know.

**Actionable Intelligence** — Research that doesn't lead to decisions is wasted effort. Every finding should connect to a build implication.

---

## The 5 Research Dimensions

### 1. User Psychology

Understanding the human behind the feature request.

**Key Questions:**
- What pain are users experiencing that this feature addresses?
- What's the emotional cost of the current situation?
- What do users desire at functional, emotional, and identity levels?
- What mental models do users have about this problem space?
- What behavioral patterns exist around this problem?
- What would trigger a user to seek this solution NOW?

**Research Sources:**
- Customer interviews and surveys
- Support tickets and feedback
- Forum discussions (Reddit, industry forums)
- Social media conversations
- Review sites (G2, Capterra, App Store)
- User testing sessions

**Output Pattern:**
```json
{
  "pain_points": [
    {
      "surface": "What users say",
      "root": "The actual problem",
      "emotional": "How it makes them feel",
      "frequency": "How often this occurs",
      "severity": "Impact level",
      "confidence": "STATED|INFERRED|HYPOTHESIS",
      "source": "Where this came from"
    }
  ],
  "desires": [
    {
      "functional": "What they want to do",
      "emotional": "How they want to feel",
      "identity": "Who they want to be",
      "priority": "must_have|important|nice_to_have",
      "confidence": "STATED|INFERRED|HYPOTHESIS",
      "source": "Where this came from"
    }
  ],
  "mental_models": [
    {
      "model": "How users think about this",
      "implications": "What this means for design"
    }
  ],
  "triggers": [
    {
      "event": "What makes them act",
      "type": "external|internal|deadline|social",
      "urgency": "high|medium|low"
    }
  ]
}
```

### 2. Competitive Landscape

Understanding what exists and where the gaps are.

**Key Questions:**
- Who else solves this problem?
- How do they solve it?
- What do users love about existing solutions?
- What do users hate about existing solutions?
- What's missing from the market?
- What would differentiate our approach?

**Research Sources:**
- Competitor products (direct usage)
- Competitor reviews and ratings
- Feature comparison sites
- Industry analyst reports
- Competitor pricing pages
- Job postings (what they're building)

**Output Pattern:**
```json
{
  "competitors": [
    {
      "name": "Competitor name",
      "approach": "How they solve it",
      "strengths": ["What they do well"],
      "weaknesses": ["Where they fall short"],
      "user_sentiment": "Overall perception",
      "market_position": "premium|mid|budget"
    }
  ],
  "market_gaps": [
    {
      "gap": "What's missing",
      "evidence": "How we know this",
      "opportunity_size": "large|medium|small",
      "difficulty_to_address": "high|medium|low"
    }
  ],
  "differentiation_opportunities": [
    {
      "angle": "How we could differentiate",
      "feasibility": "high|medium|low",
      "defensibility": "How sustainable is this advantage"
    }
  ]
}
```

### 3. Technical Feasibility

Understanding what it takes to build.

**Key Questions:**
- What existing patterns can we leverage?
- What new systems would need to be created?
- What integrations are required?
- What are the scalability considerations?
- What are the security implications?
- What's the technical debt risk?

**Research Sources:**
- Existing codebase analysis
- Architecture documentation
- Technology documentation
- Similar implementations (open source, case studies)
- Team expertise inventory
- Infrastructure constraints

**Output Pattern:**
```json
{
  "existing_patterns": [
    {
      "pattern": "What we can reuse",
      "location": "Where it exists",
      "adaptation_needed": "What changes required"
    }
  ],
  "new_requirements": [
    {
      "component": "What needs to be built",
      "complexity": "high|medium|low",
      "dependencies": ["What it needs"]
    }
  ],
  "integration_points": [
    {
      "system": "What we need to connect to",
      "type": "internal|external|third-party",
      "risk_level": "high|medium|low"
    }
  ],
  "concerns": [
    {
      "concern": "What could go wrong",
      "category": "scalability|security|performance|maintenance",
      "mitigation": "How to address"
    }
  ]
}
```

### 4. Market Validation

Understanding if real demand exists.

**Key Questions:**
- Are people actively seeking solutions to this problem?
- Are they willing to pay for it?
- How urgent is the need?
- What's the market size?
- What trends support or threaten this feature?
- What do early signals indicate?

**Research Sources:**
- Search volume data (Google Trends, Ahrefs)
- Forum request frequency
- Feature request logs
- Sales team feedback
- Customer advisory board input
- Industry trend reports

**Output Pattern:**
```json
{
  "demand_signals": [
    {
      "signal": "What we observed",
      "source": "Where we found it",
      "strength": "strong|moderate|weak",
      "recency": "When this was observed"
    }
  ],
  "willingness_to_pay": {
    "evidence": "What suggests they'd pay",
    "price_sensitivity": "high|medium|low",
    "confidence": "HIGH|MEDIUM|LOW|HYPOTHESIS"
  },
  "market_trends": [
    {
      "trend": "What's happening in the market",
      "direction": "growing|stable|declining",
      "impact_on_feature": "tailwind|headwind|neutral",
      "source": "Where this came from"
    }
  ],
  "early_indicators": [
    {
      "indicator": "What the data shows",
      "interpretation": "What it means",
      "confidence": "HIGH|MEDIUM|LOW"
    }
  ]
}
```

### 5. UX Patterns

Understanding established best practices.

**Key Questions:**
- How do best-in-class products handle this?
- What user expectations exist from other contexts?
- What accessibility requirements apply?
- What cognitive load considerations exist?
- What interaction patterns are proven?
- What anti-patterns should we avoid?

**Research Sources:**
- Design pattern libraries (Mobbin, Pttrns)
- Accessibility guidelines (WCAG)
- Platform guidelines (Apple HIG, Material Design)
- UX research papers
- Usability study findings
- Best-in-class product analysis

**Output Pattern:**
```json
{
  "established_patterns": [
    {
      "pattern": "What's commonly used",
      "examples": ["Products that use it"],
      "why_it_works": "The psychology behind it",
      "applicability": "How it fits our context"
    }
  ],
  "accessibility_requirements": [
    {
      "requirement": "What must be supported",
      "standard": "WCAG level or guideline",
      "implementation_notes": "How to achieve"
    }
  ],
  "cognitive_considerations": [
    {
      "consideration": "Mental load factor",
      "risk": "What could overwhelm users",
      "mitigation": "How to simplify"
    }
  ],
  "anti_patterns": [
    {
      "pattern": "What to avoid",
      "why_problematic": "The issue it causes",
      "alternative": "What to do instead"
    }
  ]
}
```

---

## Research Process Framework

### Phase 1: Question Formulation

Before researching, define exactly what you need to know.

```
RESEARCH BRIEF
Feature/Concept: [What are we investigating?]
Decision to Make: [What choice does this research inform?]
Key Questions: [3-5 specific questions to answer]
Success Criteria: [What would "enough" research look like?]
Dimensions to Cover: [Which of the 5 dimensions?]
Time Budget: [How much research effort is appropriate?]
```

### Phase 2: Source Gathering

Identify where to find answers.

**Primary Sources** (direct evidence):
- Customer interviews
- Usage analytics
- A/B test results
- Direct competitor usage

**Secondary Sources** (indirect evidence):
- Reviews and ratings
- Forum discussions
- Industry reports
- Expert opinions

**Tertiary Sources** (synthesized evidence):
- Trend analyses
- Best practice guides
- Case studies

### Phase 3: Evidence Collection

Gather information systematically.

**For each finding:**
1. State the finding clearly
2. Note the source
3. Assess confidence level
4. Identify contradicting evidence
5. Note implications

**Confidence Levels:**
- `HIGH`: Multiple corroborating sources, direct evidence
- `MEDIUM`: Single reliable source or multiple indirect sources
- `LOW`: Limited evidence, mostly inferred
- `HYPOTHESIS`: Educated guess, no direct evidence

### Phase 4: Synthesis

Transform findings into actionable intelligence.

**Pattern Recognition:**
- What themes emerge across sources?
- Where do sources agree? Disagree?
- What's consistently missing?

**Gap Analysis:**
- What questions remain unanswered?
- What would change the decision if known?
- What research would be most valuable next?

**Decision Framing:**
- What does the evidence suggest?
- What's the confidence in that suggestion?
- What would need to be true for an alternative to be better?

### Phase 5: Recommendation Formation

Convert synthesis into action.

**The Decision Matrix:**
```
SHOULD WE BUILD THIS?
□ YES - Evidence strongly supports
□ YES WITH CAVEATS - Evidence supports with noted risks
□ NEEDS MORE RESEARCH - Can't decide without specific information
□ NO - Evidence suggests against
□ PIVOT - Evidence suggests a different approach
```

**Supporting Elements:**
- Clear reasoning chain from evidence to recommendation
- Acknowledged uncertainties and risks
- Specific next steps for each path
- Criteria for re-evaluation

---

## Anti-Hallucination Protocol

### Rule 1: No Fabricated Evidence
```
✗ WRONG: "Users report frustration with..." (no source)
✓ RIGHT: "Users report frustration with... [Source: Reddit r/productivity, 47 comments, Jan 2024]"
✓ RIGHT: "HYPOTHESIS: Users may be frustrated with... [No direct evidence - inferred from competitor reviews]"
```

### Rule 2: Distinguish Confidence Levels
```
✗ WRONG: Presenting all findings with equal weight
✓ RIGHT: Clearly marking each finding with HIGH/MEDIUM/LOW/HYPOTHESIS
```

### Rule 3: Document Gaps
```
✗ WRONG: Only reporting what was found
✓ RIGHT: "We could not find evidence for X. This gap is significant because..."
```

### Rule 4: Source Everything
```
✗ WRONG: "Best practice suggests..."
✓ RIGHT: "Apple HIG recommends... [Source: developer.apple.com/design/human-interface-guidelines]"
```

### Rule 5: Flag Contradictions
```
✗ WRONG: Cherry-picking supporting evidence
✓ RIGHT: "Source A suggests X while Source B suggests Y. The contradiction may be due to..."
```

---

## Output Quality Checklist

Before finalizing research output:

### Completeness
- [ ] All requested dimensions covered
- [ ] Key questions from brief answered (or gaps documented)
- [ ] Decision matrix completed
- [ ] Next steps provided for all paths

### Evidence Quality
- [ ] Every finding has a source
- [ ] Confidence levels assigned throughout
- [ ] Contradictions noted and analyzed
- [ ] Gaps explicitly documented

### Actionability
- [ ] Findings connect to build implications
- [ ] Recommendation is clear and justified
- [ ] Next steps are specific and prioritized
- [ ] Research gaps have collection strategies

### Format
- [ ] JSON outputs are valid and complete
- [ ] Markdown is readable and well-structured
- [ ] Citations are consistent and traceable

---

## Integration with Other Agents

**This skill supports:**
- `gemini-researcher` agent (primary user)
- `icp-analyst` agent (user psychology dimension)
- `ux-strategist` agent (UX patterns dimension)
- `architect` agent (technical feasibility dimension)

**Output feeds into:**
- `/discover` command (as pre-research context)
- `/icp` command (as customer research input)
- `/strategy` command (as market validation)
- `/prd` command (as requirements foundation)
- `/ralph` command (as phase 0 research)
