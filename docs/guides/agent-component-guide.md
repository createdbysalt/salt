# Agent Component Guide

**Status:** AI-optimized reference for Claude Code and other AI agents
**Last Updated:** February 2026
**Purpose:** Provide structured context for AI agents building SALT UIs

---

## Quick Start for AI Agents

When building UI for SALT, follow this decision flow:

```
1. WHAT PAGE TYPE? → Use template from page-templates.md
2. WHICH HEADER? → PageGreetingHeader (list) or PageHeader (detail/form)
3. WHAT COMPONENTS? → Use vanilla shadcn from @repo/ui
4. LOADING STATE? → Skeleton for content, Loader2 icon for buttons
5. FORM HANDLING? → Server Action + React Hook Form + Zod
6. STYLING? → Semantic colors only (bg-primary, not bg-blue-500)
```

---

## Component Inventory (Copy-Paste Ready)

### Primitives (@repo/ui)

```tsx
// Layout & Containers
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@repo/ui"
import { Separator } from "@repo/ui"

// Buttons & Actions
import { Button } from "@repo/ui"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@repo/ui"

// Forms
import { Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui"
import { Checkbox, Switch, RadioGroup, RadioGroupItem, Label } from "@repo/ui"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui"

// Feedback
import { Badge } from "@repo/ui"
import { Skeleton } from "@repo/ui"
import { Alert, AlertTitle, AlertDescription } from "@repo/ui"
import { Progress } from "@repo/ui"
import { toast } from "sonner"  // For toasts

// Icons (from lucide-react, NOT @repo/ui)
import { Loader2, Check, X, ChevronDown } from "lucide-react"

// Overlays
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@repo/ui"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@repo/ui"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@repo/ui"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@repo/ui"

// Data Display
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@repo/ui"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui"
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@repo/ui"

// Navigation
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@repo/ui"
```

### Patterns (@repo/patterns)

```tsx
import { PageHeader } from "@repo/patterns"
import { FilterBar } from "@repo/patterns"
import { EmptyState } from "@repo/patterns"
import { ConfirmDialog } from "@repo/patterns"
import { AppShell } from "@repo/patterns"
```

### App Patterns (app/_components/patterns)

```tsx
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header"
```

---

## Decision Trees

### Which Header?

```
Is this a MAIN LIST PAGE (Clients, Projects, etc.)?
│
├── YES → PageGreetingHeader
│   <PageGreetingHeader
│     page="clients"  // or "projects", "overview", etc.
│     viewer={{ firstName: "Name" }}
│     variant="dashboard"
│     mode="greeting"
│   />
│
└── NO → PageHeader
    <PageHeader
      title="Page Title"
      description="Optional description"
      breadcrumbs={<Link>← Back</Link>}
      actions={<Button>Action</Button>}
      noBorder
    />
```

### Which Button Variant?

```
Is this the MAIN CTA for the view?
├── YES → variant="default" (max 1 per view)
│
└── NO → What's the purpose?
    ├── Secondary emphasis → variant="outline"
    ├── Tertiary/navigation → variant="ghost"
    ├── Destructive action → variant="destructive"
    └── Inline link style → variant="link"
```

### Which Button Size?

```
Where is the button?
├── Page header/main action → size="default" (40px)
├── Toolbar/filter bar → size="sm" (32px)
├── Table row action → size="icon" or size="sm"
├── Compact UI → size="sm" (32px)
└── Icon only → size="icon"
```

### Modal vs Sheet vs Page?

```
How many form fields?
├── 1-3 fields → Dialog
├── 4-8 fields → Sheet (slide-in panel)
└── 8+ fields → Dedicated page (FormPage template)

Is it a confirmation?
└── YES → AlertDialog (via ConfirmDialog pattern)
```

### Loading State?

```
What's loading?
├── Page content → Skeleton matching layout
├── Button action → disabled + Loader2 icon
├── Background task → toast notification
└── Async with immediate feedback → Optimistic update
```

