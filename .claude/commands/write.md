---
name: write
description: "Generate MDX blog posts and changelog entries for Salt Core. Enforces voice guidelines, SEO structure, and AI citation patterns."
---

# /write - MDX Content Generation

Generate SEO-optimized, brand-aligned blog posts and changelog entries in MDX format.

## Purpose

Create content for Salt Core's blog and changelog that (1) passes human voice checks, (2) is structured for SEO and AI citation, (3) uses MDX components correctly, and (4) maintains brand consistency. This command orchestrates the `mdx-content-writer` agent.

## When to Use

- Writing new blog posts (tutorials, frameworks, comparisons)
- Creating changelog entries for product updates
- Drafting behind-the-build posts
- Generating thought leadership content
- Any long-form content for saltcore.io

## Usage

```bash
# Generate a blog post
/write blog "How to run a competitive audit for your next proposal"
/write blog "Pricing strategies for studios" --type tutorial
/write blog "Salt Core vs building your own stack" --type comparison

# Generate from outline
/write blog "Strategic intelligence guide" --outline "Why it matters, The framework, Tools needed, Real example"

# Generate a changelog entry
/write changelog
/write changelog --version 0.4.0

# Generate with specific keywords
/write blog "Client portals" --keyword "client portal software" --secondary "freelancer tools,agency portal"

# Check existing content
/write check content/posts/existing-post.mdx

# Preview mode (dry run)
/write blog "Topic" --preview
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `type` | Content type: `blog`, `changelog`, `check` | `blog` |
| `topic` | Topic or title for the content | - |
| `--type` | Post type: `tutorial`, `framework`, `comparison`, `behind-the-build`, `thought-leadership` | `tutorial` |
| `--outline` | Comma-separated section outline | Auto-generated |
| `--keyword` | Primary SEO keyword | Derived from topic |
| `--secondary` | Secondary keywords (comma-separated) | - |
| `--version` | Version number for changelog | Latest |
| `--preview` | Show plan without writing files | `false` |
| `--author` | Author slug | `gabriella` |

## Content Types

### blog

Generate a full blog post with frontmatter, sections, FAQ, and CTA.

```bash
/write blog "How to price web design projects"

Output:
┌─────────────────────────────────────────────────────────────┐
│ BLOG POST GENERATED                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ File: content/posts/how-to-price-web-design-projects.mdx     │
│                                                              │
│ STRUCTURE                                                    │
│ ─────────────────────────                                    │
│ H1: How to Price Web Design Projects                         │
│   H2: Why Most Studios Underprice                            │
│   H2: The Value-Based Pricing Framework                      │
│   H2: How to Present Your Pricing                            │
│   H2: Common Objections and Responses                        │
│   H2: FAQ                                                    │
│                                                              │
│ QUALITY GATES                                                │
│ ─────────────────────────                                    │
│ ✅ Voice Check: 0 violations                                  │
│ ✅ Structure Check: All passed                                │
│ ✅ SEO Check: Keyword in title, H1, meta, first 100 words     │
│ ✅ Brand Check: All passed                                    │
│                                                              │
│ METRICS                                                      │
│ ─────────────────────────                                    │
│ Word count: 1,842                                            │
│ Reading time: 8 min                                          │
│ Internal links: 3                                            │
│ FAQ items: 4                                                 │
│                                                              │
│ ⚠️ DRAFT: true (requires human review before publishing)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### changelog

Generate a changelog entry for recent product updates.

```bash
/write changelog --version 0.4.0

Output:
┌─────────────────────────────────────────────────────────────┐
│ CHANGELOG ENTRY GENERATED                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ File: content/changelog/2026-02-06-v0-4-0.mdx                │
│                                                              │
│ FEATURES DOCUMENTED                                          │
│ ─────────────────────────                                    │
│ • Intelligence Stream (new)                                  │
│ • Mode switching performance (improved)                      │
│ • 4 bug fixes                                                │
│                                                              │
│ QUALITY GATES                                                │
│ ─────────────────────────                                    │
│ ✅ Voice Check: 0 violations                                  │
│ ✅ Structure Check: All passed                                │
│ ✅ Brand Check: All passed                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### check

Run quality gates on existing MDX content.

```bash
/write check content/posts/existing-post.mdx

Output:
┌─────────────────────────────────────────────────────────────┐
│ CONTENT CHECK: existing-post.mdx                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ VOICE CHECK                                                  │
│ ─────────────────────────                                    │
│ ❌ Found 2 violations:                                        │
│   Line 45: "leverage" → use "use" instead                    │
│   Line 89: "seamless" → use "smooth" instead                 │
│                                                              │
│ STRUCTURE CHECK                                              │
│ ─────────────────────────                                    │
│ ⚠️ Missing FAQ section                                        │
│ ⚠️ Only 1 internal link (minimum 2)                          │
│                                                              │
│ SEO CHECK                                                    │
│ ─────────────────────────                                    │
│ ✅ All checks passed                                          │
│                                                              │
│ BRAND CHECK                                                  │
│ ─────────────────────────                                    │
│ ✅ All checks passed                                          │
│                                                              │
│ SUGGESTED FIXES                                              │
│ ─────────────────────────                                    │
│ 1. Replace "leverage" with "use" on line 45                  │
│ 2. Replace "seamless" with "smooth" on line 89               │
│ 3. Add FAQ section with 3-5 questions                        │
│ 4. Add 1 more internal link to related content               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Post Types

