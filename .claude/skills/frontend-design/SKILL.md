---
name: frontend-design
description: Build production-grade UI for Salt Core using shadcn components. Use this skill when the user asks to build components, pages, or features. Generates working code using shadcn patterns with zero custom styling.
---

This skill guides creation of production-grade UI for Salt Core. All UI uses shadcn components exactly as documented. No custom styling. No debates.

The user provides frontend requirements: a component, page, or feature to build. They may specify whether it's for the **User Dashboard** (Studio/Strategy/Serve) or **Client Portal** (Bridge).

## Philosophy: Just Use shadcn

**Zero custom components.** Everything comes from shadcn.

Before coding:
1. Check if shadcn has the component: `npx shadcn@latest add [component]`
2. Check shadcn blocks for patterns: `npx shadcn@latest add dashboard-01`
3. Use it exactly as documented at ui.shadcn.com
4. Done. No customization.

**NEVER:**
- Create custom component wrappers
- Add custom variants or sizes
- Debate border-radius, easing, or colors
- Use inline styles or custom Tailwind values
- Reference "Linear Standard" or custom design tokens

## Two Surfaces: Dashboard vs Portal

### User Dashboard (Studio, Strategy, Serve)
- **Density:** High information density
- **Components:** Full shadcn component library
- **Layout:** Use `dashboard-01` block patterns (SidebarProvider, SidebarInset, etc.)
- **Data:** DataTable with sorting, filtering, pagination
- **Cards:** Card + CardHeader + CardTitle + CardAction + Badge pattern

### Client Portal (Bridge)
- **Density:** More spacious, approachable
- **Components:** Subset of shadcn (simpler)
- **Layout:** Clean, white-label friendly
- **Theme:** Light mode only
- **Interactions:** Softer, less dense

## Reference Patterns

### Stat Cards (from dashboard-01 section-cards.tsx)
```tsx
<Card>
  <CardHeader>
    <CardDescription>Total Revenue</CardDescription>
    <CardTitle className="text-2xl font-semibold tabular-nums">
      $1,250.00
    </CardTitle>
    <CardAction>
      <Badge variant="outline">
        <TrendingUp className="size-3" />
        +12.5%
      </Badge>
    </CardAction>
  </CardHeader>
  <CardFooter className="flex-col items-start gap-1.5 text-sm">
    <div className="flex gap-2 font-medium">
      Trending up this month <TrendingUp className="size-4" />
    </div>
    <div className="text-muted-foreground">
      Visitors for the last 6 months
    </div>
  </CardFooter>
</Card>
```

### Mode Switcher (ToggleGroup)
```tsx
<ToggleGroup type="single" value={activeMode} onValueChange={setMode}>
  <ToggleGroupItem value="studio">
    <Briefcase className="size-4" />
    Studio
  </ToggleGroupItem>
  <ToggleGroupItem value="strategy">
    <Target className="size-4" />
    Strategy
  </ToggleGroupItem>
  <ToggleGroupItem value="serve">
    <Rocket className="size-4" />
    Serve
  </ToggleGroupItem>
</ToggleGroup>
```

### Loading States
```tsx
// Button loading
<Button disabled>
  <Loader2 className="size-4 animate-spin" />
  Saving...
</Button>

// Content loading
<Skeleton className="h-4 w-[200px]" />
```