---

## Code Templates

### Server Component Page

```tsx
// page.tsx
import { Suspense } from "react"
import { PageHeader } from "@repo/patterns"
import { ContentSection } from "./ContentSection"
import { ContentSkeleton } from "./ContentSkeleton"

export const dynamic = "force-dynamic"

export default async function ExamplePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Page Title" noBorder />

      <Suspense fallback={<ContentSkeleton />}>
        <ContentSection />
      </Suspense>
    </div>
  )
}
```

### Form with Server Action

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button, Input, Label } from "@repo/ui"
import { Loader2 } from "lucide-react"
import { someAction } from "@/app/_features/feature/actions"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(1, "Required"),
})

type FormData = z.infer<typeof schema>

export function ExampleForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await someAction(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Success")
      router.push("/dashboard/somewhere")
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Submit
        </Button>
      </div>
    </form>
  )
}
```

### Server Action

```tsx
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/libs/supabase/server"
import { getSession } from "@/app/_features/auth/queries"

const InputSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function someAction(input: z.infer<typeof InputSchema>) {
  try {
    const data = InputSchema.parse(input)

    const session = await getSession()
    if (!session) return { error: "Unauthorized" }

    const supabase = await createServerClient()
    const { data: result, error } = await supabase
      .from("table")
      .insert({ ...data })
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath("/dashboard/path")
    return { data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: "An error occurred" }
  }
}
```

### List Page with Filters

```tsx
// page.tsx
import { Suspense } from "react"
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header"
import { getSession } from "@/app/_features/auth/queries"
import { ItemsList } from "./ItemsList"
import { ItemsSkeleton } from "./ItemsSkeleton"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
  const session = await getSession()

  return (
    <div className="space-y-6">
      <PageGreetingHeader
        page="items"
        viewer={{ firstName: session?.user?.name?.split(" ")[0] }}
        variant="dashboard"
        mode="greeting"
      />

      <Suspense fallback={<ItemsSkeleton />}>
        <ItemsList />
      </Suspense>
    </div>
  )
}

// ItemsList.tsx
import { getStudioContext } from "@/app/_lib/utils/user-dashboard"
import { FilterBar, EmptyState } from "@repo/patterns"
import { ItemsTable } from "./ItemsTable"
import { ItemsToolbar } from "./ItemsToolbar"
import { Button } from "@repo/ui"
import { Plus } from "lucide-react"
import Link from "next/link"

