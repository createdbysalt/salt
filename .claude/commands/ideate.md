# /ideate - Strategic Feature Ideation

Generate brand-aligned feature ideas, evaluate them against multiple frameworks, research competitive differentiation, and output prioritized opportunities ready for `/problem`.

## Purpose

Before you can define a problem worth solving (`/problem`), you need to identify which problems are worth exploring. This command systematically generates and evaluates feature opportunities grounded in:

- Salt Core's brand identity and 4-layer architecture
- ICP psychology (fears, desires, jobs-to-be-done)
- Competitive landscape and differentiation opportunities
- Multiple evaluation frameworks (not just gut feel)

## When to Use

- **Roadmap planning** — "What should we build next?"
- **Opportunity exploration** — "Where are the gaps we could fill?"
- **Competitive response** — "Competitor X launched Y, how should we respond?"
- **Strategic alignment** — "Does this idea even fit our brand?"
- **Quarterly planning** — Generate and prioritize a quarter's worth of ideas

## Usage

```bash
# Full ideation cycle (all layers, all techniques)
/ideate

# Focus on specific architecture layer
/ideate --layer intelligence
/ideate --layer operations
/ideate --layer delivery
/ideate --layer platform

# Focus on specific ICP segment
/ideate --icp designer-developer
/ideate --icp traditional-developer

# Research a specific competitor first
/ideate --competitor "Queue"
/ideate --competitor "SuperOkay"

# Seed with a theme or area
/ideate "client communication improvements"
/ideate "AI-powered features"

# Quick mode (fewer techniques, faster output)
/ideate --quick

# Deep mode (comprehensive research, more ideas)
/ideate --deep

# Output specific format
/ideate --output json
/ideate --output markdown
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `query` | Optional theme or area to focus ideation | All areas |
| `--layer` | Focus on specific architecture layer | All layers |
| `--icp` | Focus on specific ICP segment | All segments |
| `--competitor` | Deep-dive a specific competitor first | None |
| `--quick` | Faster, fewer techniques | `false` |
| `--deep` | Comprehensive, more techniques | `false` |
| `--output` | Output format: `json`, `markdown`, `both` | `both` |

## The Eight Phases

### Phase 1: Context Loading (Automatic)

Load Salt Core's brand identity and current state:

```
brand-identity/
├── foundation/brand-architecture.md   → 4-layer architecture, the moat
├── foundation/target-audience.md      → ICP fears, desires, JTBD
├── foundation/voice-principles.md     → Brand alignment criteria
├── positioning/competitive-landscape.md → Competitors, gaps
├── product/feature-inventory.md       → Current state
└── product/roadmap.md                 → Planned direction
```

**Output:** Structured context object with:
- Architecture layers and their purposes
- ICP segments with psychological profiles
- Competitor matrix with strengths/gaps
- Current feature set
- Roadmap priorities

---

### Phase 2: Opportunity Identification

Transform ICP psychology into concrete opportunities.

**Techniques:**
1. **Parse ICP Jobs** — Extract functional, emotional, social jobs from target-audience.md
2. **Map Unmet Needs** — Convert fears/desires tables into opportunity statements
3. **ERRC Analysis** — Run Eliminate/Reduce/Raise/Create vs. each competitor
4. **Gap Analysis** — What do competitors lack that our ICP needs?

**Output:** Opportunity Solution Tree

```
Outcome: Grow studio revenue to $150k+
├── Opportunity: Win more $10k+ projects
│   ├── Sub-opp: Differentiate from commodity designers
│   ├── Sub-opp: Justify premium pricing with data
│   └── Sub-opp: Create compelling proposals faster
├── Opportunity: Convert projects to retainers
│   ├── Sub-opp: Prove ongoing value monthly
│   └── Sub-opp: Make cancellation painful
└── Opportunity: Reduce non-billable time
    ├── Sub-opp: Automate invoicing/proposals
    └── Sub-opp: Streamline client communication