| Type | Description | Target Length |
|------|-------------|---------------|
| `tutorial` | Step-by-step how-to guide | 1500-2500 words |
| `framework` | Methodology or mental model | 1200-2000 words |
| `comparison` | Product or approach comparison | 1500-2000 words |
| `behind-the-build` | Engineering/design decisions | 1000-1800 words |
| `thought-leadership` | Opinion or industry perspective | 800-1500 words |

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    /write blog [topic]                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: RESEARCH                                           │
│  ─────────────────────────                                   │
│  • Load brand voice files                                    │
│  • Analyze topic for keywords                                │
│  • Check existing content for linking                        │
│  • Identify audience segment                                 │
│                                                              │
│  PHASE 2: OUTLINE                                            │
│  ─────────────────────────                                   │
│  • Generate heading hierarchy                                │
│  • Plan MDX component placement                              │
│  • Identify FAQ questions                                    │
│  • Map internal links                                        │
│                                                              │
│  PHASE 3: DRAFT                                              │
│  ─────────────────────────                                   │
│  • Write hook with pain point                                │
│  • Fill sections with direct-answer paragraphs               │
│  • Add examples, code, screenshots                           │
│  • Write FAQ and CTA                                         │
│                                                              │
│  PHASE 4: SELF-EDIT                                          │
│  ─────────────────────────                                   │
│  • Voice Check (Kill List scan)                              │
│  • Structure Check (heading hierarchy)                       │
│  • SEO Check (keyword placement)                             │
│  • Brand Check (terminology)                                 │
│                                                              │
│  PHASE 5: OUTPUT                                             │
│  ─────────────────────────                                   │
│  • Save MDX file with draft: true                            │
│  • Flag sections for human review                            │
│  • Report quality gate results                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## MDX Components Available

The agent can use these MDX components:

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Callout>` | Tips, notes, warnings | `<Callout type="tip">Pro tip here</Callout>` |
| `<Screenshot>` | Product screenshots | `<Screenshot src="..." alt="..." caption="..." />` |
| `<CodeBlock>` | Code with highlighting | `<CodeBlock language="tsx" filename="page.tsx">` |
| `<FAQ>` | FAQ section | `<FAQ items={[{q: "...", a: "..."}]} />` |
| `<CTA>` | Call to action | `<CTA href="/signup" text="Try free" />` |
| `<ComparisonTable>` | Before/after tables | `<ComparisonTable before={[...]} after={[...]} />` |

## Quality Gates

Every output runs through these checks:

### Voice Check
- Scans for AI Detection Kill List words (leverage, utilize, delve, etc.)
- Scans for banned phrases ("We're excited to announce...", etc.)
- Checks em dash usage (max 1 per paragraph)
- Checks exclamation points (max 1 per document)

### Structure Check
- Validates frontmatter completeness
- Ensures heading hierarchy (no skipped levels)
- Verifies internal links present (min 2)
- Confirms FAQ section exists (blog posts)

### SEO Check
- Primary keyword in title, H1, meta, first 100 words, slug
- Meta description 140-160 characters
- Meta title 50-60 characters
- Image alt text present

### Brand Check
- "Salt Core" properly capitalized
- "The Bridge" terminology correct
- No gatekeeping language
- Transformation language present

## Output Locations

```
content/
├── posts/                    # Blog posts
│   └── [slug].mdx
└── changelog/                # Changelog entries
    └── [date]-[slug].mdx

public/
├── blog/[slug]/              # Blog images
│   ├── hero.png
│   └── og.png
└── changelog/[slug]/         # Changelog images
    └── hero.png
```

## Integration with Other Commands

| Command | Integration |
|---------|-------------|
| `/optimize` | Get keyword recommendations before writing |
| `/copy` | Shares voice guidelines for consistency |
| `/build-page` | Blog/changelog pages use shared layouts |
| `/brand-check` | Validates against brand docs |

## Troubleshooting

### "Voice Check failed"
Check the output for specific violations. Replace flagged words with suggested alternatives.

### "Structure Check: Missing FAQ"
Add an FAQ section with 3-5 questions that mirror actual search queries.

### "SEO Check: Keyword not in first 100 words"
Rewrite the introduction to naturally include the primary keyword earlier.

### "Brand Check: Incorrect terminology"
Check `brand-identity/voice/terminology.md` for correct product names and phrasing.

## The 60/40 Rule

**Important:** AI gets the draft to 60%. The final 40% (voice, nuance, originality) is where brand magic lives.

All content is generated with `draft: true`. Human review is required before publishing.

Sections that need particular human attention are flagged in the output.

## See Also

- `mdx-content-writer` agent (core implementation)
- `brand-identity/research/general/2026-02-06-mdx-content-writer-agent.md` (research)
- `brand-identity/foundation/voice-principles.md` (voice rules)
- `brand-identity/voice/terminology.md` (terminology)
