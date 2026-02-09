# /page - Salt Core Page Builder

Build production-ready marketing pages for Salt Core using the full research-to-deploy pipeline.

## Usage

```
/page <page-type> [options]
/page status
```

### Page Types

| Type | Description |
|------|-------------|
| `homepage` | Main landing page (saltcore.io) |
| `pricing` | Pricing tiers and comparison |
| `features` | Feature overview or deep-dive |
| `about` | Origin story, team, values |
| `landing/<name>` | Campaign-specific landing pages |

### Options

| Flag | Description |
|------|-------------|
| `--with-voc` | Include Apify VOC research (recommended for pain-point pages) |
| `--skip <phase>` | Skip a phase (scout, voc, optimize) |
| `--resume` | Resume from last checkpoint |
| `--phase <name>` | Jump to specific phase (expert mode) |

## Examples

```bash
# Build homepage with VOC research
/page homepage --with-voc

# Build pricing page (VOC usually skipped)
/page pricing

# Update features with new copy
/page features --skip scout

# Create campaign landing page
/page landing/ai-studio-launch --with-voc

# Check current build status
/page status
```

## Pipeline Overview

```
Brief → Scout → (VOC) → Copy → Build → Optimize → Review
```

Each phase has a quality gate. No phase can be skipped without explicit approval.

## What Gets Built

### Files Created

| Phase | Output |
|-------|--------|
| Scout | Pattern analysis in plan notes |
| VOC | `brand-identity/research/voc/[page].json` |
| Copy | Page brief in plan notes |
| Build | `app/(public)/[page]/page.tsx` + section components |
| Optimize | Meta tags, structured data in page file |
| Review | Audit report in plan notes |

### Components Created

New section components go to:
```
app/_features/marketing/components/sections/[SectionName].tsx
```

## Agent Orchestration

This command invokes the `page-director` agent, which coordinates:

| Phase | Agent | Command |
|-------|-------|---------|
| 1 | ux-pattern-scout | `/scout` |
| 1.5 | apify-researcher | (direct) |
| 2 | marketing-copywriter | `/copy` |
| 3 | marketing-page-builder | `/build-page` |
| 4 | search-optimizer | `/optimize` |
| 5 | conversion-reviewer | `/review` |
| 5 | ux-analyst | `/ux-review` |

## Pre-Revenue Constraints

Since Salt Core is pre-revenue:
- No fake testimonials
- No made-up user counts
- Use origin proof: "Built by a studio, for studios"
- Use tech proof: Next.js 15, Supabase, Stripe
- Waitlist CTA, not purchase CTA

## Quality Gates

| Phase | Gate |
|-------|------|
| Brief | Clear objective + conversion goal |
| Scout | 3+ patterns analyzed |
| VOC | Authentic quotes captured |
| Copy | Voice Guardian pass (0 Kill List violations) |
| Build | `pnpm build && pnpm lint` pass |
| Optimize | Lighthouse ≥90 |
| Review | 0 critical issues |

## Related Commands

| Command | When to Use |
|---------|-------------|
| `/scout` | Research patterns only (no build) |
| `/copy` | Generate copy only (no build) |
| `/build-page` | Build from existing brief |
| `/optimize` | SEO optimize existing page |
| `/review` | Conversion audit existing page |
