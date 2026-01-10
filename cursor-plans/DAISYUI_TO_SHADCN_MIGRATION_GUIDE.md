# Quick Migration Guide: DaisyUI → shadcn

This guide helps you quickly refactor remaining pages from DaisyUI to the new shadcn design system.

## Common Replacements

### Buttons
```tsx
// OLD (DaisyUI)
<button className="btn btn-primary">Click me</button>
<button className="btn btn-ghost btn-sm">Small Ghost</button>

// NEW (shadcn)
import { Button } from "@/components/ui/button";

<Button>Click me</Button>
<Button variant="ghost" size="sm">Small Ghost</Button>
```

### Cards
```tsx
// OLD (DaisyUI)
<div className="card bg-base-100 shadow">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>

// NEW (shadcn)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

### Inputs
```tsx
// OLD (DaisyUI)
<input className="input input-bordered" type="text" />

// NEW (shadcn)
import { Input } from "@/components/ui/input";

<Input type="text" />
```

### Badges/Tags
```tsx
// OLD (DaisyUI)
<span className="badge badge-success">Active</span>

// NEW (shadcn)
import { Badge } from "@/components/ui/badge";

<Badge variant="success">Active</Badge>
```

### Loading Spinners
```tsx
// OLD (DaisyUI)
<span className="loading loading-spinner loading-xs"></span>

// NEW (inline spinner or skeleton)
<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

// OR use Skeleton for content loading
import { Skeleton } from "@/components/ui/skeleton";
<Skeleton className="h-4 w-full" />
```

### Dividers
```tsx
// OLD (DaisyUI)
<div className="divider">OR</div>

// NEW (shadcn)
import { Separator } from "@/components/ui/separator";

<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <Separator />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">Or</span>
  </div>
</div>
```

### Alerts/Info Boxes
```tsx
// OLD (DaisyUI)
<div className="alert alert-info">
  <svg>...</svg>
  <span>Message</span>
</div>

// NEW (custom with tokens)
import { Info } from "lucide-react";

<div className="flex items-center gap-3 rounded-lg border border-[--info] bg-[--info]/10 p-4">
  <Info className="h-5 w-5 text-[--info]" />
  <p className="text-sm">Message</p>
</div>
```

## Color Class Replacements

### Background Colors
```tsx
// OLD
className="bg-base-100"    → className="bg-background"
className="bg-base-200"    → className="bg-muted"
className="bg-base-300"    → className="bg-muted"

// NEW (use semantic tokens)
className="bg-background"
className="bg-card"
className="bg-muted"
className="bg-primary"
```

### Text Colors
```tsx
// OLD
className="text-base-content"        → className="text-foreground"
className="text-base-content/70"     → className="text-muted-foreground"
className="text-error"               → className="text-destructive"

// NEW
className="text-foreground"
className="text-muted-foreground"
className="text-destructive"
className="text-[--success]"  // for status colors
```

### Border Colors
```tsx
// OLD
className="border-base-300"  → className="border-[--border]"

// NEW
className="border-[--border]"
className="border-[--input]"
```

## Layout Patterns

### Centered Container
```tsx
// OLD
<div className="min-h-screen flex items-center justify-center bg-base-200">
  <div className="card bg-base-100 max-w-lg">
    ...
  </div>
</div>

// NEW
<div className="flex min-h-screen items-center justify-center bg-background">
  <Card className="max-w-lg">
    ...
  </Card>
</div>
```

### Form Layout
```tsx
// OLD
<form className="form-control space-y-4">
  <input className="input input-bordered" />
  <button className="btn btn-primary">Submit</button>
</form>

// NEW
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

<form className="space-y-4">
  <Input />
  <Button type="submit">Submit</Button>
</form>
```

## Best Practices

1. **Always import from `/components/ui`**:
   ```tsx
   import { Button, Input, Card } from "@/components/ui";
   ```

2. **Use semantic tokens over hardcoded colors**:
   ```tsx
   // ❌ DON'T
   className="bg-zinc-900 text-white"
   
   // ✅ DO
   className="bg-card text-card-foreground"
   ```

3. **Test in light/dark modes**:
   - Visit `/dashboard/style-guide`
   - Toggle theme and verify your page looks correct

4. **Maintain accessibility**:
   - Keep semantic HTML (`<button>`, `<input>`, etc.)
   - Preserve ARIA labels and roles
   - Dual-ring focus is automatic (built into components)

5. **Loading states**:
   - Use `<Skeleton>` for layout loading
   - Use inline spinner for button loading
   - Example:
     ```tsx
     {isLoading ? <Skeleton className="h-10 w-full" /> : <YourContent />}
     ```

## Quick Checklist

When refactoring a page:

- [ ] Replace all `btn` classes with `<Button>`
- [ ] Replace all `card` classes with `<Card>` components
- [ ] Replace all `input` classes with `<Input>` components
- [ ] Replace `bg-base-*` with semantic tokens
- [ ] Replace `text-base-content` with `text-foreground`
- [ ] Remove `loading-spinner` in favor of inline spinner or skeleton
- [ ] Test page in light mode
- [ ] Test page in dark mode
- [ ] Test keyboard navigation (tab through elements)
- [ ] Verify no DaisyUI classes remain

## Guardrails

To prevent DaisyUI class reintroduction, run:

```bash
npm run check:no-daisyui
```

This script checks for:
- DaisyUI dependency in `package.json`
- DaisyUI plugin in CSS files
- Common DaisyUI class patterns (`bg-base-*`, `btn btn-`, `card card-`, etc.)

Run this before committing to ensure the codebase stays DaisyUI-free.

## Need Help?

- **Reference**: Visit `/dashboard/style-guide` for all components
- **Tokens**: Check `app/globals.css` for available CSS variables
- **Examples**: See refactored pages:
  - `app/signin/page.tsx`
  - `app/bridge/select/page.tsx`
  - `app/(user_dashboard)/dashboard/page.tsx`

