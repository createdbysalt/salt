# @repo/ui - Vanilla shadcn/ui Primitives

**Context:** You are working with Salt's UI primitive components.
**Role:** UI Component Developer
**Goal:** Build consistent, accessible UI using vanilla shadcn/ui components.

---

## Philosophy

This package uses **vanilla shadcn/ui** components with minimal customization. The goal is fast, easy UI development without overthinking styling.

**Key principles:**
- Use shadcn defaults - they're already good
- No custom design tokens or "Linear Standard" - just shadcn
- Loading states use `<Loader2 className="animate-spin" />` from lucide-react
- When in doubt, copy from shadcn docs

---

## Component Inventory

52 primitives available in `src/primitives/`:

| Category | Components |
|----------|------------|
| **Layout** | `card`, `separator`, `accordion`, `sidebar`, `app-sidebar`, `collapsible`, `resizable`, `section-cards` |
| **Forms** | `button`, `input`, `input-group`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `label`, `form`, `toggle`, `toggle-group`, `slider`, `phone-input`, `calendar`, `date-picker`, `combobox` |
| **Feedback** | `badge`, `alert`, `progress`, `skeleton`, `sonner`, `toast` |
| **Overlays** | `dialog`, `sheet`, `drawer`, `alert-dialog`, `dropdown-menu`, `tooltip`, `command`, `popover` |
| **Data** | `table`, `data-table`, `tabs`, `avatar`, `chart`, `chart-area-interactive` |
| **Navigation** | `breadcrumb`, `nav-main`, `nav-secondary`, `nav-documents`, `nav-projects`, `nav-user`, `site-header` |
| **Typography** | `typography` |

---

## Import Convention

```typescript
// Consumers import from package root
import { Button, Card, Input } from "@repo/ui"

// NOT from deep paths
import { Button } from "@repo/ui/src/primitives/button" // ❌
```

---

## Common Patterns

### Loading States

shadcn Button does NOT have a `loading` prop. Use this pattern:

```tsx
import { Loader2 } from "lucide-react"

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="size-4 animate-spin" />}
  Submit
</Button>
```

### Badge Variants

shadcn Badge has: `default`, `secondary`, `destructive`, `outline`

For semantic colors (success, warning), use outline + custom classes:

```tsx
// Success
<Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600">
  Success
</Badge>

// Warning
<Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
  Warning
</Badge>
```

### Toasts

Use Sonner directly:

```tsx
import { toast } from "sonner"

toast.success("Saved!")
toast.error("Something went wrong")
toast("Default message")
```

---

## Variant System (CVA)

All components use Class Variance Authority for variants:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

---

## Semantic Colors

Use CSS variables defined in globals.css:

```typescript
// ✅ CORRECT - Semantic tokens
"bg-primary text-primary-foreground"
"bg-card border-border"
"text-muted-foreground"
"bg-destructive text-destructive-foreground"

// ❌ WRONG - Raw Tailwind colors
"bg-blue-500 text-white"
"bg-zinc-800"
```

---

## Adding New Components

Use the shadcn CLI:

```bash
pnpm dlx shadcn@latest add [component-name]
```

Components are added to `packages/ui/src/primitives/` and exported from `src/index.ts`.

---

## Testing

Unit tests co-located with components:

```
packages/ui/src/primitives/
├── button.tsx
└── button.test.tsx
```

Run tests: `pnpm test --filter @repo/ui`
