# @repo/ui - Design System Primitives

**Context:** You are working with Salt Core's UI primitive components.
**Role:** UI Component Developer
**Goal:** Build consistent, accessible, Linear-inspired UI components.

---

## Component Inventory

32 primitives available in `src/primitives/`:

| Category | Components |
|----------|------------|
| **Layout** | `card`, `separator`, `accordion` |
| **Forms** | `button`, `input`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `combobox`, `field`, `label`, `input-group` |
| **Feedback** | `badge`, `alert`, `progress`, `skeleton`, `spinner`, `toast` (sonner) |
| **Overlays** | `dialog`, `sheet`, `alert-dialog`, `dropdown-menu`, `tooltip`, `command` |
| **Data** | `table`, `tabs`, `avatar` |
| **Special** | `glass-card`, `stat-card` |

---

## Design System References

**ALWAYS consult these docs before building UI:**

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| `docs/guides/agent-component-guide.md` | AI-optimized quick reference | First - contains decision trees |
| `docs/guides/component-decision-matrix.md` | WHEN to use each component | Choosing components |
| `docs/guides/component-cookbook.md` | HOW to use with examples | Implementing patterns |
| `docs/guides/ui-patterns.md` | Smart/Dumb architecture | Component design |
| `brand-identity/product/ux-standards.md` | Linear Standard philosophy | Visual decisions |

---

## Key Patterns

### Import Convention

```typescript
// Consumers import from package root
import { Button, Card, Input } from "@repo/ui"

// NOT from deep paths
import { Button } from "@repo/ui/src/primitives/button" // ❌
```

### Variant System (CVA)

All components use Class Variance Authority for variants:

```typescript
const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border-border bg-transparent",
        ghost: "text-muted-foreground hover:bg-muted/50",
        destructive: "bg-destructive/10 text-destructive",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[13px]",
        toolbar: "h-7 px-2.5 text-[13px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Linear-Inspired Styling

All components follow the Linear Standard:

| Property | Value | Reason |
|----------|-------|--------|
| Border radius | `rounded-[10px]` buttons, `rounded-[16px]` cards | Linear's exact values |
| Font weight | `font-[500]` | Linear's heading weight |
| Easing | `cubic-bezier(0.25,0.46,0.45,0.94)` | Linear's animation curve |
| Duration | `160ms` | Linear's button transition |
| Active scale | `scale-[0.97]` | Linear's press feedback |

### Semantic Colors Only

```typescript
// ✅ CORRECT - Semantic tokens
"bg-primary text-primary-foreground"
"bg-card border-border"
"text-muted-foreground"

// ❌ WRONG - Raw Tailwind colors (ESLint will catch)
"bg-blue-500 text-white"
"bg-zinc-800"
```

---

## Component Requirements

When creating or modifying primitives:

1. **TSDoc comments** with `@example` blocks
2. **CVA variants** for all visual variations
3. **`data-slot` attributes** for CSS targeting
4. **`cn()` utility** for class merging
5. **Semantic color tokens** only
6. **Accessibility attributes** (aria-labels, focus states)

### Example Component Structure

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@repo/utils"

/**
 * Component description.
 *
 * @example Basic usage
 * ```tsx
 * <Component>Content</Component>
 * ```
 *
 * @example With variant
 * ```tsx
 * <Component variant="outline">Outlined</Component>
 * ```
 */
const componentVariants = cva(
  "base-styles",
  {
    variants: {
      variant: { /* ... */ },
      size: { /* ... */ },
    },
    defaultVariants: { /* ... */ },
  }
)

function Component({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof componentVariants>) {
  return (
    <div
      data-slot="component"
      className={cn(componentVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Component, componentVariants }
```

---

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Use raw Tailwind colors | Use semantic tokens |
| Create component without variants | Use CVA for all variations |
| Skip TSDoc examples | Add `@example` blocks |
| Hard-code dimensions | Use design tokens |
| Skip accessibility | Add aria attributes |

---

## Testing

Unit tests co-located with components:

```
packages/ui/src/primitives/
├── button.tsx
└── button.test.tsx
```

Run tests: `pnpm test --filter @repo/ui`
