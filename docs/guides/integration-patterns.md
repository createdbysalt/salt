# Integration Patterns

**Status:** Living patterns for AI agents and developers
**Last Updated:** January 2026
**Purpose:** Show how components integrate with Next.js, Server Actions, and React patterns

---

## Pattern Index

1. [Server Actions + Forms](#server-actions--forms)
2. [Suspense + Streaming](#suspense--streaming)
3. [Optimistic Updates](#optimistic-updates)
4. [URL State Management](#url-state-management)
5. [Real-time Updates](#real-time-updates)
6. [Error Boundaries](#error-boundaries)

---

## Server Actions + Forms

### Pattern: Form with Server Action

Server Actions are the preferred way to handle mutations in SALT.

```tsx
// app/_features/clients/actions.ts
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/libs/supabase/server"
import { getSession } from "@/app/_features/auth/queries"

const CreateClientSchema = z.object({
  name: z.string().min(1).max(100),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof CreateClientSchema>

export async function createClient(input: CreateClientInput) {
  try {
    // 1. Validate input
    const data = CreateClientSchema.parse(input)

    // 2. Check auth
    const session = await getSession()
    if (!session) {
      return { error: "Unauthorized" }
    }

    // 3. Get studio context
    const supabase = await createServerClient()
    const { data: studio } = await supabase
      .from("studios")
      .select("id")
      .eq("owner_id", session.user.id)
      .single()

    if (!studio) {
      return { error: "Studio not found" }
    }

    // 4. Perform mutation
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        ...data,
        studio_id: studio.id,
        contact_email: data.contact_email || null,
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    // 5. Revalidate cache
    revalidatePath("/dashboard/clients")

    return { data: client }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: "An unexpected error occurred" }
  }
}
```

### Pattern: Client Form Component

```tsx
// app/(user_dashboard)/dashboard/clients/new/CreateClientForm.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button, Input, Field } from "@repo/ui"
import { createClient, type CreateClientInput } from "@/app/_features/relationships/actions"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
})

export function CreateClientForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: CreateClientInput) {
    startTransition(async () => {
      const result = await createClient(data)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Client created")
      router.push(`/dashboard/clients/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Client Name" error={errors.name?.message} required>
        <Input {...register("name")} placeholder="Acme Corporation" />
      </Field>

      <Field label="Email" error={errors.contact_email?.message}>
        <Input type="email" {...register("contact_email")} />
      </Field>

      <Field label="Phone" error={errors.contact_phone?.message}>
        <Input type="tel" {...register("contact_phone")} />
      </Field>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          Create Client
        </Button>
      </div>
    </form>
  )
}
```

### Pattern: Inline Action (no form)

```tsx
"use client"

import { useTransition } from "react"
import { Button } from "@repo/ui"
import { archiveProject } from "@/app/_features/projects/actions"
import { toast } from "sonner"

export function ArchiveButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveProject(projectId)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Project archived")
    })
  }

  return (
    <Button
      variant="outline"
      onClick={handleArchive}
      loading={isPending}
    >
      Archive
    </Button>
  )
}
```

---

## Suspense + Streaming

### Pattern: Page with Streaming Sections

```tsx
// page.tsx (Server Component)
import { Suspense } from "react"
import { PageHeader } from "@repo/patterns"
import { ProjectOverview } from "./ProjectOverview"
import { ProjectTasks } from "./ProjectTasks"
import { ProjectActivity } from "./ProjectActivity"
import { OverviewSkeleton, TasksSkeleton, ActivitySkeleton } from "./skeletons"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="space-y-6">
      {/* Static header - renders immediately */}
      <PageHeader title="Project" noBorder />

      {/* Stream sections independently */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - higher priority */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<OverviewSkeleton />}>
            <ProjectOverview id={id} />
          </Suspense>

          <Suspense fallback={<TasksSkeleton />}>
            <ProjectTasks id={id} />
          </Suspense>
        </div>

        {/* Sidebar - lower priority */}
        <div>
          <Suspense fallback={<ActivitySkeleton />}>
            <ProjectActivity id={id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
```

### Pattern: Async Server Component

```tsx
// ProjectOverview.tsx (Server Component)
import { getStudioContext } from "@/app/_lib/utils/user-dashboard"
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui"

export async function ProjectOverview({ id }: { id: string }) {
  const { supabase } = await getStudioContext()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("id", id)
    .single()

  if (error || !project) {
    throw new Error("Failed to load project")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{project.description}</p>
        <div className="mt-4">
          <span className="text-sm text-muted-foreground">Client: </span>
          <span>{project.clients?.name}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Pattern: Skeleton That Matches Content

```tsx
// skeletons.tsx
import { Skeleton } from "@repo/ui"
import { Card, CardHeader, CardContent } from "@repo/ui"

export function OverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TasksSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

---

## Optimistic Updates

### Pattern: useOptimistic with Server Action

```tsx
"use client"

import { useOptimistic, useTransition } from "react"
import { Button } from "@repo/ui"
import { Star } from "lucide-react"
import { toggleFavorite } from "@/app/_features/projects/actions"
import { toast } from "sonner"
import { cn } from "@repo/utils"

interface FavoriteButtonProps {
  projectId: string
  isFavorite: boolean
}

export function FavoriteButton({ projectId, isFavorite }: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite)

  function handleToggle() {
    startTransition(async () => {
      // Optimistic update - happens immediately
      setOptimisticFavorite(!optimisticFavorite)

      // Server action
      const result = await toggleFavorite(projectId)

      if (result.error) {
        // UI will revert automatically on next render
        toast.error("Failed to update")
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "size-4 transition-colors",
          optimisticFavorite && "fill-yellow-400 text-yellow-400"
        )}
      />
    </Button>
  )
}
```

### Pattern: Optimistic List Updates

```tsx
"use client"

import { useOptimistic, useTransition } from "react"
import { Card } from "@repo/ui"
import { deleteTask } from "@/app/_features/tasks/actions"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  completed: boolean
}

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks,
    (state, deletedId: string) => state.filter(t => t.id !== deletedId)
  )

  function handleDelete(taskId: string) {
    startTransition(async () => {
      // Optimistic removal
      updateOptimisticTasks(taskId)

      // Server action
      const result = await deleteTask(taskId)

      if (result.error) {
        toast.error("Failed to delete task")
        // State will revert on next render
      }
    })
  }

  return (
    <div className="space-y-2">
      {optimisticTasks.map((task) => (
        <Card key={task.id} className="p-4 flex justify-between items-center">
          <span>{task.title}</span>
          <button
            onClick={() => handleDelete(task.id)}
            className="text-destructive hover:underline text-sm"
            disabled={isPending}
          >
            Delete
          </button>
        </Card>
      ))}
    </div>
  )
}
```

---

## URL State Management

### Pattern: Filters in URL

```tsx
"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@repo/ui"
import { FilterBar } from "@repo/patterns"

