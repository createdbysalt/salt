# Pixel-Perfect Extraction Skill

## Overview

This skill provides extraction utilities, viewport configurations, scoring algorithms, and templates for achieving pixel-perfect component replication targeting **Next.js + Tailwind CSS**.

## When to Use

- During `/replicate` workflow
- When Style Extractor agent needs extraction scripts
- When Visual Validator agent needs scoring algorithms
- When generating Tailwind tokens from extracted values

## Tech Stack Target

All outputs are designed for Salt-Core:

| Technology | Version |
|------------|---------|
| Next.js | 15.1.9 |
| Tailwind CSS | 4.1.10 |
| Framer Motion | 12.23.26 |
| shadcn/ui | 3.6.2 |

---

## Quick Reference

### Standard Viewports

| Name | Width | Height | Breakpoint | Weight |
|------|-------|--------|------------|--------|
| Desktop Large | 1440px | 900px | > 1024px | 30% |
| Tablet Landscape | 1024px | 768px | 768-1024px | 20% |
| Tablet Portrait | 768px | 1024px | 640-768px | 20% |
| Mobile | 375px | 812px | < 640px | 30% |

### Tailwind Breakpoint Mapping

| Extracted Breakpoint | Tailwind Prefix |
|----------------------|-----------------|
| > 1280px | `2xl:` |
| > 1024px | `xl:` or `lg:` |
| > 768px | `md:` |
| > 640px | `sm:` |
| Default | (mobile-first base) |

### Scoring Thresholds

| Level | Score Range | Status |
|-------|-------------|--------|
| Excellent | 95-100% | Pass |
| Good | 85-94% | Pass |
| Acceptable | 70-84% | Needs Work |
| Poor | < 70% | Major Rework |

### Issue Severity

| Severity | Deduction | Example |
|----------|-----------|---------|
| Critical | 20 pts | Wrong font family, layout structure |
| Major | 10 pts | 15-30% size deviation, wrong colors |
| Minor | 3 pts | 5-15% deviation, slight color diff |

---

## Extraction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BREAKPOINT DETECTION                                    │
│     └─ Scan stylesheets for @media rules                   │
│     └─ Map to Tailwind breakpoints                         │
│                                                             │
│  2. ELEMENT DISCOVERY                                       │
│     └─ Find all semantic elements                          │
│     └─ Catalog by type (headings, sections, grids, etc)   │
│                                                             │
│  3. PER-VIEWPORT EXTRACTION                                 │
│     ┌─────────────────────────────────────────────────┐    │
│     │ FOR EACH viewport IN [1440, 1024, 768, 375]:    │    │
│     │   • Resize browser                              │    │
│     │   • Extract typography                          │    │
│     │   • Extract layout                              │    │
│     │   • Extract colors                              │    │
│     │   • Extract spacing                             │    │
│     │   • Take screenshot                             │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│  4. TAILWIND MAPPING                                        │
│     └─ Map extracted px values to Tailwind classes         │
│     └─ Generate CSS variables for custom values            │
│     └─ Create responsive utility patterns                  │
│                                                             │
│  5. OUTPUT GENERATION                                       │
│     └─ extracted-styles.json                               │
│     └─ tailwind-tokens.css                                 │
│     └─ assets-inventory.json                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Flow (OODA)

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION FLOW (OODA)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    OBSERVE                            │  │
│  │  • Screenshot original at all viewports              │  │
│  │  • Screenshot prototype at all viewports             │  │
│  │  • Extract computed styles from both                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    ORIENT                             │  │
│  │  • Compare typography values                         │  │
│  │  • Compare layout structures                         │  │
│  │  • Compare colors (distance calculation)             │  │
│  │  • Categorize deviations by severity                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    DECIDE                             │  │
│  │  • Calculate per-dimension scores                    │  │
│  │  • Calculate weighted overall score                  │  │
│  │  • Prioritize Tailwind class fixes                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                     ACT                               │  │
│  │  IF score < threshold:                               │  │
│  │    • Generate specific fix recommendations           │  │
│  │    • Apply Tailwind class changes                    │  │
│  │    • Loop back to OBSERVE                            │  │
│  │  ELSE:                                               │  │
│  │    • Mark validation as PASSED                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  EXIT CONDITIONS:                                           │
│  • Overall score >= 95%                                     │
│  • All viewport scores >= minimum threshold                 │
│  • No critical issues remaining                             │
│  • Max 5 iterations                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tailwind Value Mapping

### Font Sizes

