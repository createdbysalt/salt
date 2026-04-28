# /discover - Brand Discovery Command

## Purpose
Extract and consolidate brand context for marketing work. This command orchestrates the client-discovery agent and brand-voice-extraction skill to produce actionable brand intelligence.

**For SALT:** Run `/discover self` to consolidate existing `brand-identity/` docs into a unified discovery output. SALT's brand docs are already comprehensive - this mode synthesizes them.

**For Clients:** Run `/discover [client name]` when onboarding external clients.

## When to Use
- **Self mode:** Before building SALT marketing pages (synthesize existing brand docs)
- **Client mode:** Starting a new client project
- Creating foundational documents for strategy work
- Preparing for copywriting or design that requires brand context

## Usage

```
/discover self                    # SALT self-discovery (synthesize existing docs)
/discover [client_name]           # External client discovery
```

**Examples:**
```
/discover self                                     # Synthesize SALT brand docs
/discover Bloom Botanicals                        # New client intake
/discover Acme Corp --with-website https://...    # Client with website analysis
```

## Workflow

### Mode Detection

**If `/discover self`:** Execute Self-Discovery workflow (for SALT marketing)
**If `/discover [client]`:** Execute Client Discovery workflow

---

## Self-Discovery Workflow (SALT)

### Step 1: Load Existing Brand Docs

Read and synthesize SALT's brand-identity folder:

```
brand-identity/
├── foundation/
│   ├── brand-architecture.md     → Business model, positioning
│   ├── brand-essence.md          → Core identity
│   ├── target-audience.md        → ICP summary
│   ├── voice-principles.md       → Voice DNA
│   └── organization-info.md      → Business details
├── positioning/
│   ├── value-proposition.md      → Key differentiators
│   └── competitive-landscape.md  → Competitor analysis
├── voice/
│   ├── terminology.md            → What to call things
│   ├── copy-snippets.md          → Pre-approved patterns
│   └── examples/                 → Writing samples
└── research/
    └── icp-profiles/             → Detailed ICP research
```

### Step 2: Synthesize Client DNA

Extract and consolidate into structured JSON:
- Business identity (from organization-info.md)
- Positioning (from value-proposition.md)
- Target audience (from target-audience.md, icp-profiles/)
- Competitive context (from competitive-landscape.md)

### Step 3: Synthesize Voice Profile

Extract from voice docs:
- Voice attributes (from voice-principles.md)
- Tone spectrum (from voice-principles.md)
- Terminology (from terminology.md)
- Examples (from voice/examples/)

### Step 4: Launch Parallel SEO Research

Spawn background agent to research SEO opportunities:
- Industry keywords for SaaS/studio management
- Competitor SEO analysis
- Page opportunity suggestions

### Step 5: Generate Outputs

Update consolidated files:

```
brand-identity/
├── discovery.json    ← Synthesized DNA + Voice Profile
└── strategy.json     ← SEO research (updated by parallel agent)
```

### Step 6: Present Summary

- Confirmation that brand docs are synthesized
- Any gaps or inconsistencies found
- SEO opportunities identified
- Ready for `/strategy self` or `/copy`

---

## Client Discovery Workflow (External Clients)

### Step 1: Input Assessment

Identify available inputs:
- Discovery questionnaire / intake form
- Client website URL
- Brand guidelines document
- Stakeholder interview notes
- Existing marketing materials
- Competitor information

**If inputs are missing:**
→ List what's available
→ Recommend what additional inputs would improve quality
→ Offer to proceed with available materials (noting limitations)

### Step 2: Invoke Client Discovery Agent

Use the `client-discovery` agent to:
1. Catalog all inputs
2. Extract business information with source citations
3. Identify gaps and contradictions
4. Generate initial Client DNA structure

### Step 3: Invoke Brand Voice Extraction

Using the `brand-voice-extraction` skill:
1. Analyze any writing samples available
2. Score voice dimensions with evidence
3. Generate voice guidelines
4. Flag any voice inconsistencies

