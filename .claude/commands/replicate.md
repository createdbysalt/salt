# /replicate - Pixel-Perfect Component Replication

Reverse-engineer a page or component from a URL into production-ready Next.js + Tailwind code with pixel-perfect accuracy at all responsive breakpoints.

## Usage

```
/replicate [URL]
/replicate [URL] --mode=visual
/replicate [URL] --mode=full
/replicate [URL] --mode=animations-only
/replicate [URL] --section [section-name]
/replicate [URL] --validate-only
```

## Mode Flags

| Mode | Description |
|------|-------------|
| `--mode=visual` | Static visual replication only (no animations) - DEFAULT |
| `--mode=full` | Complete replication: visual + Framer Motion animations |
| `--mode=animations-only` | Extract and add animations to existing components |

## Other Flags

| Flag | Description |
|------|-------------|
| `--pixel-perfect` | Target 95%+ accuracy (default behavior) |
| `--section [name]` | Replicate only a specific section |
| `--validate-only` | Re-run validation on existing components |
| `--skip-extraction` | Use existing extracted-styles.json |
| `--responsive` | Focus on responsive accuracy (validates all 4 viewports) |

## Tech Stack Output

All generated code conforms to Salt-Core's stack:

| Technology | Usage |
|------------|-------|
| Next.js 15 | App Router, Server Components where possible |
| React 19 | Functional components with hooks |
| TypeScript | Full type safety, interfaces for all props |
| Tailwind CSS 4 | Utility-first, CSS variables for custom values |
| shadcn/ui | Base component patterns |
| Framer Motion | Animations (--mode=full only) |
| Geist | Default font family |

## Multi-Agent Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   REPLICATION PIPELINE                          │
│                   (--mode=full shows all phases)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 0: CONTENT EXTRACTION (Firecrawl)                │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • firecrawl_scrape → LLM-ready markdown                │   │
│  │  • Extract: headings, paragraphs, CTAs, navigation      │   │
│  │  • Identify: content structure, sections, hierarchy     │   │
│  │  • Output: content-structure.json                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 1: STYLE EXTRACTION                              │   │
│  │  Agent: style-extractor                                 │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Navigate to URL                                      │   │
│  │  • Extract styles at 1440px, 1024px, 768px, 375px      │   │
│  │  • Generate tailwind-tokens.css                         │   │
│  │  • Catalog all assets                                   │   │
│  │  • Output: extracted-styles.json                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 1.5: ANIMATION EXTRACTION (--mode=full only)     │   │
│  │  Agent: animation-extractor                             │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Tier 1: Query WAAPI (document.getAnimations())       │   │
│  │  • Tier 2: Scroll sampling (computed style recording)   │   │
│  │  • Detect scroll-linked vs viewport-triggered           │   │
│  │  • Analyze easing curves                                │   │
│  │  • Output: animation-spec.json                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 2: COMPONENT GENERATION                          │   │
│  │  Agent: component-replicator                            │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Read extracted-styles.json                           │   │
│  │  • Read animation-spec.json (if --mode=full)            │   │
│  │  • Decompose page structure                             │   │
│  │  • Generate Next.js + Tailwind components               │   │
│  │  • Add Framer Motion (if --mode=full)                   │   │
│  │  • Create TypeScript interfaces                         │   │
│  │  • Output: .tsx files in app/_features/                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 3: VALIDATION                                    │   │
│  │  Agent: visual-validator                                │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Screenshot original at all viewports                 │   │
│  │  • Screenshot prototype at all viewports                │   │
│  │  • Compare and calculate scores                         │   │
│  │  • Generate validation report                           │   │
│  │  • Output: validation-report.json                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PHASE 4: REFINEMENT LOOP (if score < 95%)              │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  OBSERVE → ORIENT → DECIDE → ACT                        │   │
│  │  • Identify top deviations                              │   │
│  │  • Apply targeted Tailwind fixes                        │   │
│  │  • Re-validate                                          │   │
│  │  • Loop until 95%+ or max iterations                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Process

### 0. Content Extraction Phase (Firecrawl)

Before extracting CSS styles, extract the content structure:

```
firecrawl_scrape({
  url: "https://target-site.com",
  formats: ["markdown"],
  onlyMainContent: true
})
```

**What Gets Extracted:**
- Page title and meta description
- Heading hierarchy (H1, H2, H3)
- Paragraph content
- Call-to-action text
- Navigation structure
- Link and image inventory

**Output:** `content-structure.json` with:
- Section headings and hierarchy
- Content per section
- CTA patterns
- Navigation items

**Why Content First:**
1. Understand page structure before visual extraction
2. Know what sections exist to decompose
3. Have real content for component generation
4. Identify messaging patterns

### 1. Extraction Phase