```

---

### Phase 3: Idea Generation (Multi-Technique)

Generate ideas using multiple techniques to ensure breadth.

| Technique | Description | Example Application |
|-----------|-------------|---------------------|
| **SCAMPER** | Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse | Take "project dashboard" → What if we combined it with competitor intelligence? |
| **Figurestorming** | Generate ideas as different personas | "What would a designer-developer with imposter syndrome need to feel confident?" |
| **Competitive Gap Filling** | What competitors lack | "Queue has no strategic intelligence — we could add AI brief generation" |
| **Blue Ocean Creation** | What the industry hasn't offered | "No one unifies strategic + technical — what else can we unify?" |
| **Six Paths Exploration** | Look across boundaries | Alternative industries, buyer groups, complementary services, time trends |
| **Reverse Brainstorming** | "What would make this worse?" | "What would make client delivery MORE painful?" → Invert for ideas |

**Output:** Raw idea list (quantity over quality at this stage)

---

### Phase 4: Brand Alignment Filter

Every idea passes through alignment checks.

**Must Align With:**

| Criterion | Check | Source |
|-----------|-------|--------|
| **4-Layer Architecture** | Does it fit Intelligence, Operations, Delivery, or Platform? | brand-architecture.md |
| **The Moat** | Does it strengthen "unified strategic + technical intelligence"? | competitive-landscape.md |
| **Primary ICP** | Does it address designer-developer fears/desires/jobs? | target-audience.md |
| **Linear Standard UX** | Is it keyboard-centric, information-dense, fast? | brand-architecture.md |
| **Composable Philosophy** | Does it avoid making Salt Core a monolith? | brand-architecture.md |

**Auto-Reject Filters:**
- Features targeting "complete beginners" or "non-technical founders"
- Features competing on price rather than value
- Features diluting the strategic + technical moat
- Features that don't fit any architecture layer

**Output per idea:**
- `ALIGNED` — Proceed to evaluation
- `MISALIGNED` — Rejected with reason
- `NEEDS_ADAPTATION` — Could align with modifications (list them)

---

### Phase 5: Competitive Research (Deep Dive)

For aligned ideas, research competitive context.

**Research Questions:**
1. Who else is doing this? How?
2. What are users saying about their solutions? (Reviews, forums, Twitter)
3. What's the gap between what exists and what's ideal?
4. How can Salt Core do this better/differently?

**Output per idea:**
- Competitor implementations (if any)
- User sentiment about existing solutions
- Differentiation opportunity score
- "How we do it better" strategy

---

### Phase 6: Multi-Framework Evaluation

Score each aligned idea against multiple frameworks.

| Framework | What It Measures | Formula/Method |
|-----------|------------------|----------------|
| **Opportunity Score** | Unmet need intensity | `Importance + (Importance - Satisfaction)` |
| **Kano Category** | Feature type | Must-have, Performance, or Delighter |
| **Value vs. Effort** | ROI potential | Quick Win, Major Project, Fill-in, or Time Sink |
| **Strategic Alignment** | Moat/roadmap fit | Score 1-5 |
| **PMF Impact** | Love potential | "Would users be 'very disappointed' to lose this?" |
| **Differentiation** | Uniqueness | Unique, Differentiating, Parity, or Commoditized |

**Weighted Composite Score (Salt Core defaults):**

| Criterion | Weight |
|-----------|--------|
| Strategic Alignment | 30% |
| ICP Impact | 25% |
| Differentiation | 20% |
| Effort (inverse) | 15% |
| Kano Bonus | 10% |

---

### Phase 7: Reasoning & Comparison

For top 5 ideas, generate deep reasoning.

**Per idea:**
- **Full reasoning chain** — Why this idea? Why now? What evidence supports it?
- **Tradeoff analysis** — What do we give up by building this? What competes for the same resources?
- **Risk assessment** — What could go wrong? Technical risks? Market risks? Brand risks?
- **Dependencies** — What else needs to exist first?
- **Recommended next step** — `/problem`, `/research`, or defer

**Comparison section:**
- Head-to-head comparison of top 3 ideas
- "If you can only build one..." recommendation with reasoning

---

### Phase 8: Output

**Files generated:**

```
brand-identity/product/ideation/
├── opportunities-[date].json       # Structured idea backlog
├── opportunities-[date].md         # Human-readable brief
├── strategy-canvas-[date].md       # Competitive positioning visual
└── reasoning-[date].md             # Full reasoning documentation
```

**opportunities-[date].json structure:**

```json
{
  "generated_at": "2026-01-31T...",
  "context": {
    "layers_analyzed": ["intelligence", "operations", "delivery", "platform"],
    "icp_segments": ["designer-developer", "traditional-developer"],
    "competitors_analyzed": ["Queue", "SuperOkay", "Competely", "GoHighLevel"]
  },
  "opportunities": [
    {
      "id": "opp-001",
      "title": "AI-Powered Client Brief Generator",
      "description": "...",
      "layer": "intelligence",
      "icp_segment": "designer-developer",
      "scores": {
        "opportunity_score": 8.5,
        "kano_category": "delighter",
        "value_vs_effort": "quick_win",
        "strategic_alignment": 5,
        "pmf_impact": "high",
        "differentiation": "unique",
        "composite": 87
      },
      "alignment": {
        "status": "ALIGNED",
        "architecture_fit": "intelligence",
        "moat_strengthening": true,
        "icp_job_addressed": "Win $10k+ projects consistently"
      },
      "competitive_context": {
        "competitors_with_similar": [],
        "differentiation_strategy": "Combine strategic brief with technical audit",
        "user_sentiment": "No existing solutions do this well"
      },
      "reasoning": "...",
      "risks": ["..."],
      "dependencies": ["..."],
      "recommended_next_step": "/problem"
    }
  ],
  "strategy_canvas": {
    "factors": ["Strategic Intelligence", "Technical Monitoring", "Client Portal", "..."],
    "salt_core": [5, 5, 4, ...],
    "competitors": {
      "Queue": [1, 1, 3, ...],
      "SuperOkay": [1, 1, 5, ...]
    }
  },
  "recommendation": {
    "top_pick": "opp-001",
    "reasoning": "...",
    "if_limited_resources": "opp-001",
    "suggested_sequence": ["opp-001", "opp-003", "opp-002"]
  }
}
```

---

## Example Session

```bash
> /ideate "improve client delivery experience"