export async function ItemsList() {
  const { studio, supabase } = await getStudioContext()

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false })

  if (!items?.length) {
    return (
      <EmptyState
        icon={<Plus className="size-12" />}
        title="No items yet"
        description="Create your first item to get started."
        action={
          <Button asChild>
            <Link href="/dashboard/items/new">Create Item</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <ItemsToolbar />
      <ItemsTable items={items} />
    </div>
  )
}
```

---

## Anti-Patterns to Avoid

### Never Do This

```tsx
// ❌ Raw Tailwind colors (ESLint will catch)
<div className="bg-blue-500 text-white">

// ❌ Custom inline header styles
<h1 className="text-3xl font-bold">

// ❌ Using loading prop on Button (doesn't exist in shadcn)
<Button loading={isPending}>Submit</Button>

// ❌ Multiple primary buttons
<Button>Save</Button>
<Button>Continue</Button>

// ❌ useEffect for data fetching
useEffect(() => {
  fetch("/api/data")...
}, [])

// ❌ Modal for complex forms
<Dialog>
  <form with 15 fields />
</Dialog>

// ❌ API routes for mutations
// app/api/create-project/route.ts
```

### Always Do This

```tsx
// ✅ Semantic colors
<div className="bg-primary text-primary-foreground">

// ✅ Standard header components
<PageHeader title="Page Title" />

// ✅ Button with loading state (Loader2 icon)
<Button disabled={isPending}>
  {isPending && <Loader2 className="size-4 animate-spin" />}
  Submit
</Button>

// ✅ Skeleton for loading
<Suspense fallback={<ContentSkeleton />}>

// ✅ Button hierarchy
<Button>Primary Action</Button>
<Button variant="outline">Secondary</Button>

// ✅ Server Components for data
export default async function Page() {
  const data = await fetchData()
}

// ✅ Sheet for complex forms
<Sheet>
  <form with many fields />
</Sheet>

// ✅ Server Actions for mutations
// app/_features/projects/actions.ts
export async function createProject() {}
```

---

## Semantic Color Reference (v2 Design System)

### Surface & Text Tokens

| Color Token | Use For |
|-------------|---------|
| `bg-background` | Page background (#FAFAFA light-first) |
| `bg-card` | Card/container background |
| `bg-muted` | Subtle backgrounds, hover states |
| `bg-primary` | Primary buttons, active states |
| `bg-secondary` | Secondary buttons |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text, labels |
| `text-primary` | Links, accent text |
| `border-border` | Default borders |
| `border-input` | Form input borders |

### Status Tokens (v2 Semantic Colors)

**Never use raw Tailwind colors. Use these semantic tokens instead:**

| Raw Tailwind | Semantic Token | Use For |
|--------------|----------------|---------|
| `green-500/600` | `success` | Active, completed, positive |
| `amber-500/600` | `warning` | On-hold, pending, caution |
| `blue-500/600` | `info` | Informational, prospect, links |
| `red-500/600` | `destructive` | Error, danger, lost, high priority |
| `purple-500/600` | `accent` | Partner, meeting, highlight |

**Usage patterns:**
```tsx
// ✅ Correct (semantic tokens)
<Badge className="bg-success/10 text-success">Active</Badge>
<Badge className="bg-warning/10 text-warning">Pending</Badge>
<Badge className="bg-info/10 text-info">Prospect</Badge>
<Badge className="bg-destructive/10 text-destructive">Error</Badge>
<Badge className="bg-accent/10 text-accent">Partner</Badge>

// ❌ Wrong (raw Tailwind colors)
<Badge className="bg-green-100 text-green-600">Active</Badge>
<Badge className="bg-amber-100 text-amber-600">Pending</Badge>
```

### v2 Design Principles

| Principle | What to Do |
|-----------|------------|
| **Light-first** | Default to light theme, dark mode is accessibility option |
| **Sharp corners** | Use 0px radius (components already updated) |
| **Border elevation** | Use `border` not `shadow` for depth |
| **OKLCH colors** | Tokens use OKLCH format in `app/tailwind-base.css` |

---

## File Organization

```
app/(user_dashboard)/dashboard/feature/
├── page.tsx              # Server Component entry
├── FeatureContent.tsx    # Async data fetching
├── FeatureToolbar.tsx    # Client: filters/search
├── FeatureTable.tsx      # Presentational
├── FeatureSkeleton.tsx   # Loading state
├── error.tsx             # Error boundary
├── not-found.tsx         # 404 state
└── loading.tsx           # Route loading (optional)

app/_features/feature/
├── actions.ts            # Server Actions
├── queries.ts            # Data fetching (optional)
├── components/           # Shared feature components
├── hooks/                # Client hooks (optional)
└── types.ts              # Feature types (optional)
```

---

## Checklist Before Submitting Code

- [ ] Using correct header (PageGreetingHeader vs PageHeader)
- [ ] Only one primary Button per view
- [ ] Skeleton matches final content layout
- [ ] No raw Tailwind colors (bg-blue-500, text-red-600)
- [ ] Forms use Server Actions (not API routes)
- [ ] Loading states use Suspense + Skeleton (content) or Loader2 (buttons)
- [ ] Empty states use EmptyState component
- [ ] Errors handled with error.tsx or toast
- [ ] URLs are shareable (filters in searchParams)
- [ ] Imports from @repo/ui and @repo/patterns