export function ClientsToolbar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || "all"

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return (
    <FilterBar
      searchValue={search}
      onSearchChange={(value) => updateParams({ search: value })}
      searchPlaceholder="Search clients..."
      filters={
        <Select
          value={status}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  )
}
```

### Pattern: Tab State in URL

```tsx
"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui"

export function ClientDetailTabs({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get("tab") || "overview"

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams)
    if (tab === "overview") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {/* ... */}
      </TabsContent>
      {/* ... other tabs */}
    </Tabs>
  )
}
```

---

## Real-time Updates

### Pattern: Supabase Realtime Subscription

```tsx
"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card } from "@repo/ui"

interface Message {
  id: string
  content: string
  created_at: string
  sender_name: string
}

export function MessageList({
  conversationId,
  initialMessages,
}: {
  conversationId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <Card key={message.id} className="p-4">
          <div className="font-medium">{message.sender_name}</div>
          <div className="text-muted-foreground">{message.content}</div>
        </Card>
      ))}
    </div>
  )
}
```

### Pattern: Polling for Updates

```tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@repo/ui"
import { getUnreadCount } from "@/app/_features/messaging/actions"

export function UnreadBadge({ conversationId }: { conversationId: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Initial fetch
    getUnreadCount(conversationId).then((result) => {
      if (result.data) setCount(result.data)
    })

    // Poll every 30 seconds
    const interval = setInterval(async () => {
      const result = await getUnreadCount(conversationId)
      if (result.data) setCount(result.data)
    }, 30000)

    return () => clearInterval(interval)
  }, [conversationId])

  if (count === 0) return null

  return (
    <Badge variant="destructive" className="ml-2">
      {count}
    </Badge>
  )
}
```

---

## Error Boundaries

### Pattern: Route Error Boundary

```tsx
// app/(user_dashboard)/dashboard/clients/error.tsx
"use client"

import { useEffect } from "react"
import { EmptyState } from "@repo/patterns"
import { Button } from "@repo/ui"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error(error)
  }, [error])

  return (
    <EmptyState
      icon={<AlertCircle className="size-12 text-destructive" />}
      title="Failed to load clients"
      description={error.message || "Something went wrong. Please try again."}
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

### Pattern: Not Found Page

```tsx
// app/(user_dashboard)/dashboard/clients/[id]/not-found.tsx
import { EmptyState } from "@repo/patterns"
import { Button } from "@repo/ui"
import { FileQuestion } from "lucide-react"
import Link from "next/link"

export default function ClientNotFound() {
  return (
    <EmptyState
      icon={<FileQuestion className="size-12" />}
      title="Client not found"
      description="The client you're looking for doesn't exist or has been deleted."
      action={
        <Button asChild>
          <Link href="/dashboard/clients">Back to Clients</Link>
        </Button>
      }
    />
  )
}
```

### Pattern: Loading State

```tsx
// app/(user_dashboard)/dashboard/clients/loading.tsx
import { PageHeader } from "@repo/patterns"
import { Skeleton } from "@repo/ui"

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" noBorder />

      <div className="space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Table skeleton */}
        <div className="border rounded-lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border-b last:border-0">
              <div className="flex gap-8">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Quick Reference: When to Use What

| Scenario | Pattern |
|----------|---------|
| Form submission | Server Action + useTransition |
| Data fetching | Server Component + Suspense |
| Immediate feedback | useOptimistic |
| Shareable state (filters, tabs) | URL searchParams |
| Live updates | Supabase Realtime or polling |
| Failed data load | error.tsx boundary |
| Missing resource | not-found.tsx |
| Page loading | loading.tsx or Suspense |