Loading brand context...
✓ Brand architecture (4-layer)
✓ Target audience (3 segments)
✓ Competitive landscape (7 categories)
✓ Feature inventory (current state)
✓ Roadmap (planned features)

Identifying opportunities...
✓ 12 opportunities from ICP jobs
✓ 8 opportunities from fear/desire mapping
✓ 6 opportunities from competitive gaps

Generating ideas...
✓ SCAMPER: 15 ideas
✓ Figurestorming: 8 ideas
✓ Competitive gap filling: 6 ideas
✓ Blue Ocean creation: 4 ideas
Total: 33 raw ideas

Filtering for brand alignment...
✓ 24 aligned
✗ 6 misaligned (rejected)
⚡ 3 need adaptation

Researching competitive context...
✓ Analyzed Queue, SuperOkay, GoHighLevel
✓ Gathered user sentiment from Reddit, Twitter

Evaluating across frameworks...
✓ Opportunity scores calculated
✓ Kano categories assigned
✓ Value vs. effort mapped
✓ Composite scores computed

Top 5 Opportunities:

1. **Real-Time Project Status for Clients** (Score: 92)
   Layer: Delivery | Kano: Performance | Effort: Medium
   "Clients see live project progress without asking"
   → Recommended: /problem

2. **AI Meeting Summary to Client Brief** (Score: 88)
   Layer: Intelligence | Kano: Delighter | Effort: Medium
   "Record client call → auto-generate project brief"
   → Recommended: /research first

3. **Client Feedback Collection System** (Score: 85)
   Layer: Delivery | Kano: Must-Have | Effort: Low
   "Structured way to collect and act on client feedback"
   → Recommended: /problem

4. **White-Label Email Domain** (Score: 81)
   Layer: Platform | Kano: Performance | Effort: High
   "Emails come from @clientstudio.com not @saltcore.io"
   → Recommended: Defer (high effort)

5. **Client Onboarding Automation** (Score: 79)
   Layer: Operations | Kano: Performance | Effort: Medium
   "Automated welcome sequence when client added"
   → Recommended: /problem

Files saved:
- brand-identity/product/ideation/opportunities-2026-01-31.json
- brand-identity/product/ideation/opportunities-2026-01-31.md
- brand-identity/product/ideation/strategy-canvas-2026-01-31.md
- brand-identity/product/ideation/reasoning-2026-01-31.md

Next step: Run `/problem "Real-Time Project Status for Clients"` to define the problem worth solving.
```

---

## Integration with Pipeline

```
/ideate → /problem → /solution → /prd → /ralph
   │
   │   Generates prioritized opportunities
   │   with reasoning and competitive context
   │
   └── User picks which opportunity to pursue
       └── /problem deep-dives that specific opportunity
```

**The handoff:**
- `/ideate` generates WHAT might be worth building (breadth)
- `/problem` validates WHO has this problem and WHY it's urgent (depth)
- `/solution` explores HOW to solve it with delight
- `/prd` specifies WHAT exactly to build
- `/ralph` builds it

---

## Autonomy Levels

| Level | Behavior | Use When |
|-------|----------|----------|
| `--supervised` | Pause after each phase for approval | First time using, learning the tool |
| `--guided` (default) | Auto-run, pause before final output | Regular usage |
| `--autonomous` | Full auto, proceed to recommendation | Trusted, low-stakes exploration |

---

## Quality Standards

**Ideation is ready when:**
- [ ] All architecture layers considered
- [ ] All ICP segments considered
- [ ] Multiple ideation techniques applied
- [ ] Brand alignment filter applied to all ideas
- [ ] Competitive context researched for top ideas
- [ ] Multiple evaluation frameworks applied
- [ ] Reasoning documented for top 5
- [ ] Clear recommendation with rationale

**Red flags to address:**
- All ideas in one layer (missing breadth)
- No delighters (all must-haves = boring)
- No differentiated ideas (all parity = why bother)
- Missing competitive research (building blind)

---

## Anti-Patterns

**Don't use /ideate for:**
- Validating a single pre-decided idea (use `/research` or `/problem`)
- Technical implementation questions (use Task agents)
- UX pattern research (use `/research --dimensions ux-patterns`)

**Don't skip to /prd:**
- `/ideate` generates opportunities, not solutions
- Even great ideas need `/problem` validation before `/solution` exploration

---

## See Also

- `/problem` — Define the problem worth solving (next step)
- `/solution` — Explore solution options with delight criteria
- `/prd` — Generate production-ready requirements
- `/research` — Deep-dive specific questions
- `strategic-ideator` agent — The underlying implementation
- `brand-identity/` — The brand context this command loads