### Step 4: Compile Missing Info Manifest

Consolidate all gaps into a single manifest:
- Critical gaps that block work
- High-priority gaps that impact quality
- Medium and low priority items

### Step 5: Generate Outputs

Create files in client project or outputs directory:

```
{client_project}/brand-identity/
├── discovery.json           ← Client DNA + Voice Profile + Missing Info
└── strategy.json            ← SEO research (if parallel research ran)
```

### Step 6: Present Summary

- Key findings (3-5 bullets)
- Confidence level (high/medium/low)
- Critical gaps requiring client input
- Recommended next steps

---

## Output Quality Standards

### Client DNA Must Include:
- [ ] Business identity with sources
- [ ] Positioning and differentiators
- [ ] Target audience summary
- [ ] Project goals and constraints
- [ ] All fields have confidence levels

### Voice Profile Must Include:
- [ ] All six dimension scores with evidence
- [ ] At least 2 supporting quotes per dimension
- [ ] Do's and Don'ts with examples
- [ ] Confidence level notation

### Missing Info Manifest Must Include:
- [ ] Prioritized gaps (critical → low)
- [ ] Specific questions to ask client
- [ ] Impact of each gap on downstream work

---

## Handling Common Scenarios

### Scenario: Only Questionnaire Available
```
Proceed with questionnaire analysis.
Note: "Voice profile confidence: LOW - no writing samples analyzed"
Recommend: "Request 2-3 samples of existing content for voice extraction"
```

### Scenario: Only Website Available
```
Proceed with website analysis.
Extract voice from website copy.
Note: "Business details limited to public information"
Recommend: "Request intake questionnaire for strategic context"
```

### Scenario: Contradictions Found
```
Document contradictions in Client DNA "contradictions_flagged" field.
Do NOT resolve contradictions by assumption.
Add to Missing Info as: "Clarification needed: [specific question]"
```

### Scenario: Client Says "Just Use Your Judgment"
```
Still document gaps.
Provide options rather than assumptions.
Note: "Client has authorized inference, but recommend validation before launch"
```

---

## Integration

This command produces outputs used by:
- `/icp` command (uses Client DNA for audience research)
- `/strategy` command (uses both DNA and Voice Profile)
- `/copy` command (uses Voice Profile for tone)
- `competitor-analysis` skill (uses competitive set from DNA)

Always save outputs to `/mnt/user-data/outputs/` for downstream access.

---

## Example Interaction

**User:** `/discover Process the intake form I uploaded for GreenLeaf Organics`

**Agent Response:**

```
## Discovery Analysis: GreenLeaf Organics

### Inputs Analyzed
✓ Intake questionnaire (42 questions answered)
✗ Website not provided
✗ Writing samples not provided

### Key Findings
1. **Business**: Organic skincare, DTC model, founded 2021
2. **Positioning**: "Clean beauty without compromise" - premium tier
3. **Target**: Health-conscious women 28-45, urban/suburban
4. **Goals**: Increase AOV by 20%, launch subscription model
5. **Voice preference stated**: "Warm, knowledgeable, never preachy"

### Confidence Level: MEDIUM
- Business details: HIGH (comprehensive questionnaire)
- Voice profile: LOW (no writing samples to analyze)

### Critical Gaps
1. No existing content to extract actual voice (stated preference ≠ practice)
2. Competitor list mentioned but not provided
3. Customer testimonials referenced but not included

### Files Generated
- `greenleaf_organics_client_dna.json`
- `greenleaf_organics_voice_profile.json` (placeholder - needs samples)
- `greenleaf_organics_missing_info.json`

### Recommended Next Steps
1. Request 3-5 writing samples (emails, social posts, product descriptions)
2. Get competitor URLs for analysis
3. Obtain 5+ customer testimonials with permission to use
4. Schedule 15-min call to resolve positioning questions

Proceed with `/icp` when gaps are resolved, or continue with current data (noting limitations)?
```