| Extracted | Tailwind Class | Notes |
|-----------|----------------|-------|
| 12px | `text-xs` | |
| 14px | `text-sm` | |
| 16px | `text-base` | |
| 18px | `text-lg` | |
| 20px | `text-xl` | |
| 24px | `text-2xl` | |
| 30px | `text-3xl` | |
| 36px | `text-4xl` | |
| 48px | `text-5xl` | |
| 60px | `text-6xl` | |
| 72px | `text-7xl` | |
| 96px | `text-8xl` | |
| 128px | `text-9xl` | |
| Other | `text-[Xpx]` | Arbitrary value |

### Font Weights

| Extracted | Tailwind Class |
|-----------|----------------|
| 100 | `font-thin` |
| 200 | `font-extralight` |
| 300 | `font-light` |
| 400 | `font-normal` |
| 500 | `font-medium` |
| 600 | `font-semibold` |
| 700 | `font-bold` |
| 800 | `font-extrabold` |
| 900 | `font-black` |

### Spacing (padding, margin, gap)

| Extracted | Tailwind Value | Class Example |
|-----------|----------------|---------------|
| 4px | `1` | `p-1`, `gap-1` |
| 8px | `2` | `p-2`, `gap-2` |
| 12px | `3` | `p-3`, `gap-3` |
| 16px | `4` | `p-4`, `gap-4` |
| 20px | `5` | `p-5`, `gap-5` |
| 24px | `6` | `p-6`, `gap-6` |
| 32px | `8` | `p-8`, `gap-8` |
| 40px | `10` | `p-10`, `gap-10` |
| 48px | `12` | `p-12`, `gap-12` |
| 64px | `16` | `p-16`, `gap-16` |
| 80px | `20` | `p-20`, `gap-20` |
| 96px | `24` | `p-24`, `gap-24` |
| Other | `[Xpx]` | `p-[50px]` |

### Max Widths

| Extracted | Tailwind Class |
|-----------|----------------|
| 320px | `max-w-xs` |
| 384px | `max-w-sm` |
| 448px | `max-w-md` |
| 512px | `max-w-lg` |
| 576px | `max-w-xl` |
| 672px | `max-w-2xl` |
| 768px | `max-w-3xl` |
| 896px | `max-w-4xl` |
| 1024px | `max-w-5xl` |
| 1152px | `max-w-6xl` |
| 1280px | `max-w-7xl` |
| Other | `max-w-[Xpx]` |

---

## Color Handling

### shadcn/ui Semantic Colors

When possible, map extracted colors to semantic variables:

```tsx
// Prefer semantic colors
className="bg-background text-foreground"
className="bg-muted text-muted-foreground"
className="bg-primary text-primary-foreground"
className="bg-secondary text-secondary-foreground"
className="bg-accent text-accent-foreground"
className="bg-destructive text-destructive-foreground"
```

### Custom Colors

For colors that don't match semantics:

```tsx
// Use arbitrary values
className="bg-[rgb(36,31,32)]"
className="text-[#F69788]"

// Or define CSS variables
// In globals.css:
:root {
  --color-brand: rgb(36, 31, 32);
}

// Then use:
className="bg-[var(--color-brand)]"
```

---

## Key Principles

### 1. Extract, Don't Estimate

```
❌ "The heading looks like 48px"
✅ "getComputedStyle().fontSize returns '136px'"
```

### 2. Validate at All Viewports

```
❌ Check only desktop
✅ Check 1440px, 1024px, 768px, 375px
```

### 3. Score Honestly

```
❌ "About 90% match"
✅ "82.3% match (2 critical, 4 major issues)"
```

### 4. Use Tailwind Properly

```
❌ style={{ fontSize: '48px' }}
✅ className="text-5xl" or className="text-[48px]"
```

### 5. Mobile-First Responsive

```tsx
// Mobile-first pattern
className={cn(
  "text-2xl",        // Mobile (base)
  "md:text-4xl",     // Tablet
  "lg:text-6xl",     // Desktop
)}
```

---

## Example Component Output

```tsx
/**
 * COMPONENT: HeroSection
 * REPLICATED FROM: https://example.com
 * VALIDATION SCORE: 96.2%
 */

import { cn } from "@/lib/utils";

interface HeroSectionProps {
  headline: string;
  subheadline?: string;
  className?: string;
}

export function HeroSection({
  headline,
  subheadline,
  className
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        // Section padding - EXTRACTED
        "py-12 md:py-16 lg:py-20",
        // Background
        "bg-background",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h1
          className={cn(
            // Typography - EXTRACTED: 48px → 80px → 136px
            "text-5xl font-semibold leading-[0.9] tracking-tight",
            "md:text-7xl",
            "lg:text-[136px]",
            // Color
            "text-foreground"
          )}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className={cn(
              // EXTRACTED: 16px, weight 300, line-height 1.625
              "mt-6 text-base font-light leading-relaxed",
              "text-muted-foreground",
              "max-w-2xl"
            )}
          >
            {subheadline}
          </p>
        )}
      </div>
    </section>
  );
}
```