The Style Extractor agent:
- Navigates to the target URL
- Resizes browser to each viewport (1440, 1024, 768, 375)
- Runs extraction scripts via `browser_evaluate`:
  - `extractTypography` - Font families, sizes, weights, line-heights
  - `extractLayout` - Grid/flex configurations, container sizes
  - `extractColors` - Background, text, accent colors
  - `analyzeSpacing` - Padding, margins, gaps
  - `inventoryAssets` - All images with dimensions
- Takes screenshots at each viewport
- Generates `tailwind-tokens.css` and `extracted-styles.json`

### 1.5. Animation Extraction Phase (--mode=full)

The Animation Extractor agent:

#### Tier 1: White-Box (WAAPI)
```javascript
const animations = document.getAnimations();
// Returns keyframes, timing, easing for CSS/WAAPI animations
```

#### Tier 2: Grey-Box (Scroll Sampling)
```javascript
// Records transform, opacity, rect at 60fps during scroll
// Output: time-series data with scroll correlation
```

**Analysis:**
- Scroll-link detection via Pearson correlation
- Easing curve fitting against known functions
- Pattern matching (fade-up, parallax, stagger)

**Output:** `animation-spec.json` with Framer Motion code

### 2. Generation Phase

The Component Replicator agent:
- Reads the extracted styles (NEVER estimates)
- Decomposes the page into sections
- Generates React components using Tailwind utilities
- Creates TypeScript interfaces for all props
- Adds Framer Motion animations (if --mode=full)
- Outputs to `app/_features/[feature]/components/`

### 3. Validation Phase

The Visual Validator agent:
- Screenshots both original and prototype at all viewports
- Compares using multi-dimension scoring:
  - Typography (30% weight)
  - Layout (25% weight)
  - Colors (20% weight)
  - Spacing (15% weight)
  - Visual (10% weight)
- Calculates per-viewport scores with thresholds:
  - Desktop (1440px): ≥ 90%
  - Tablet (1024px, 768px): ≥ 85%
  - Mobile (375px): ≥ 80%
  - Overall weighted: ≥ 85%

### 4. Refinement Phase

If validation fails, the OODA loop engages:
- **Observe**: New screenshots, computed style comparison
- **Orient**: Identify top 3 deviations by impact
- **Decide**: Prioritize fixes, global vs viewport-specific
- **Act**: Apply Tailwind class fixes with comments
- Continues until 95%+ or max 5 iterations

## Output

### Directory Structure

All replication artifacts are organized under `.claude/replicator-output/[project-name]/`:

```
.claude/replicator-output/
└── [project-name]/                    # e.g., "example-landing"
    │
    ├── extraction/                    # Raw extraction data
    │   ├── extracted-styles.json      # Complete style data
    │   ├── tailwind-tokens.css        # CSS variables to add to globals.css
    │   ├── animation-spec.json        # Animation definitions (--mode=full)
    │   └── assets-inventory.json      # Image/asset catalog
    │
    ├── screenshots/                   # Visual references
    │   ├── original-1440.png
    │   ├── original-1024.png
    │   ├── original-768.png
    │   ├── original-375.png
    │   ├── prototype-1440.png
    │   ├── prototype-1024.png
    │   ├── prototype-768.png
    │   └── prototype-375.png
    │
    ├── validation/                    # Quality reports
    │   ├── validation-report.json
    │   └── iteration-history.json     # Refinement loop history
    │
    └── components/                    # Generated code (ready to copy)
        ├── HeroSection.tsx
        ├── HeroSection.types.ts
        ├── ContentSection.tsx
        ├── ContentSection.types.ts
        ├── GridSection.tsx
        ├── CTASection.tsx
        └── index.ts                   # Barrel export
```

### After Replication

1. **Review components** in `.claude/replicator-output/[project]/components/`
2. **Copy to your feature folder**: `cp -r .claude/replicator-output/[project]/components/* app/_features/[feature]/components/`
3. **Add tokens to globals.css**: Copy contents of `extraction/tailwind-tokens.css`
4. **Clean up** (optional): `rm -rf .claude/replicator-output/[project]`

### Gitignore

Add to `.gitignore` to keep replication artifacts out of version control:

```gitignore
# Replicator output (temporary artifacts)
.claude/replicator-output/
```

## Example

