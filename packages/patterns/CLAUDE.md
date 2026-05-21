# @repo/patterns - Composed UI Patterns

**Context:** You are working with Salt's composed pattern components.
**Role:** Pattern Developer
**Goal:** Build reusable, composed patterns from primitives.

---

## Pattern Inventory

6 patterns available in `src/`:

| Pattern | Purpose | Key Props |
|---------|---------|-----------|
| `PageBanner` | Page titles with actions | `title`, `subtitle`, `eyebrow`, `tabs`, `actions`, `size` |
| `FilterBar` | Search + filters + actions | `searchValue`, `onSearchChange`, `filters`, `actions` |
| `EmptyState` | No-data states | `icon`, `title`, `description`, `action` |
| `StatCard` | Dashboard metrics | `title`, `value`, `icon`, `trend` |
| `ConfirmDialog` | Destructive confirmations | `title`, `description`, `onConfirm`, `destructive` |
| `AppShell` | Dashboard layout wrapper | `sidebar`, `children` |

---

## Design System References

**ALWAYS consult these docs before building UI:**

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| `docs/guides/agent-component-guide.md` | AI-optimized quick reference | First - decision trees |
| `docs/guides/component-decision-matrix.md` | WHEN to use each pattern | Choosing patterns |
| `docs/guides/component-cookbook.md` | HOW to use with examples | Implementing |
| `docs/guides/page-templates.md` | Full page skeletons | Building pages |
| `docs/guides/integration-patterns.md` | Server Actions, Suspense | Data integration |

---

## Pattern Usage

### PageBanner

For page titles, dashboard greetings, and section headers:

```tsx
import { PageBanner } from "@repo/patterns"

// Basic
<PageBanner title="Settings" noBorder />

// Hero size for dashboards (Ramp-inspired)
<PageBanner
  size="hero"
  eyebrow="FRIDAY, MAY 16"
  title="Good morning, Gabriella"
  subtitle="3 things worth your attention today."
  tabs={[
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
  ]}
  activeTab="today"
  onTabChange={setTab}
  actions={<Button>New</Button>}
  fullWidthDivider
/>
```

### FilterBar

For searchable/filterable lists:

```tsx
import { FilterBar } from "@repo/patterns"

<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search clients..."
  filters={<Select>...</Select>}
  actions={<Button>Export</Button>}
/>
```

### EmptyState

For no-data states:

```tsx
import { EmptyState } from "@repo/patterns"

<EmptyState
  icon={<FolderPlus className="size-12" />}
  title="No projects yet"
  description="Create your first project to get started."
  action={<Button>Create Project</Button>}
/>
```

### StatCard

For dashboard metrics:

```tsx
import { StatCard } from "@repo/patterns"

<StatCard
  title="Total Clients"
  value={42}
  icon={<Users className="size-4" />}
  trend={{ value: 12, direction: "up" }}
/>
```

### ConfirmDialog

For destructive action confirmations:

```tsx
import { ConfirmDialog } from "@repo/patterns"

<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete Project"
  description="This cannot be undone."
  confirmText="Delete"
  onConfirm={handleDelete}
  loading={isDeleting}
  destructive
/>
```

---

## Key Rules

### Patterns vs Primitives

| Primitives (@repo/ui) | Patterns (@repo/patterns) |
|----------------------|---------------------------|
| Single responsibility | Composed from primitives |
| No business logic | May include light behavior |
| Maximum flexibility | Opinionated for consistency |
| Low-level building blocks | Ready-to-use solutions |

### When to Create a New Pattern

1. **Repeated composition** - Same primitive combination used 3+ times
2. **Consistent behavior** - Same interaction pattern needed across features
3. **Not feature-specific** - Would be useful in multiple domains

### Pattern Structure

```typescript
import { cn } from "@repo/utils"
// Import primitives from @repo/ui
import { Card, Button } from "@repo/ui"

interface PatternNameProps {
  // Clear, typed props
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Pattern description.
 *
 * @example Basic usage
 * ```tsx
 * <PatternName title="Hello" />
 * ```
 */
export function PatternName({
  title,
  description,
  action,
  className,
}: PatternNameProps) {
  return (
    <div className={cn("base-styles", className)}>
      {/* Compose primitives */}
    </div>
  )
}
```

---

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Duplicate pattern code in features | Import from @repo/patterns |
| Add feature-specific logic to patterns | Create feature component using pattern |
| Create overly flexible patterns | Keep patterns opinionated |
| Skip empty state handling | Always show EmptyState for no data |

---

## Relationship to App Patterns

Some patterns live in `app/_components/patterns/` instead:

| @repo/patterns | app/_components/patterns |
|----------------|--------------------------|
| Framework-agnostic | Next.js specific |
| No app imports | Can import app code |
| Reusable across apps | Salt specific |

Example: `PageGreetingHeader` lives in app because it uses Salt's greetings system.
