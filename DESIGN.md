---
version: "2.0"
name: SALT
description: Ambient intelligence for independent professionals. Ramp-inspired, light-first design system with operator density.
colors:
  background: "#faf8f5"
  foreground: "#27251e"
  card: "#fafaf8"
  muted: "rgba(39, 37, 30, 0.04)"
  muted-foreground: "rgba(39, 37, 30, 0.65)"
  primary: "#4e58fc"
  primary-foreground: "#ffffff"
  secondary: "#f5f4f1"
  secondary-foreground: "#27251e"
  accent: "#4e58fc"
  accent-foreground: "#FAFAFA"
  destructive: "#DC2626"
  success: "#16A34A"
  warning: "#D97706"
  info: "#2563EB"
  border: "rgba(39, 37, 30, 0.08)"
  relationship:
    clients: "#c1f8ae"
    partners: "#b76dfb"
    vendors: "#ee794d"
    team: "#cbcfd8"
typography:
  sans:
    fontFamily: "Inter, SF Pro Display, system-ui, sans-serif"
  mono:
    fontFamily: "salt-mono, Berkeley Mono, SF Mono, monospace"
  body:
    fontSize: "14px"
    fontWeight: 400
  heading:
    fontSize: "24px"
    fontWeight: 500
rounded:
  none: "0px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
elevation:
  none: "none"
  border: "0 0 0 1px {colors.border}"
breakpoints:
  sm: "640px"
  md: "768px"
  lg: "1024px"
  xl: "1280px"
components:
  button:
    borderRadius: "{rounded.sm}"
    states:
      hover: "bg-primary/90"
      disabled: "opacity-50 cursor-not-allowed"
      loading: "opacity-70"
  card:
    borderRadius: "{rounded.none}"
    border: "1px solid {colors.border}"
  input:
    borderRadius: "{rounded.sm}"
    states:
      focus: "ring-2 ring-ring"
      error: "border-destructive"
  avatar:
    borderRadius: "{rounded.full}"
    outline: "ring-1 ring-border"
---

# DESIGN.md — SALT Design System v2

> Drop this file in your project root. AI coding agents read it to generate on-brand UI.
> Compatible with [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) format.

## Overview

**Name:** SALT (one word, all caps)
**Domain:** usesalt.io
**What it is:** Ambient intelligence for independent professionals—designers, developers, coaches, consultants.
**Tagline:** Your practice remembers everything. You just decide.