```
User: /replicate https://example.com/landing

Agent Output:
════════════════════════════════════════════════════════════════
PIXEL-PERFECT REPLICATION
════════════════════════════════════════════════════════════════

Target: https://example.com/landing

PHASE 1: EXTRACTION
────────────────────────────────────────────────────────────────
[1/8] Detecting breakpoints... found 3 (1199, 991, 767)
[2/8] Discovering elements... 12 headings, 5 sections, 8 images
[3/8] Extracting typography @ 1440px... done
[4/8] Extracting layout @ 1440px... done
[5/8] Extracting colors... 8 unique colors found
[6/8] Extracting spacing... done
[7/8] Cataloging assets... 8 images inventoried
[8/8] Running at other viewports... done

Files created:
  ✅ extracted-styles.json
  ✅ tailwind-tokens.css

PHASE 2: GENERATION
────────────────────────────────────────────────────────────────
Decomposing page structure... 5 sections identified

Generating components:
  ✅ app/_features/landing/components/HeroSection.tsx
  ✅ app/_features/landing/components/FeaturesSection.tsx
  ✅ app/_features/landing/components/TestimonialsSection.tsx
  ✅ app/_features/landing/components/PricingSection.tsx
  ✅ app/_features/landing/components/CTASection.tsx

PHASE 3: VALIDATION
────────────────────────────────────────────────────────────────
Starting dev server... pnpm dev on localhost:3000

Capturing screenshots:
  Original @ 1440px... done
  Prototype @ 1440px... done
  (all viewports captured)

Calculating scores...

VALIDATION RESULTS:
  Desktop (1440px):   █████████░ 94.2%  ✅
  Tablet (1024px):    █████████░ 91.8%  ✅
  Tablet (768px):     █████████░ 89.5%  ✅
  Mobile (375px):     ████████░░ 86.3%  ✅
  ─────────────────────────────────────────
  OVERALL:            █████████░ 91.2%  ✅

PHASE 4: REFINEMENT
────────────────────────────────────────────────────────────────
Score 91.2% - entering refinement loop for 95%+ target

Iteration 1:
  Issues found: 2 major, 3 minor
  Fixes applied:
    - HeroSection.tsx: text-7xl → text-[136px]
    - FeaturesSection.tsx: gap-4 → gap-6
    - Multiple: py-12 → py-20
  Re-validating...

FINAL VALIDATION:
  Desktop (1440px):   █████████░ 96.8%  ✅
  Tablet (1024px):    █████████░ 95.2%  ✅
  Tablet (768px):     █████████░ 94.1%  ✅
  Mobile (375px):     █████████░ 93.6%  ✅
  ─────────────────────────────────────────
  OVERALL:            █████████░ 95.4%  ✅

════════════════════════════════════════════════════════════════
REPLICATION COMPLETE
════════════════════════════════════════════════════════════════

Final Score: 95.4%
Iterations: 2
Files Created: 8

Components:
  • HeroSection.tsx
  • FeaturesSection.tsx
  • TestimonialsSection.tsx
  • PricingSection.tsx
  • CTASection.tsx

NEXT STEPS:
1. Preview: pnpm dev → localhost:3000
2. Import components into your page
3. Connect to real data

════════════════════════════════════════════════════════════════
```

## Responsive Validation

| Viewport | Width | Threshold | Weight |
|----------|-------|-----------|--------|
| Desktop | 1440px | 90% | 30% |
| Tablet Landscape | 1024px | 85% | 20% |
| Tablet Portrait | 768px | 85% | 20% |
| Mobile | 375px | 80% | 30% |

## Scoring Dimensions

| Dimension | Weight | What's Compared |
|-----------|--------|-----------------|
| Typography | 30% | Font family, sizes, weights, line-heights, letter-spacing |
| Layout | 25% | Grid/flex structure, columns, container sizes |
| Colors | 20% | Background, text, accent, border colors |
| Spacing | 15% | Padding, margins, gaps between elements |
| Visual | 10% | Border radius, shadows, borders, images |

## Key Features

### Extraction-First
No values are estimated. Every Tailwind class comes from `getComputedStyle()` extraction.

### Responsive-Aware
Extracts and validates at 4 viewports, generating proper responsive Tailwind classes.

### Tailwind Native
Uses utility classes with CSS variables for custom values. No inline styles.

### TypeScript Ready
All components include proper TypeScript interfaces.

### Framer Motion Animations
With --mode=full, generates proper Framer Motion code for all detected animations.

## Related Commands

| Command | Purpose |
|---------|---------|
| `/refine` | Run additional refinement iterations |
| `/validate-only` | Re-validate existing components |

## Tips

1. **Provide full page URL** - The agent will identify sections automatically
2. **Use `--section`** for single components if full page is too complex
3. **Check validation report** at `.playwright-mcp/validation-report.json`
4. **Review screenshots** to understand deviations
5. **Add to globals.css** - Copy contents of tailwind-tokens.css

## Allowed Tools

- Read, Write, Glob, Grep (file operations)
- WebFetch (URL analysis)
- Firecrawl (content extraction: firecrawl_scrape, firecrawl_map)
- Browser automation (navigate, snapshot, screenshot, evaluate, resize)
