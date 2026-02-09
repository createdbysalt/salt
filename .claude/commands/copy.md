---
name: copy
description: "Generate brand-aligned marketing copy for Salt Core. Enforces voice guidelines and AI Detection Kill List."
---

# /copy - Marketing Copy Generation

Generate conversion-optimized marketing copy that follows Salt Core's brand voice and passes AI detection scrutiny.

## Purpose

Create copy for marketing pages, features, CTAs, and other customer-facing content. This command orchestrates the `marketing-copywriter` agent with built-in Voice Guardian checks.

## When to Use

- Writing new marketing page copy
- Refreshing existing page content
- Creating feature descriptions
- Writing CTAs and microcopy
- Developing email subject lines
- Any customer-facing text for saltcore.io

## Usage

```bash
# Generate hero section copy
/copy hero
/copy hero --page homepage
/copy hero --page pricing

# Generate feature copy
/copy feature "strategic intelligence"
/copy feature "client portal" --style minimal

# Generate CTA variations
/copy cta "signup"
/copy cta "waitlist" --urgency low

# Generate full page copy
/copy page homepage
/copy page pricing
/copy page features

# Generate specific section
/copy section "problem-statement"
/copy section "transformation"
/copy section "social-proof"

# Check existing copy
/copy check "Your existing copy here..."
/copy check --file app/(public)/page.tsx
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `type` | Copy type: `hero`, `feature`, `cta`, `page`, `section`, `check` | `hero` |
| `target` | Feature name, page name, or section name | - |
| `--page` | Target page context | `homepage` |
| `--style` | Writing style: `minimal`, `warm`, `urgent` | `minimal` |
| `--urgency` | CTA urgency level: `low`, `medium`, `high` | `low` |
| `--variations` | Number of options to generate | `3` |
| `--file` | File path for checking existing copy | - |

## Copy Types

### hero
Generate hero section copy (headline, subheadline, CTA).

```bash
/copy hero --page homepage

Output:
┌─────────────────────────────────────────────────────────────┐
│ HEADLINE                                                     │
│ "Win $10k+ projects"                                         │
│                                                              │
│ SUBHEADLINE                                                  │
│ "The studio OS that transforms designer-developers          │
│  into strategic consultants."                                │
│                                                              │
│ CTA                                                          │
│ "Join the waitlist"                                          │
└─────────────────────────────────────────────────────────────┘
```

### feature
Generate feature description copy.

```bash
/copy feature "ambient intelligence"

Output:
┌─────────────────────────────────────────────────────────────┐
│ TITLE                                                        │
│ "Intelligence when you need it"                              │
│                                                              │
│ DESCRIPTION                                                  │
│ "Contextual insights surface automatically. Deadlines,      │
│  upsell opportunities, client patterns—all without you      │
│  asking."                                                    │
└─────────────────────────────────────────────────────────────┘
```

### cta
Generate call-to-action variations.

```bash
/copy cta "waitlist"

Output:
┌─────────────────────────────────────────────────────────────┐
│ Option A (Recommended): "Join the waitlist"                  │
│ Option B: "Get early access"                                 │
│ Option C: "Reserve your spot"                                │
└─────────────────────────────────────────────────────────────┘
```

### page
Generate complete page copy following structure.

```bash
/copy page homepage

Output:
Full markdown document with all sections:
- Hero
- Problem statement
- Solution/transformation
- Features (3-4)
- Social proof approach
- Final CTA
```

### section
Generate a specific page section.

```bash
/copy section "problem-statement"
```

### check
Run Voice Guardian on existing copy.

```bash
/copy check "Leverage our cutting-edge solution to streamline your workflow"

