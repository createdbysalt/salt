# /brief - Design Brief Command

## Purpose
Analyze visual inspiration and create actionable design specifications. This command orchestrates the design-translator agent and design-brief-creation skill to produce design briefs, visual systems, and component specs.

## When to Use
- After receiving client inspiration, moodboards, or reference sites
- When preparing for design or wireframing
- When translating brand strategy to visual language
- When defining typography, color, and spacing systems
- When specifying components for development

## Usage

```
/brief [context or instructions]
```

**Examples:**
```
/brief Analyze these reference sites and create design direction for GreenLeaf Organics
/brief Build a visual system based on client moodboard
/brief Define the typography and color system for the new marketing site
/brief Create component specs based on our sitemap
```

## Prerequisites

### Required
- [ ] Client DNA (from `/discover`) — Brand identity and positioning
- [ ] Inspiration/References — At least 2-3 reference sites or moodboard images

### Highly Recommended
- [ ] Brand Voice Profile (from `/discover`) — Voice translates to visual tone
- [ ] Strategic Sitemap (from `/strategy`) — Understanding of needed pages
- [ ] ICP Profiles (from `/icp`) — Who are we designing for?

### Nice to Have
- [ ] Existing brand guidelines (logos, colors, fonts)
- [ ] Client explicit likes/dislikes
- [ ] Competitor visual analysis

**If no inspiration provided:** Ask client for 3-5 reference sites they admire. Without references, design direction is guesswork.

---

## Workflow

### Step 1: Context Loading

Load available inputs:
- Client DNA → Brand personality, positioning, industry
- Brand Voice → Voice dimensions translate to visual choices
- ICP Profiles → Audience preferences and expectations
- Sitemap → Understanding of pages and components needed

### Step 2: Inspiration Analysis

For each reference provided:
1. **Load and analyze** using the systematic layer approach
2. **Extract patterns** for typography, color, layout, imagery, details
3. **Document what client said** about why they like it
4. **Identify elements** to adopt, adapt, and avoid

Using the `design-brief-creation` skill frameworks.

### Step 3: Pattern Synthesis

Cross-reference all analyzed inspiration:
1. **Consistent patterns** (appear in most references) → Core direction
2. **Variable patterns** (differ across references) → Need decision
3. **Contradictions** → Flag for client input
4. **Client explicit preferences** → Override analysis where stated

### Step 4: Strategic Translation

Connect brand strategy to visual decisions:
1. **Brand positioning** → Visual expression (premium, approachable, etc.)
2. **Voice dimensions** → Typography, color temperature, energy
3. **ICP preferences** → Accessibility needs, aesthetic expectations
4. **Conversion goals** → CTA treatment, hierarchy

### Step 5: Define Visual System

Create comprehensive specifications:

**Typography System:**
- Typeface selection with rationale
- Full type scale (Display through Caption)
- Line heights, letter spacing, weights
- Mobile adjustments
- Usage rules

**Color System:**
- Core palette (primary, secondary, accent)
- Neutral palette (backgrounds, text levels)
- Semantic colors (success, error, warning, info)
- Accessibility verification (all AA+)
- Usage rules

**Spacing System:**
- Base unit and scale
- Component spacing
- Section spacing
- Grid specification

**Visual Elements:**
- Border radius
- Shadows
- Borders
- Icons
- Imagery direction
- Motion guidelines

### Step 6: Component Inventory

Based on sitemap and page briefs:
1. **Identify all needed components**
2. **Prioritize** (critical, important, nice-to-have)
3. **Create specifications** for priority components
4. **Document states** (default, hover, focus, error, etc.)

### Step 7: Page-Level Direction

For key pages, provide specific guidance:
- Hero treatment
- Section flow
- Key design moments
- Reference inspiration match

### Step 8: Generate Outputs

Create files in outputs directory:

```
/mnt/user-data/outputs/
├── {client}_design_brief.json
├── {client}_visual_system.json
└── {client}_component_specs.json
```

### Step 9: Present Summary

Provide actionable summary:
- Design direction in 3 words + explanation
- Key visual system choices
- Open questions for client
- Recommended next steps

---

## Output Quality Standards

### Design Brief Must Include:
- [ ] Executive summary of direction
- [ ] Analysis of each reference
- [ ] Pattern synthesis
- [ ] Brand-to-visual translation
- [ ] Design principles (3-5)
- [ ] Mood keywords

### Visual System Must Include:
- [ ] Typography: Typefaces, full scale, rules
- [ ] Color: Full palette with accessibility checks
- [ ] Spacing: Scale, component, section, grid
- [ ] Visual elements: Radius, shadow, icons, imagery

### Component Specs Must Include:
- [ ] Inventory by category
- [ ] Priority levels
- [ ] Visual specifications
- [ ] Content slots
- [ ] Interactive states
- [ ] Accessibility notes

---

## Handling Common Scenarios

### Scenario: No Inspiration Provided
```
PAUSE. Ask client for references first.
"To create a design brief, I need visual inspiration to analyze. Please share 3-5 websites or images that represent the look and feel you're going for. They don't have to be in your industry—we're looking at aesthetic direction."
```

### Scenario: Conflicting References
```
Document the conflict clearly.
Present: "Reference A has [X], Reference B has [Y]. Which direction resonates more?"
Or: Make a reasoned recommendation with rationale.
```

### Scenario: Existing Brand Guidelines
```
1. Treat guidelines as constraints (non-negotiable)
2. Analyze inspiration within those constraints
3. Extend guidelines where gaps exist
4. Note any conflicts with new direction
```

