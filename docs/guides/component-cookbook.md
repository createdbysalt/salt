# Component Cookbook

> **Lovable UI migration in progress.** Examples may reflect the current app until port waves land. Visual canon: [`DESIGN.md`](../../DESIGN.md) + [migration runbook](../plans/2026-06-01-lovable-ui-migration.md).

**Status:** Living examples for AI agents and developers
**Last Updated:** January 2026
**Purpose:** Show HOW to use components in real scenarios

---

## Recipe Categories

1. [Data Display Patterns](#data-display-patterns)
2. [Form Patterns](#form-patterns)
3. [Loading & Error States](#loading--error-states)
4. [Navigation Patterns](#navigation-patterns)
5. [Action Patterns](#action-patterns)
6. [Layout Patterns](#layout-patterns)

---

## Data Display Patterns

### Recipe: Data Table with Actions

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@repo/ui"
import { Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@repo/ui"
import { MoreHorizontal } from "lucide-react"

function ClientsTable({ clients }: { clients: Client[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell>{client.email}</TableCell>
            <TableCell>
              <Badge variant={client.status === "active" ? "default" : "secondary"}>
                {client.status}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Recipe: Card Grid

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui"
import { Button, Badge } from "@repo/ui"
import Link from "next/link"

function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>{project.client.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge>{project.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {project.tasks.length} tasks
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/work/${project.id}`}>
                View Project →
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
```

### Recipe: Stat Cards Row

```tsx
import { StatCard } from "@repo/patterns"
import { Users, FolderKanban, DollarSign, TrendingUp } from "lucide-react"

function DashboardStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Clients"
        value={stats.clientCount}
        icon={<Users className="size-4" />}
        trend={stats.clientTrend}
      />
      <StatCard
        title="Active Projects"
        value={stats.projectCount}
        icon={<FolderKanban className="size-4" />}
      />
      <StatCard
        title="Revenue (MTD)"
        value={`$${stats.revenue.toLocaleString()}`}
        icon={<DollarSign className="size-4" />}
        trend={stats.revenueTrend}
      />
      <StatCard
        title="Growth"
        value={`${stats.growth}%`}
        icon={<TrendingUp className="size-4" />}
      />
    </div>
  )
}
```

### Recipe: Detail Page with Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui"
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui"
import { PageHeader } from "@repo/patterns"

function ClientDetailPage({ client }: { client: Client }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.email}
        breadcrumbs={
          <Link href="/people" className="hover:text-foreground">
            ← Back to Clients
          </Link>
        }
        actions={
          <Button asChild>
            <Link href={`/people/${client.id}/edit`}>
              Edit Client
            </Link>
          </Button>
        }
        noBorder
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Contact details */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Stats */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {/* Projects list */}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          {/* Invoices list */}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          {/* Activity feed */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Form Patterns

### Recipe: Simple Form with Validation

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button, Input, Textarea, Field } from "@repo/ui"
import { Loader2 } from "lucide-react"
import { updatePerson } from "@/app/_features/people/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CreateProjectForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const result = await createProject({ ...data, clientId })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Project created")
    router.push(`/work/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Project Name" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Website Redesign" />
      </Field>

      <Field label="Description" error={errors.description?.message}>
        <Textarea
          {...register("description")}
          placeholder="Brief description of the project..."
          rows={3}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Create Project
        </Button>
      </div>
    </form>
  )
}
```

### Recipe: Form in Sheet (Side Panel)

```tsx
"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@repo/ui"
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Field } from "@repo/ui"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"

export function AddClientSheet() {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  async function onSubmit(data: any) {
    // Submit logic
    setOpen(false)
    reset()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4 mr-2" />
        Add Client
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add New Client</SheetTitle>
            <SheetDescription>
              Enter the client's information below.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <Field label="Client Name">
              <Input {...register("name")} />
            </Field>

            <Field label="Email">
              <Input type="email" {...register("email")} />
            </Field>

            <Field label="Type">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Client</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

### Recipe: Inline Edit Pattern

```tsx
"use client"

import { useState } from "react"
import { Input, Button } from "@repo/ui"
import { Check, X, Pencil } from "lucide-react"

interface InlineEditProps {
  value: string
  onSave: (value: string) => Promise<void>
}

export function InlineEdit({ value, onSave }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    await onSave(editValue)
    setIsSaving(false)
    setIsEditing(false)
  }

  function handleCancel() {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-8"
          autoFocus
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={handleCancel}>
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <span>{value}</span>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Pencil className="size-3" />
      </Button>
    </div>
  )
}
```

---

## Loading & Error States

### Recipe: Page with Suspense

```tsx
// page.tsx (Server Component)
import { Suspense } from "react"
import { PageHeader } from "@repo/patterns"
import { ClientListSkeleton } from "./ClientListSkeleton"
import { ClientList } from "./ClientList"

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" />

      <Suspense fallback={<ClientListSkeleton />}>
        <ClientList />
      </Suspense>
    </div>
  )
}
```

### Recipe: Skeleton Matching Content

```tsx
import { Skeleton } from "@repo/ui"

export function ClientListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg">
        {/* Header */}
        <div className="flex gap-4 p-4 border-b">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Recipe: Empty State with Action

```tsx
import { EmptyState } from "@repo/patterns"
import { Button } from "@repo/ui"
import { FolderPlus } from "lucide-react"
import Link from "next/link"

export function ProjectsEmptyState({ clientId }: { clientId: string }) {
  return (
    <EmptyState
      icon={<FolderPlus className="size-12" />}
      title="No projects yet"
      description="Create your first project for this client to start tracking work."
      action={
        <Button asChild>
          <Link href={`/work/new?client=${clientId}`}>
            Create Project
          </Link>
        </Button>
      }
    />
  )
}
```

### Recipe: Error State with Retry

```tsx
"use client"

import { EmptyState } from "@repo/patterns"
import { Button } from "@repo/ui"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorStateProps {
  error: Error
  reset: () => void
}

export function ErrorState({ error, reset }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-12 text-destructive" />}
      title="Something went wrong"
      description={error.message || "Failed to load data. Please try again."}
      action={
        <Button onClick={reset} variant="outline">
          <RefreshCw className="size-4 mr-2" />
          Try Again
        </Button>
      }
    />
  )
}
```

---

## Navigation Patterns

### Recipe: Breadcrumb Navigation

```tsx
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-4" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

// Usage
<Breadcrumbs
  items={[
    { label: "Clients", href: "/people" },
    { label: "Acme Corp", href: "/people/123" },
    { label: "Knowledge Base" },
  ]}
/>
```

### Recipe: Tab Navigation with URL State

```tsx
"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui"

export function ClientTabs({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get("tab") || "overview"

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams)
    params.set("tab", tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={currentTab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Overview content */}
      </TabsContent>
      <TabsContent value="projects">
        {/* Projects content */}
      </TabsContent>
      <TabsContent value="invoices">
        {/* Invoices content */}
      </TabsContent>
    </Tabs>
  )
}
```

---

## Action Patterns

### Recipe: Confirmation Dialog

```tsx
"use client"

import { useState } from "react"
import { ConfirmDialog } from "@repo/patterns"
import { Button } from "@repo/ui"
import { Trash2 } from "lucide-react"
import { deletePerson } from "@/app/_features/people/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteProject(projectId)

    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
      return
    }

    toast.success("Project deleted")
    router.push("/work")
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4 mr-2" />
        Delete Project
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Project"
        description="This action cannot be undone. All tasks and files associated with this project will be permanently deleted."
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />
    </>
  )
}
```

### Recipe: Optimistic Update

```tsx
"use client"

import { useOptimistic, useTransition } from "react"
import { Button } from "@repo/ui"
import { Star } from "lucide-react"
import { updatePerson } from "@/app/_features/people/actions"
import { toast } from "sonner"

interface FavoriteButtonProps {
  projectId: string
  isFavorite: boolean
}

export function FavoriteButton({ projectId, isFavorite }: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite)

  function handleToggle() {
    startTransition(async () => {
      // Optimistic update
      setOptimisticFavorite(!optimisticFavorite)

      // Server action
      const result = await toggleFavorite(projectId)

      if (result.error) {
        // Revert on error (optimistic will reset on next render)
        toast.error("Failed to update favorite")
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      <Star
        className={cn(
          "size-4",
          optimisticFavorite && "fill-yellow-400 text-yellow-400"
        )}
      />
    </Button>
  )
}
```

### Recipe: Toolbar with Actions

```tsx
import { FilterBar } from "@repo/patterns"
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui"
import { Download, Plus } from "lucide-react"

interface ProjectToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
}

export function ProjectToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: ProjectToolbarProps) {
  return (
    <FilterBar
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search projects..."
      filters={
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="size-4 mr-2" />
            New Project
          </Button>
        </div>
      }
    />
  )
}
```

---

## Layout Patterns

### Recipe: Two-Column Layout

```tsx
export function TwoColumnLayout({
  main,
  sidebar,
}: {
  main: React.ReactNode
  sidebar: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div>{main}</div>
      <div className="space-y-6">{sidebar}</div>
    </div>
  )
}

// Usage
<TwoColumnLayout
  main={<ProjectDetails project={project} />}
  sidebar={
    <>
      <ProjectStatusCard status={project.status} />
      <ProjectActivityFeed projectId={project.id} />
    </>
  }
/>
```

### Recipe: Bento Grid

```tsx
export function BentoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  )
}

export function BentoCard({
  children,
  span = 1,
}: {
  children: React.ReactNode
  span?: 1 | 2
}) {
  return (
    <Card className={cn(span === 2 && "md:col-span-2")}>
      {children}
    </Card>
  )
}

// Usage
<BentoGrid>
  <BentoCard span={2}>
    <RevenueChart />
  </BentoCard>
  <BentoCard>
    <ClientCount />
  </BentoCard>
  <BentoCard>
    <ProjectCount />
  </BentoCard>
  <BentoCard span={2}>
    <RecentActivity />
  </BentoCard>
</BentoGrid>
```

---

## Quick Copy Patterns

### Toast Notifications

```tsx
import { toast } from "sonner"

// Success
toast.success("Project created successfully")

// Error
toast.error("Failed to save changes")

// With description
toast.success("Project created", {
  description: "You can now add tasks to your project",
})

// With action
toast("Project archived", {
  action: {
    label: "Undo",
    onClick: () => restoreProject(id),
  },
})
```

### cn() Class Merging

```tsx
import { cn } from "@repo/utils"

// Conditional classes
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "large" && "large-classes"
)} />

// Props override
<Button className={cn(buttonVariants({ variant }), className)} />
```

### Link as Button

```tsx
import { Button } from "@repo/ui"
import Link from "next/link"

<Button asChild>
  <Link href="/work/new">New Project</Link>
</Button>
```