Output:
┌─────────────────────────────────────────────────────────────┐
│ VOICE GUARDIAN REPORT                                        │
│                                                              │
│ ❌ VIOLATIONS FOUND: 3                                        │
│                                                              │
│ 1. "leverage" → Replace with "use"                           │
│ 2. "cutting-edge" → Replace with "modern"                    │
│ 3. "streamline" → Replace with "simplify"                    │
│                                                              │
│ SUGGESTED REWRITE:                                           │
│ "Use our modern solution to simplify your workflow"          │
└─────────────────────────────────────────────────────────────┘
```

## Voice Guardian Integration

Every output automatically runs through Voice Guardian checks:

1. **Kill List Scan** - Checks for banned words/phrases
2. **Word Count Validation** - Ensures copy meets length limits
3. **Tone Verification** - Confirms pro-grade warmth
4. **Claim Validation** - Verifies pre-revenue appropriateness

## Style Options

### minimal (default)
Linear/Vercel style. Short, technical, assumes competence.
```
"Strategic intelligence. Built in."
```

### warm
More emotional, validates the audience's journey.
```
"You're building at 10x speed. It's time your rates caught up."
```

### urgent
Creates time pressure (use sparingly).
```
"Join 47 studios already on the waitlist."
```

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      /copy [type]                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: CONTEXT LOADING                                    │
│  ─────────────────────────                                   │
│  • Load voice-principles.md                                  │
│  • Load terminology.md                                       │
│  • Load target-audience.md                                   │
│  • Load value-proposition.md                                 │
│                                                              │
│  PHASE 2: FRAMEWORK SELECTION                                │
│  ─────────────────────────────                               │
│  • Hero → PAS framework                                      │
│  • Feature → FAB framework                                   │
│  • Transformation → BAB framework                            │
│                                                              │
│  PHASE 3: GENERATION                                         │
│  ─────────────────────────                                   │
│  • Generate 3 variations                                     │
│  • Apply style modifiers                                     │
│                                                              │
│  PHASE 4: VOICE GUARDIAN                                     │
│  ─────────────────────────                                   │
│  • Kill List scan                                            │
│  • Word count check                                          │
│  • Tone verification                                         │
│  • Claim validation                                          │
│                                                              │
│  PHASE 5: OUTPUT                                             │
│  ─────────────────────────                                   │
│  • Present variations with reasoning                         │
│  • Recommend winner                                          │
│  • Show Voice Guardian report                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Pre-Revenue Constraints

The agent enforces pre-revenue appropriate copy:

### Allowed
- Product descriptions
- Aspirational transformations
- Origin story ("Built by a studio, for studios")
- Technical credibility
- Philosophy statements

### Not Allowed
- User counts (unless true)
- Unverified testimonials
- ROI claims without data
- "Trusted by X companies"

## Example Output

```markdown
═══════════════════════════════════════════════════════════════
HOMEPAGE HERO COPY
═══════════════════════════════════════════════════════════════

### Option A (Recommended)

**Headline:**
> Win $10k+ projects

**Subheadline:**
> The studio OS that transforms designer-developers into strategic 
> consultants. Strategy, operations, client portal—unified.

**CTA:**
> Join the waitlist

*Reasoning: Direct benefit in headline. Subheadline explains the
how and for whom. Low-friction CTA appropriate for pre-revenue.*

---

### Option B

**Headline:**
> Stop competing on price

**Subheadline:**
> Salt Core gives you the strategic intelligence that separates
> $3k projects from $10k+ engagements.

**CTA:**
> Get early access

*Reasoning: Pain-focused approach. May resonate more with
audience already feeling the squeeze. Slightly more urgent CTA.*

---

### Option C

**Headline:**
> Strategic intelligence for studios

**Subheadline:**
> Everything you need to win premium projects and run a
> profitable studio. Built by designers, for designers.

**CTA:**
> Reserve your spot

*Reasoning: More descriptive, less punchy. Good for audiences
needing more context before committing.*

───────────────────────────────────────────────────────────────
VOICE GUARDIAN REPORT
───────────────────────────────────────────────────────────────
✅ Kill List violations: 0
✅ Word counts: All within limits
✅ Tone: Pro-grade warmth
✅ Claims: Pre-revenue appropriate

All options passed Voice Guardian checks.
═══════════════════════════════════════════════════════════════
```

## Integration with Other Commands

| Command | Integration |
|---------|-------------|
| `/optimize` | Provides SEO keywords for copy |
| `/build-page` | Receives copy for implementation |
| `/write` | Shares voice guidelines |
| `/brand-check` | Validates against brand docs |

## Output Locations

Generated copy can be:
- Displayed in terminal (default)
- Saved to file with `--output [path]`
- Piped to `/build-page` for implementation

## Troubleshooting

### "Voice Guardian flagged this word"
Check the AI Detection Kill List. Replace with suggested alternative.

### "Word count exceeded"
Edit for brevity. Headlines max 8 words, CTAs max 4 words.

### "Claim not appropriate for pre-revenue"
Remove or rephrase claims that require social proof we don't have.

## See Also

- `marketing-copywriter` agent (core implementation)
- `brand-identity/research/research-marketing-copywriter-agent.md` (research)
- `brand-identity/foundation/voice-principles.md` (voice rules)
- `brand-identity/voice/terminology.md` (terminology)