### Scenario: No Sitemap Yet
```
Can still create visual system (typography, color, spacing).
Component specs should wait for sitemap.
Note: "Component inventory pending site architecture."
```

### Scenario: Client Wants to Match Competitor
```
1. Analyze competitor objectively
2. Extract patterns, not identity
3. Recommend differentiation where possible
4. Document risk of looking derivative
```

---

## Anti-Hallucination Rules

### Every Spec Has Rationale
```
✗ WRONG: "Primary color: #2563eb"
✓ RIGHT: "Primary color: #2563eb (blue)
   - Matches trust/professionalism from brand positioning
   - Extracted from Reference B which client praised
   - Verified AA accessible on white (4.6:1 contrast)"
```

### Cite Sources
```
✗ WRONG: "Use generous whitespace"
✓ RIGHT: "Use generous whitespace (xl spacing between sections)
   - Consistent across all 3 references
   - Supports premium positioning from Client DNA
   - Source: Pattern synthesis"
```

### Flag Assumptions
```
When making choices without client input:
"[RECOMMENDATION] Use Inter for body text because...
[ALTERNATIVE] Could also use Open Sans if client prefers more warmth
[NEEDS CLIENT INPUT] Awaiting preference on serif vs sans for headlines"
```

---

## Integration

### Consumes
- Client DNA (from `/discover`)
- Brand Voice Profile (from `/discover`)
- Strategic Sitemap (from `/strategy`)
- Page Briefs (from `/strategy`)
- ICP Profiles (from `/icp`)
- Client-provided inspiration

### Produces Outputs For
- Design team (visual system for mockups)
- Development team (design tokens)
- `/wireframe` command (component specs)
- `conversion-reviewer` (validates design supports conversion)
- Client (approval of direction)

---

## Example Interaction

**User:** `/brief Analyze these reference sites for GreenLeaf Organics: aesop.com, glossier.com, tataharperskincare.com`

**Agent Response:**

```
## Design Brief: GreenLeaf Organics

### References Analyzed

**1. Aesop (aesop.com)**
Client said: "Love the sophisticated minimalism"

| Layer | Analysis |
|-------|----------|
| Typography | Serif headlines (sophisticated), sans body |
| Color | Muted earth tones, dark backgrounds |
| Layout | Generous whitespace, asymmetric grids |
| Imagery | Architectural, moody, editorial |
| Feeling | Intellectual, premium, museum-like |

Adopt: Whitespace generosity, quality feel
Avoid: Cold intellectual tone (doesn't match brand warmth: 7/10)

**2. Glossier (glossier.com)**
Client said: "Like the friendly, approachable feel"

| Layer | Analysis |
|-------|----------|
| Typography | All sans-serif, friendly geometric |
| Color | Soft pink, white, light tones |
| Layout | Clean, structured, product-focused |
| Imagery | Natural light, lifestyle, inclusive |
| Feeling | Fresh, approachable, youthful |

Adopt: Approachable typography, natural imagery
Avoid: Pink palette (not brand-aligned)

**3. Tata Harper (tataharperskincare.com)**
Client said: "Appreciate the nature connection"

| Layer | Analysis |
|-------|----------|
| Typography | Elegant serif + clean sans |
| Color | Green, cream, nature-inspired |
| Layout | Premium, editorial sections |
| Imagery | Ingredients, nature, luxury |
| Feeling | Premium natural, transparent |

Adopt: Nature-inspired color, ingredient visibility
Consider: Serif accents for headlines

---

### Pattern Synthesis

**Consistent (High Confidence):**
- Generous whitespace (all three)
- High-quality photography
- Clean, uncluttered layouts
- Nature/wellness connection

**Variable (Needs Decision):**
- Typography: Serif (Aesop, Tata) vs Sans-only (Glossier)
  → **Recommendation:** Sans primary with optional serif accents (balances friendly + premium)
- Color temperature: Cool (Aesop) vs Warm (Glossier, Tata)
  → **Recommendation:** Warm (matches brand warmth 7/10)

---

### Design Direction

**In Three Words:** Fresh, Trustworthy, Approachable

**The Feel:**
A bright, airy farmer's market on Saturday morning. Clean but not sterile. Natural but not rustic. Premium but not pretentious.

**Strategic Rationale:**
- ICP needs trust (addressing "is this actually clean?" objection)
- Brand voice is warm (7/10) and enthusiastic (6/10)
- Premium positioning but accessible price point

---

### Visual System (Summary)

**Typography**
- Primary: Plus Jakarta Sans
  - Why: Friendly geometric, supports approachability
- Headlines: 600 weight, generous tracking
- Body: 16px/1.6, comfortable reading

**Color**
- Primary: #2D6A4F (Forest green — nature, trust)
- Accent: #F4A261 (Warm amber — energy, approachability)
- Background: #FDFBF7 (Warm white — natural, not clinical)
- ✓ All combinations AA verified

**Spacing**
- Base: 8px
- Generous sections (64-96px)
- Grid: 12-column, 1280px max-width

---

### Open Questions

1. **Serif accents for headlines?** More sophisticated but less consistent
2. **Photography with people?** Current assets are product-only
3. **Botanical illustrations?** Could reinforce natural positioning

---

### Files Generated
- `greenleaf_design_brief.json`
- `greenleaf_visual_system.json`
- `greenleaf_component_specs.json`

Ready for wireframing or design?
```