### Forms (shadcn Form)
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="you@example.com" {...field} />
        </FormControl>
        <FormDescription>Your work email address.</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Data Tables (from dashboard-01 data-table.tsx)
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((row) => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell>
          <Badge variant="outline">{row.status}</Badge>
        </TableCell>
        <TableCell className="text-right">{row.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Inbox className="size-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Get started by creating your first project.
  </p>
  <Button className="mt-4">
    <Plus className="size-4" />
    Create Project
  </Button>
</div>
```

### Sidebar Layout (dashboard-01)
```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <h1 className="text-base font-medium">Page Title</h1>
    </header>
    <main className="flex-1 p-4 lg:p-6">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

## Implementation Checklist

When building UI, verify:

- [ ] All components imported from `@repo/ui` (which re-exports shadcn)
- [ ] No custom className values for styling (only layout)
- [ ] Using shadcn variants as-is (no custom variants)
- [ ] Loading states use `<Loader2 className="animate-spin" />`
- [ ] Empty states follow the pattern above
- [ ] Forms use shadcn Form with react-hook-form
- [ ] Tables use shadcn Table components
- [ ] Cards use Card + CardHeader + CardTitle pattern

## Available Components

From `@repo/ui` (shadcn):
- **Layout:** Card, Separator, Tabs
- **Forms:** Button, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Form
- **Feedback:** Badge, Alert, Progress, Skeleton, Toast (Sonner)
- **Overlays:** Dialog, Sheet, AlertDialog, DropdownMenu, Tooltip, Command
- **Data:** Table, Avatar, DataTable
- **Navigation:** Breadcrumb, Sidebar, ToggleGroup

## What NOT to Do

```tsx
// BAD - Custom wrapper
function StatCard({ title, value }) { ... }

// GOOD - Compose shadcn components
<Card>
  <CardHeader>
    <CardDescription>{title}</CardDescription>
    <CardTitle>{value}</CardTitle>
  </CardHeader>
</Card>
```

```tsx
// BAD - Custom styling
<Button className="rounded-[10px] duration-[160ms]">

// GOOD - Just use shadcn
<Button>
```

```tsx
// BAD - Custom loading component
<Spinner size="lg" />

// GOOD - Inline Loader2
<Loader2 className="size-6 animate-spin" />
```

## Quick Reference

| Need | Use |
|------|-----|
| Stats/metrics | Card + CardHeader + CardTitle + CardAction + Badge |
| Mode switching | ToggleGroup with type="single" |
| Loading | `<Loader2 className="animate-spin" />` |
| Forms | Form + FormField + FormLabel + FormControl |
| Tables | Table + TableHeader + TableBody + TableRow |
| Empty state | Centered icon + title + description + CTA |
| Sidebar | SidebarProvider + Sidebar + SidebarInset |
| Navigation | Breadcrumb components |
| Actions menu | DropdownMenu |
| Confirmations | AlertDialog |
| Panels | Sheet |

---

## Three Surfaces: Dashboard vs Portal vs Marketing

This skill covers THREE distinct design approaches:

| Surface | Design System | Philosophy |
|---------|---------------|------------|
| User Dashboard | shadcn (full) | Dense, functional, "just use shadcn" |
| Client Portal | shadcn (subset) | Spacious, approachable, light mode |
| Marketing Site | Custom Tailwind | Dramatic, bold, creative |

---

## Marketing Site (Custom Approach)

The marketing site is **completely separate** from shadcn. It uses:

- **Custom animation effects** from `app/_components/effects/`
- **Raw Tailwind** with custom values (no @repo/ui)
- **Dark, dramatic styling** with gradients, glows, and blur
- **Section-based architecture** (HeroSection, FeaturesSection, etc.)

### Philosophy: Bold & Cinematic

Marketing pages should feel like a **product launch video**, not a web app:

- Dramatic entrance animations
- Cinematic gradients and glows
- High contrast (dark backgrounds, bright accents)
- Large typography with fluid scaling
- Storytelling through scroll

### Available Effects

Import from `@/app/_components/effects/`:

| Effect | Purpose |
|--------|---------|
| `WordReveal` | Blur-reveal text animation on scroll |
| `FadeUpBlur` | Staggered fade-up with blur |
| `GlowBorder` | Animated gradient border glow |
| `GridPattern` | Subtle dot grid background |
| `MagneticHover` | Cursor-following magnetic effect |
| `GrainOverlay` | Film grain texture overlay |
| `StaggeredGrid` | Grid items with staggered entrance |
| `AnimatedCounter` | Number counting animation |

### Color Palette (Marketing)

```tsx
// Dark backgrounds
className="bg-[rgb(8,9,10)]"

// Muted text
className="text-[rgb(138,143,152)]"

// Bright text
className="text-[#F7F8F8]"

// Subtle borders
className="border-white/[0.06]"

// Frosted glass
className="bg-white/[0.03]"
```

### Typography (Marketing)

Use fluid `clamp()` for responsive headlines:

```tsx
// Hero headline
className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.06] tracking-[-0.022em]"

// Section headline
className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight"

// Body text
className="text-[clamp(1rem,1.8vw,1.125rem)] leading-relaxed"
```

### Section Pattern (Marketing)

```tsx
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { WordReveal } from "@/app/_components/effects/word-reveal";

export function FeatureSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background effects */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <FadeUpBlur>
          <p className="text-sm font-medium uppercase tracking-widest text-[rgb(138,143,152)]">
            Feature category
          </p>
        </FadeUpBlur>

        <WordReveal
          text="Your compelling headline here."
          as="h2"
          className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-[#F7F8F8]"
        />

        <FadeUpBlur delay={0.3}>
          <p className="mt-6 max-w-2xl text-lg text-[rgb(138,143,152)]">
            Description text that explains the value proposition.
          </p>
        </FadeUpBlur>
      </div>
    </section>
  );
}
```

### CTA Button (Marketing)

```tsx
import { GlowBorder } from "@/app/_components/effects/glow-border";
import { MagneticHover } from "@/app/_components/effects/magnetic-hover";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

<MagneticHover maxTranslate={4} maxRotate={0.5}>
  <GlowBorder duration={4} rounded="rounded-full">
    <Link
      href="#waitlist"
      className="group inline-flex items-center gap-2 rounded-full bg-[rgb(8,9,10)] px-7 py-3.5 text-[15px] font-medium text-[#F7F8F8]"
    >
      Join the waitlist
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  </GlowBorder>
</MagneticHover>
```

### Marketing Components Location

All marketing components live in `app/_features/marketing/components/`:

| Component | Purpose |
|-----------|---------|
| `HeroSection` | Above-the-fold with headline + CTA + mockup |
| `FeaturesSection` | Feature grid or accordion |
| `ProblemSection` | Pain point storytelling |
| `TransformationSection` | Before/after transformation |
| `TestimonialsSection` | Social proof |
| `WaitlistSection` | Email capture form |
| `MarketingHeader` | Site header with nav |
| `MarketingFooter` | Site footer |

### What NOT to Do (Marketing)

```tsx
// BAD - Using shadcn components
import { Button } from "@repo/ui"
<Button>Click me</Button>

// GOOD - Custom styled element
<button className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-medium">
  Click me
</button>
```

```tsx
// BAD - Plain text without animation
<h1>Welcome to Salt Core</h1>

// GOOD - Animated entrance
<WordReveal
  text="Welcome to Salt Core"
  as="h1"
  className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold"
/>
```

```tsx
// BAD - Static background
<section className="bg-black">

// GOOD - Dynamic background with effects
<section className="relative overflow-hidden">
  <GridPattern dotColor="rgba(255,255,255,0.07)" gap={28} dotSize={1} />
  <div className="relative z-10">...</div>
</section>
```

---

## Quick Reference

| Surface | Import From | Styling | Animation |
|---------|-------------|---------|-----------|
| Dashboard | `@repo/ui` | shadcn defaults | Minimal |
| Portal | `@repo/ui` | shadcn (spacious) | Subtle |
| Marketing | `@/app/_components/effects/` | Custom Tailwind | Bold |

## Resources

- shadcn docs: https://ui.shadcn.com
- Dashboard block: `npx shadcn@latest add dashboard-01`
- Sidebar block: `npx shadcn@latest add sidebar-01`
- Marketing effects: `app/_components/effects/`
- Marketing components: `app/_features/marketing/components/`