**Reference brands:** Ramp (restraint), Linear (density), Perplexity (warm neutrals), Apollo (operator aesthetic)

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Light-first** | Warm cream surfaces (#faf8f5), dark mode as accessibility option |
| **Sharp corners** | 0px default radius on cards/containers, only avatars remain rounded |
| **Border-based elevation** | Use borders for depth, NEVER shadows in product UI |
| **Ramp restraint** | Minimal color splashes, neutral-dominant palette |
| **Operator density** | Professional tools pack information; don't over-space |
| **Speed is visible** | Optimistic UI, instant feedback, keyboard shortcuts |

---

## Color System

### Neutral Palette (Perplexity-inspired)

Warm, cream-toned neutrals using opacity-based text hierarchy. This creates cohesive warmth across all surfaces.

```css
/* Surfaces - Warm cream tones */
--background: #faf8f5       /* Page background (warm cream) */
--card: #fafaf8             /* Elevated surfaces (warm off-white) */
--muted: rgba(39,37,30,0.04) /* Subtle backgrounds (transparent overlay) */

/* Text - Opacity-based hierarchy from #27251e */
--foreground: #27251e                  /* Primary text (warm brown-black) */
--muted-foreground: rgba(39,37,30,0.65) /* Secondary text (65% opacity) */

/* Borders - Warm semi-transparent */
--border: rgba(39,37,30,0.08)        /* Subtle borders (8% opacity) */
--border-strong: rgba(39,37,30,0.14) /* Emphasized borders (14% opacity) */

/* Brand */
--primary: #4e58fc          /* Buttons, CTAs (blue) */
--primary-foreground: #ffffff

/* Accent */
--accent: #4e58fc           /* Blue - AI features, CTAs (NOT purple) */
--accent-foreground: #FAFAFA

/* Status (OKLCH format) - unchanged */
--success: oklch(0.72 0.15 142)      /* Green - bg-success */
--warning: oklch(0.75 0.15 85)       /* Amber - bg-warning */
--info: oklch(0.65 0.15 250)         /* Blue - bg-info */
--destructive: oklch(0.55 0.2 25)    /* Red - bg-destructive */
```

### Why Opacity-Based Text?

Perplexity uses a single base color (`#27251e`) at different opacities for text hierarchy. Benefits:
- Consistent warmth across all text
- Naturally blends with any warm background
- Simpler mental model (one color, vary opacity)

### Relationship Colors

Entity types use a four-color system for visual encoding in graphs and chips:

| Relationship | Color | Hex | Use |
|--------------|-------|-----|-----|
| Clients | Green | `#c1f8ae` | Revenue relationships |
| Partners | Purple | `#b76dfb` | Collaboration relationships |
| Vendors | Orange | `#ee794d` | Support relationships |
| Team | Gray | `#cbcfd8` | Internal relationships |

```tsx
// CSS custom properties
--relationship-clients: #c1f8ae
--relationship-partners: #b76dfb
--relationship-vendors: #ee794d
--relationship-team: #cbcfd8
```

**Usage:**
```tsx
// ✅ Correct
className="bg-primary text-primary-foreground"
className="bg-success text-success-foreground"
className="text-muted-foreground"
className="bg-accent text-accent-foreground"  // Blue, for AI

// ❌ Wrong
className="bg-blue-500 text-white"
className="bg-green-500"
className="bg-purple-500"  // Use bg-accent for AI features
className="bg-zinc-900"    // Use bg-foreground (warm black)
```

---

## Typography

### Font Families

```css
--font-sans: "Inter", "SF Pro Display", system-ui, sans-serif
--font-mono: "salt-mono", "Berkeley Mono", "SF Mono", monospace

/* Weights (Linear-style: lighter than typical SaaS) */
--font-weight-normal: 400    /* Body text */
--font-weight-medium: 500    /* Headers, buttons */
--font-weight-semibold: 600  /* Bold emphasis */
```

### Scale

| Use | Class | Size |
|-----|-------|------|
| Hero title | `salt-display-md` or `text-[32px] leading-[1.15] font-medium` | 32px · 500 |
| Page title (H1) | `text-2xl font-semibold tracking-tight` | 24px · 600 |
| Section header (H2) | `text-lg font-semibold tracking-tight` | 18px · 600 |
| Body | `text-sm` | 14px |
| Caption | `text-xs text-muted-foreground` | 12px |
| Eyebrow | `salt-eyebrow` | 11px mono · 500 · tracking 0.08em · uppercase |

### Display Sizes (Global Classes)

These utility classes are defined in `globals.css` for consistent display typography:

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `salt-display-xl` | 56px | 500 | Marketing hero |
| `salt-display-lg` | 40px | 500 | Large section headers |
| `salt-display-md` | 32px | 500 | Dashboard greetings, PageBanner hero |
| `salt-display-sm` | 24px | 500 | Standard page titles |
| `salt-eyebrow` | 11px | 500 | Mono uppercase labels |

### Mono Font Usage

The mono font (`font-mono` / `salt-mono`) is used for:

| Context | Example |
|---------|---------|
| **Eyebrows** | Section labels, category indicators |
| **Status text** | StatusPill text, state indicators |
| **Metadata** | Counts, IDs, timestamps |
| **Code** | Code snippets, technical values |

```tsx
// ✅ Mono font usage
<span className="font-mono text-xs uppercase tracking-wider">
  Client
</span>

<span className="font-mono text-xs text-muted-foreground">
  12 projects
</span>
```

---

## Spacing & Layout

```css
/* Base unit: 4px */
--spacing-1: 4px
--spacing-2: 8px
--spacing-3: 12px
--spacing-4: 16px
--spacing-6: 24px
--spacing-8: 32px
```

**Page structure:**
```tsx
<div className="p-6">           {/* Page padding */}
  <header className="mb-6">     {/* Header spacing */}
  <main className="space-y-4">  {/* Content gaps */}
```

---

## Border Radius

| Element | Radius | Class |
|---------|--------|-------|
| Cards, containers | 0px | `rounded-none` |
| Buttons, inputs | 4px | `rounded-sm` |
| Status indicators | 2px | `rounded-[2px]` |
| Avatars | 9999px | `rounded-full` |
| Icon containers | 6px | `rounded-md` |
| **Sidebar nav items** | 12px | `rounded-xl` |
| **Sidebar sub-items** | 8px | `rounded-lg` |

---

## Sidebar (Perplexity-Inspired)

The sidebar follows Perplexity's minimal, warm aesthetic with icon-only collapse mode.

### Dimensions

| Property | Value | Notes |
|----------|-------|-------|
| Width (expanded) | 200px | Narrower than typical SaaS |
| Width (collapsed) | 48px | Icon-only mode |
| Nav item height | 36px (h-9) | Consistent vertical rhythm |
| Sub-item height | 32px (h-8) | Slightly smaller |
| Icon stroke | 1.5px | Thinner than default (2px) |
| Padding (expanded) | px-3 header, px-1 content | Breathing room |

### Workspace Icon (Top)

The workspace switcher uses a **rounded square button**, not a circular avatar:

```tsx
// Expanded: dropdown trigger
<button className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
  <span className="text-[11px] font-semibold">MA</span>
</button>

// Collapsed: click-to-expand with hover icon swap
<button className="h-9 w-9 rounded-lg hover:bg-sidebar-accent">
  {isHovered ? <PanelLeft /> : <span>MA</span>}
</button>
```

### Nav Items

```tsx
<SidebarMenuButton className="h-9 rounded-lg text-[13px] font-normal">
  <Icon strokeWidth={1.5} className="size-4" />
  <span>{title}</span>
</SidebarMenuButton>
```

- Height: `h-9` (36px)
- Border radius: `rounded-lg` (8px)
- Font: `text-[13px] font-normal`
- Icons: `size-4` with `strokeWidth={1.5}`
- No badges or notification dots (clean)

### Sub-Items (Collapsible Sections)

```tsx
<SidebarMenuSubButton className="h-8 rounded-lg text-xs text-muted-foreground">
  <span>{title}</span>  {/* No icons */}
</SidebarMenuSubButton>
```

- Height: `h-8` (32px)
- Font: `text-xs text-muted-foreground`
- No icons — text only
- Left-aligned with parent icon

### Collapsible Sections

Sections (Connections, Try) use a hover-to-reveal chevron pattern:

```tsx
// Icon visible by default, chevron appears on hover
<span className="relative size-4">
  <Icon className="group-hover/row:opacity-0" />
  <ChevronRight className="opacity-0 group-hover/row:opacity-100" />
</span>
```

**Behavior:**
- Default state: **collapsed** (sections closed on load)
- Auto-expand: opens when navigating to a page in that section
- Hover: icon swaps to chevron for expand/collapse
- Tooltip: "Collapse {Section}" / "Expand {Section}"

### Collapsed Mode

When collapsed (`collapsible="icon"`):

1. **Click-to-expand anywhere**: Clicking empty space expands sidebar
2. **Pointer cursor**: Entire collapsed sidebar shows pointer
3. **Workspace icon**: Hover shows `PanelLeft` expand icon
4. **Nav items**: Show icon only with tooltip
5. **Sections**: Render as simple icon links (no collapse/expand)

```tsx
// Click overlay for collapsed state
{isCollapsed && (
  <div
    className="absolute inset-0 z-10 cursor-pointer"
    onClick={(e) => {
      if (!(e.target as HTMLElement).closest('button, a')) {
        toggleSidebar();
      }
    }}
  />
)}
```

### Footer (User Menu)

Minimal footer showing avatar and first name only:

```tsx
<SidebarMenuButton className="h-9 rounded-lg">
  <Avatar className="size-6 ring-1 ring-border">
    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
  </Avatar>
  <span className="text-[13px] font-normal">{firstName}</span>
  <MoreVertical className="ml-auto size-4" strokeWidth={1.5} />
</SidebarMenuButton>
```

### CSS Variables

```css
/* Sidebar - Perplexity warm cream */
--sidebar: #f0eeea;
--sidebar-foreground: rgba(39, 37, 30, 0.75);
--sidebar-accent: rgba(39, 37, 30, 0.06);
--sidebar-accent-foreground: #27251e;
--sidebar-border: rgba(39, 37, 30, 0.08);
--sidebar-ring: rgba(39, 37, 30, 0.25);
```

---

## Animation

```css
/* Easing (Linear signature) */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1)

/* Durations */
--duration-fast: 100ms      /* Micro-interactions */
--duration-normal: 160ms    /* Transitions */
--duration-slow: 200ms      /* Larger animations */
```

**Usage:**
```tsx
className="transition-colors duration-fast ease-out-expo"
```

---

## Components

### StatusPill (NEW)

Status indicators use **neutral background with colored dot**, mono font, and foreground text.

**Pattern:**
```tsx
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-sm">
  <span 
    className="size-1.5 rounded-[2px]" 
    style={{ backgroundColor: 'var(--relationship-clients)' }} 
  />
  <span className="font-mono text-xs text-foreground">
    Client
  </span>
</span>
```

**Rules:**
- Background: `bg-muted` (neutral, always)
- Dot: Small square (2px radius), relationship color
- Text: `font-mono text-xs text-foreground`
- Never use colored backgrounds for status

```tsx
// ✅ Correct StatusPill
<StatusPill color="clients">Client</StatusPill>
// Renders: neutral bg, green dot, mono text

// ❌ Wrong - colored background
<Badge className="bg-green-500 text-white">Client</Badge>
```

### EntityChip (NEW)

Entity chips show entity type with optional count. Used in relationship graphs and lists.

**Pattern:**
```tsx
<div className="inline-flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-sm">
  <span 
    className="size-3 rounded-sm" 
    style={{ backgroundColor: 'var(--relationship-clients)' }} 
  />
  <span className="text-sm">Clients</span>
  <span className="font-mono text-xs text-muted-foreground">12</span>
</div>
```

**Rules:**
- Indicator: Small square (4px radius), relationship color
- Label: Sans font, regular weight
- Count: Mono font, muted color

### Button

```tsx
import { Button } from "@repo/ui"

<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>

// Loading state (NO loading prop)
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="size-4 animate-spin" />}
  Submit
</Button>
```

### AIButton (AI-Powered Actions)

**Use `AIButton` for any button that triggers AI functionality.** The visual signature is a **blue accent (#4e58fc)** with a **rotating gradient border** — an animated gradient ring that signals AI-powered actions. Same visual language as the AI thinking indicator.

```tsx
import { AIButton } from "@repo/ui"
import { Sparkles, Zap } from "lucide-react"

// Default: text button with rotating gradient border (rounded-sm)
<AIButton>
  <Sparkles className="size-4" />
  Quick capture
</AIButton>

// Header variant: matches search bar styling (rounded-lg, h-8)
<AIButton variant="header">
  <Sparkles className="size-4" />
  Capture
</AIButton>

// Icon variant: circular buttons for toolbars
<AIButton variant="icon">
  <Zap className="size-4" />
</AIButton>

// Small variants
<AIButton size="sm">
  <Sparkles className="size-3.5" />
  Capture
</AIButton>
```

**Visual Characteristics:**
- Background: `bg-card` (warm cream)
- Text/Icon: `#4e58fc` (blue accent)
- Border: Animated rotating gradient ring
- Hover: `opacity-80` (subtle dim)
- Cursor: `pointer` across entire button area

**Variants:**
| Variant | Border Radius | Size | Use Case |
|---------|---------------|------|----------|
| `default` | 4px (rounded-sm) | px-4 py-2 | Standard AI action buttons |
| `header` | 8px (rounded-lg) | h-8 px-3 | Site header, matches search bar |
| `icon` | full (rounded-full) | size-9 / size-7 | Toolbars, icon-only buttons |

**Icon Mapping:**
| Icon | Use | Examples |
|------|-----|----------|
| **Inbox** | Capture feature | Capture nav item, Capture page |
| **Zap** | Plays/AI actions | Draft reply, Generate summary, Plays button |
| **Sparkles** | General AI indicator | "Filing this for you…", AI badges |

**When to use AIButton:**
- Capture feature buttons → Inbox icon
- AI actions — Draft reply, Generate summary → Zap icon
- Approve & send on AI action cards
- Any button where SALT does work autonomously

**Do NOT use regular Button with accent color for AI actions.** The rotating gradient border is the differentiator — it signals "SALT is doing the work."

### PageBanner (Page Headers)

The PageBanner is the primary page header pattern. Used for dashboards, list pages, and section intros. Supports eyebrow text, title, subtitle, tabs, and action slot.

```tsx
import { PageBanner, getGreeting, formatEyebrowDate } from "@repo/patterns"

// Hero size (dashboards, HQ)
<PageBanner
  size="hero"
  eyebrow={formatEyebrowDate()}        // "SATURDAY, MAY 16"
  title={`${getGreeting()}, ${name}`}  // "Good afternoon, Salt"
  subtitle="3 things worth your attention today."
  tabs={[
    { label: "Brief", value: "brief" },
    { label: "Stats", value: "stats", disabled: true },
    { label: "Insights", value: "insights", disabled: true },
  ]}
  activeTab="brief"
  onTabChange={setActiveTab}
  fullWidthDivider
  actions={
    <Link href="/plays">
      <AIButton size="sm">
        <Zap className="size-3.5" />
        Make Plays
      </AIButton>
    </Link>
  }
/>

// Default size (standard pages)
<PageBanner
  title="Projects"
  subtitle="Manage your active projects"
  noBorder
/>
```

**Typography Specs:**

| Element | Hero Size | Default Size | Class |
|---------|-----------|--------------|-------|
| Eyebrow | 11px mono, 500, tracking 0.08em | Same | `salt-eyebrow` |
| Title | 32px, medium (500), tight tracking | 24px, semibold (600) | `salt-display-md` / `text-2xl font-semibold` |
| Subtitle | 12px (text-xs), muted | 14px (text-sm), muted | `text-xs text-muted-foreground` |
| Tabs | 12px (text-xs), normal weight | Same | `text-xs font-normal` |

**Spacing:**
- Eyebrow to title: `mb-4` (hero) / `mb-2` (default)
- Title to subtitle: `mt-3` (hero) / `mt-2` (default)
- Subtitle to tabs: `mt-8`
- Tab padding: `py-3`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `size` | `"default" \| "hero"` | Hero for dashboards (32px title), default for standard pages (24px) |
| `eyebrow` | `string` | Mono uppercase text above title |
| `title` | `string` | Main heading (required) |
| `subtitle` | `string` | Description below title |
| `tabs` | `Tab[]` | Tab navigation at bottom |
| `activeTab` | `string` | Currently active tab value |
| `onTabChange` | `(value: string) => void` | Tab change handler |
| `actions` | `ReactNode` | Right-aligned action buttons |
| `fullWidthDivider` | `boolean` | Extend border edge-to-edge |
| `noBorder` | `boolean` | Remove bottom border |

**Helper Functions:**
- `getGreeting()` — Returns "Good morning/afternoon/evening" based on time
- `formatEyebrowDate()` — Returns "SATURDAY, MAY 16" format

### Badge (Semantic Status)

For status that needs color coding, use outline variant with semantic tokens:

```tsx
// Success
<Badge variant="outline" className="border-success/50 bg-success/10 text-success">
  Active
</Badge>

// Warning
<Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
  Pending
</Badge>

// Info
<Badge variant="outline" className="border-info/50 bg-info/10 text-info">
  In Progress
</Badge>

// Destructive
<Badge variant="destructive">Overdue</Badge>

// Neutral (default for most cases)
<Badge variant="secondary">Draft</Badge>
```

**When to use Badge vs StatusPill:**
- **StatusPill**: Entity type indicators (Client, Partner, Vendor)
- **Badge**: Status values (Active, Pending, Overdue)

### Card

```tsx
<Card className="rounded-none border">  {/* Sharp corners, border elevation */}
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-medium">Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Dense content */}
  </CardContent>
</Card>
```

### Avatar

Avatars use a ring outline style:

```tsx
<Avatar className="ring-1 ring-border">
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

### Icon Buttons

Icon-only buttons use square containers:

```tsx
// Square icon button
<Button variant="ghost" size="icon" className="size-8 rounded-md">
  <MoreHorizontal className="size-4" />
</Button>

// NOT circular
<Button variant="ghost" size="icon" className="rounded-full">  // ❌
```

### Toast (Sonner)

```tsx
import { toast } from "sonner"

toast.success("Saved")           // Not "Successfully saved!"
toast.error("Couldn't save")     // Not "Oops! Something went wrong"
toast("Project created")
```

---

## Icon System

### Feature Icons

| Concept | Icon | Import | Usage |
|---------|------|--------|-------|
| **Capture nav** (sidebar) | `Inbox` | `lucide-react` | Navigation destination |
| **Capture action** (page banner, FAB) | `PenLine` | `lucide-react` | Quick note/capture action |
| **User note** (within capture feed) | `PenLine` | `lucide-react` | "You wrote this" |
| **Ambient signal** (AI-retrieved) | `Radio` | `lucide-react` | "System found this" |
| **General AI** | `Sparkles` | `lucide-react` | AI-powered badge/indicator |
| **Plays** | `Zap` | `lucide-react` | AI action suggestions |

### Icon Usage Rules

```tsx
// ✅ Correct - Capture nav uses Inbox
import { Inbox } from "lucide-react"
<SidebarMenuButton><Inbox /> Capture</SidebarMenuButton>

// ✅ Correct - Capture page banner uses PenLine (action)
import { PenLine } from "lucide-react"
<PageBanner icon={<PenLine />} title="Capture" />

// ✅ Correct - User-authored note uses PenLine  
<CaptureCard icon={<PenLine />} source="user" />

// ✅ Correct - AI-retrieved signal uses Radio
import { Radio } from "lucide-react"
<CaptureCard icon={<Radio />} source="ambient" />

// ✅ Correct - General AI indicator uses Sparkles
import { Sparkles } from "lucide-react"
<span className="text-muted-foreground"><Sparkles /> Filing this for you…</span>

// ✅ Correct - Plays/AI actions use Zap
import { Zap } from "lucide-react"
<AIButton><Zap /> Make Plays</AIButton>

// ❌ Wrong - Don't use Sparkles for Capture feature
<SidebarMenuButton><Sparkles /> Capture</SidebarMenuButton>
```

### Source-Specific Icons (Ambient Signals)

When showing ambient captures with specific sources, use source-appropriate icons:

| Source | Icon | Example |
|--------|------|---------|
| Email | `Mail` | Gmail integration |
| Calendar | `Calendar` | Meeting detected |
| Meeting notes | `MessageSquare` | Transcript summary |
| Generic ambient | `Radio` | Default for AI-retrieved |

---

## Graph Visual Encoding

The relationship graph uses four dimensions for encoding:

| Dimension | Meaning | Values |
|-----------|---------|--------|
| **Shape** | Entity type | Circle (person), Square (organization) |
| **Color** | Relationship | Green/Purple/Orange/Gray |
| **Fill** | Activity | Filled (active), Hollow (dormant) |
| **Size** | Importance | Large (high value), Small (standard) |

```tsx
// Active high-value client
<circle fill="#c1f8ae" r={24} />

// Dormant standard partner
<circle fill="none" stroke="#b76dfb" r={16} />
```

---

## Page Patterns

### List Page

```tsx
<div className="p-6">
  <PageGreetingHeader
    greeting="Good morning"
    name="Gabriella"
    description="3 projects · 12 tasks"
  />
  <FilterBar className="mb-4" />
  <DataTable data={items} columns={columns} />
</div>
```

### Detail Page

```tsx
<div className="p-6">
  <PageHeader
    title="Project Name"
    description="Client Name"
    actions={<Button>Edit</Button>}
  />
  <Tabs defaultValue="overview">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="tasks">Tasks</TabsTrigger>
    </TabsList>
  </Tabs>
</div>
```

### Empty State

```tsx
<EmptyState
  icon={<FolderOpen className="size-10 text-muted-foreground" />}
  title="No projects yet"
  description="Create your first project to get started"
  action={<Button>Create Project</Button>}
/>
```

---

## Voice & Copy

### UI Copy Rules
- **Terse:** "Saved" not "Successfully saved!"
- **No exclamation:** One per page, maybe
- **Active voice:** "Couldn't save" not "Save failed"
- **Suggest next step:** "Couldn't save. Check your connection."

### Avoid (AI Detection)
```
❌ leverage, utilize, streamline, seamless, robust, comprehensive
❌ "In today's fast-paced world..."
❌ "Unlock your potential"
❌ Multiple em-dashes — like this — everywhere
```

### Use Instead
```
✅ use, improve, works with, solid, grows with you
✅ Start with the point
✅ "Win bigger projects"
✅ One em-dash per paragraph max
```

---

## Loading States

```tsx
// Content loading
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />

// Button loading
<Button disabled>
  <Loader2 className="size-4 animate-spin" />
  Saving
</Button>

// Page loading
<div className="p-6 space-y-4">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-64 w-full" />
</div>
```

---

## Accessibility (Non-Negotiable)

- All interactive elements have `aria-label` if no visible text
- All images have meaningful `alt` text
- All inputs linked to `<label>` via `id`
- Never remove focus outlines without `:focus-visible` alternative
- Color contrast: 4.5:1 minimum for text

---

## File Structure

```
packages/ui/src/primitives/   # 52 shadcn components
packages/patterns/src/        # Composed patterns (PageHeader, EmptyState)
app/globals.css               # Theme tokens
```

**Imports:**
```tsx
import { Button, Card, Input, Badge, Avatar } from "@repo/ui"
import { PageHeader, EmptyState } from "@repo/patterns"
import { cn } from "@repo/utils"
```

---

## Quick Reference

| Need | Use |
|------|-----|
| Primary action | `<Button>` |
| Secondary action | `<Button variant="outline">` |
| Dangerous action | `<Button variant="destructive">` |
| **AI-powered action** | `<AIButton>` (rotating gradient border) |
| Entity type indicator | `<StatusPill>` (neutral bg + colored dot) |
| Status indicator | `<Badge variant="outline">` + semantic colors |
| Data list | `<DataTable>` |
| Form | React Hook Form + Zod + Server Action |
| Feedback | `toast.success()` / `toast.error()` |
| Loading content | `<Skeleton>` |
| Loading action | `<Loader2 className="animate-spin">` |
| Empty content | `<EmptyState>` |

---

## Do's and Don'ts

### Do
- Use semantic color tokens (`bg-primary`, `text-muted-foreground`)
- Sharp corners on cards and containers (`rounded-none`)
- Border-based elevation, never shadows
- Dense layouts — this is a professional tool
- Use `Skeleton` for loading content
- Use `Loader2` spinner only for button actions
- Use `AIButton` for AI-powered actions (rotating gradient border)
- Keyboard shortcuts for power users
- Mono font for status text and metadata
- Neutral backgrounds with colored dots for entity types

### Don't
- Use raw Tailwind colors (`bg-blue-500`, `bg-zinc-900`)
- Add `box-shadow` for depth — use borders instead
- Over-space content with excessive padding/margins
- Use loading spinners for content areas
- Use more than one primary button per view
- Use exclamation marks in UI copy
- Use AI-sounding words (leverage, utilize, seamless)
- Use colored backgrounds for entity type badges
- Use purple for accent (accent is blue #4e58fc)
- Use regular `Button` with accent color for AI actions (use `AIButton`)

---

## Responsive Behavior

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | Stack layouts, full-width buttons, bottom sheets |
| Tablet | 640-1024px | 2-column layouts, collapsible sidebar |
| Desktop | > 1024px | Full sidebar, dense data tables |

**Touch targets:** Minimum 44x44px on mobile.

---

## Effects (Magic UI / Aceternity)

For demo wow-factor, use sparingly:

```tsx
import { BorderBeam, MagicCard, ShimmerButton } from "@repo/ui"

// Glowing border on featured cards
<Card className="relative">
  <BorderBeam />
  <CardContent>...</CardContent>
</Card>

// Hover spotlight effect
<MagicCard>...</MagicCard>

// Shimmer CTA button (marketing pages)
<ShimmerButton>Get Started</ShimmerButton>
```

Available: `BorderBeam`, `MagicCard`, `ShimmerButton`, `SparklesCore`, `BackgroundBeams`, `TextGenerateEffect`

**Note:** For AI-powered buttons in the product UI, use `AIButton` from @repo/ui (see AIButton section above), not these effects.

---

*SALT Design System v2 — May 2026*
*Last synced with Design System sandbox*
