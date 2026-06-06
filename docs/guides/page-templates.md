# Page Templates

> **Lovable UI migration in progress.** Templates reflect current routes until Lovable port. Visual canon: [`DESIGN.md`](../../DESIGN.md) + [migration runbook](../plans/2026-06-01-lovable-ui-migration.md).

**Status:** Living templates for AI agents and developers
**Last Updated:** January 2026
**Purpose:** Provide skeleton templates for common page types

---

## Template Index

| Template | Use For | Header Type |
|----------|---------|-------------|
| [ListPage](#listpage-template) | Clients, Projects, Invoices | PageGreetingHeader |
| [DetailPage](#detailpage-template) | Client detail, Project detail | PageHeader |
| [DashboardPage](#dashboardpage-template) | Overview, Analytics | PageGreetingHeader |
| [FormPage](#formpage-template) | New/Edit forms | PageHeader |
| [SettingsPage](#settingspage-template) | Settings sections | PageHeader |

---

## ListPage Template

**Use for:** Clients list, Projects list, Invoices list, any collection

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageGreetingHeader (animated greeting + subtitle)           │
├─────────────────────────────────────────────────────────────┤
│ FilterBar (search + filters + actions)                      │
├─────────────────────────────────────────────────────────────┤
│ Content:                                                    │
│ ├── Loading: Skeleton                                       │
│ ├── Empty: EmptyState                                       │
│ └── Data: Table or Card Grid                                │
└─────────────────────────────────────────────────────────────┘
```

### Server Component (page.tsx)

```tsx
import { Suspense } from "react"
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header"
import { getSession } from "@/app/_features/auth/queries"
import { ClientsContent } from "./ClientsContent"
import { ClientsSkeleton } from "./ClientsSkeleton"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const session = await getSession()

  return (
    <div className="space-y-6">
      {/* Animated greeting header */}
      <PageGreetingHeader
        page="clients"
        viewer={{ firstName: session?.user?.name?.split(" ")[0] }}
        variant="dashboard"
        mode="greeting"
      />

      {/* Content with loading state */}
      <Suspense fallback={<ClientsSkeleton />}>
        <ClientsContent />
      </Suspense>
    </div>
  )
}
```

### Content Component (ClientsContent.tsx)

```tsx
import { getStudioContext } from "@/app/_lib/utils/user-dashboard"
import { FilterBar, EmptyState } from "@repo/patterns"
import { ClientsTable } from "./ClientsTable"
import { ClientsToolbar } from "./ClientsToolbar"
import { Button } from "@repo/ui"
import { UserPlus } from "lucide-react"
import Link from "next/link"

export async function ClientsContent() {
  const { studio, supabase } = await getStudioContext()

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("studio_id", studio.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error("Failed to load clients")
  }

  if (!clients || clients.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus className="size-12" />}
        title="No clients yet"
        description="Add your first client to start managing projects and invoices."
        action={
          <Button asChild>
            <Link href="/dashboard/clients/new">Add Client</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <ClientsToolbar />
      <ClientsTable clients={clients} />
    </div>
  )
}
```

### Skeleton Component (ClientsSkeleton.tsx)

```tsx
import { Skeleton } from "@repo/ui"

export function ClientsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex gap-8">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0">
            <div className="flex gap-8">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## DetailPage Template

**Use for:** Client detail, Project detail, Invoice detail

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader (entity name + breadcrumb + actions)             │
├─────────────────────────────────────────────────────────────┤
│ Overview Section:                                           │
│ ├── Primary info card                                       │
│ └── Secondary info card                                     │
├─────────────────────────────────────────────────────────────┤
│ Tabs (optional):                                            │
│ ├── Overview                                                │
│ ├── Related entities                                        │
│ └── Activity                                                │
└─────────────────────────────────────────────────────────────┘
```

### Server Component (page.tsx)

```tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { getStudioContext } from "@/app/_lib/utils/user-dashboard"
import { PageHeader } from "@repo/patterns"
import { Button } from "@repo/ui"
import { ClientDetailTabs } from "./ClientDetailTabs"
import { ClientOverview } from "./ClientOverview"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const { studio, supabase } = await getStudioContext()

  // Fetch primary entity
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Fetch related data in parallel
  const [projectsResult, invoicesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bridge_invoices")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      {/* Header with entity name and actions */}
      <PageHeader
        title={client.name}
        description={client.contact_email || undefined}
        breadcrumbs={
          <Link
            href="/dashboard/clients"
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to Clients
          </Link>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clients/${id}/edit`}>Edit</Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/projects/new?client=${id}`}>
                New Project
              </Link>
            </Button>
          </div>
        }
        noBorder
      />

      {/* Overview cards */}
      <ClientOverview client={client} />

      {/* Tabbed content */}
      <ClientDetailTabs
        clientId={id}
        projects={projectsResult.data || []}
        invoices={invoicesResult.data || []}
      />
    </div>
  )
}
```

### Overview Component

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui"

interface ClientOverviewProps {
  client: Client
}

export function ClientOverview({ client }: ClientOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Primary info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.contact_email && (
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <a
                href={`mailto:${client.contact_email}`}
                className="text-primary hover:underline"
              >
                {client.contact_email}
              </a>
            </div>
          )}
          {client.contact_phone && (
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <a
                href={`tel:${client.contact_phone}`}
                className="text-primary hover:underline"
              >
                {client.contact_phone}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary info */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Created</div>
            <div>{new Date(client.created_at).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="capitalize">{client.lifecycle_stage}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## DashboardPage Template

**Use for:** Overview, Analytics, Insights

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageGreetingHeader (greeting + context-aware subtitle)      │
├─────────────────────────────────────────────────────────────┤
│ Stats Row (4 StatCards)                                     │
├─────────────────────────────────────────────────────────────┤
│ Bento Grid:                                                 │
│ ┌─────────────────┬─────────┬─────────┐                     │
│ │                 │ Widget  │ Widget  │                     │
│ │   Hero Widget   ├─────────┴─────────┤                     │
│ │   (2x2)         │                   │                     │
│ │                 │   Wide Widget     │                     │
│ ├─────────┬───────┤   (2x1)           │                     │
│ │ Widget  │Widget │                   │                     │
│ └─────────┴───────┴───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Server Component (page.tsx)

```tsx
import { Suspense } from "react"
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header"
import { getSession } from "@/app/_features/auth/queries"
import { DashboardStats } from "./DashboardStats"
import { DashboardWidgets } from "./DashboardWidgets"
import { DashboardSkeleton } from "./DashboardSkeleton"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()

  return (
    <div className="space-y-6">
      {/* Greeting header */}
      <PageGreetingHeader
        page="overview"
        viewer={{ firstName: session?.user?.name?.split(" ")[0] }}
        variant="dashboard"
        mode="greeting"
      />

      {/* Stats row */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Widgets grid */}
      <Suspense fallback={<WidgetsSkeleton />}>
        <DashboardWidgets />
      </Suspense>
    </div>
  )
}
```

### Stats Component

```tsx
import { StatCard } from "@repo/patterns"
import { Users, FolderKanban, DollarSign, TrendingUp } from "lucide-react"
import { getStudioContext } from "@/app/_lib/utils/user-dashboard"

export async function DashboardStats() {
  const { studio, supabase } = await getStudioContext()

  // Fetch stats in parallel
  const [clientsResult, projectsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact" })
      .eq("studio_id", studio.id),
    supabase
      .from("projects")
      .select("id", { count: "exact" })
      .eq("studio_id", studio.id)
      .eq("status", "active"),
  ])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Clients"
        value={clientsResult.count || 0}
        icon={<Users className="size-4" />}
      />
      <StatCard
        title="Active Projects"
        value={projectsResult.count || 0}
        icon={<FolderKanban className="size-4" />}
      />
      <StatCard
        title="Revenue (MTD)"
        value="$12,450"
        icon={<DollarSign className="size-4" />}
        trend={{ value: 12, direction: "up" }}
      />
      <StatCard
        title="Growth"
        value="23%"
        icon={<TrendingUp className="size-4" />}
        trend={{ value: 5, direction: "up" }}
      />
    </div>
  )
}
```

---

## FormPage Template

**Use for:** New entity, Edit entity

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader (action name + breadcrumb)                       │
├─────────────────────────────────────────────────────────────┤
│ Form Card:                                                  │
│ ├── Form fields                                             │
│ └── Action buttons (Cancel + Submit)                        │
└─────────────────────────────────────────────────────────────┘
```

### Server Component (page.tsx)

```tsx
import Link from "next/link"
import { PageHeader } from "@repo/patterns"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui"
import { CreateClientForm } from "./CreateClientForm"

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Client"
        description="Add a new client to your studio"
        breadcrumbs={
          <Link
            href="/dashboard/clients"
            className="hover:text-foreground"
          >
            ← Back to Clients
          </Link>
        }
        noBorder
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Enter the basic information for your new client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateClientForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Form Component (CreateClientForm.tsx)

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Button, Input, Textarea, Field } from "@repo/ui"
import { createClient } from "@/app/_features/relationships/actions"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CreateClientForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const result = await createClient(data)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Client created")
    router.push(`/dashboard/clients/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Client Name" error={errors.name?.message} required>
        <Input {...register("name")} placeholder="Acme Corporation" />
      </Field>

      <Field label="Email" error={errors.contact_email?.message}>
        <Input
          type="email"
          {...register("contact_email")}
          placeholder="contact@acme.com"
        />
      </Field>

      <Field label="Phone" error={errors.contact_phone?.message}>
        <Input
          type="tel"
          {...register("contact_phone")}
          placeholder="+1 (555) 123-4567"
        />
      </Field>

      <Field label="Notes" error={errors.notes?.message}>
        <Textarea
          {...register("notes")}
          placeholder="Additional notes about this client..."
          rows={3}
        />
      </Field>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create Client
        </Button>
      </div>
    </form>
  )
}
```

---

## SettingsPage Template

**Use for:** User settings, Workspace settings, Billing

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader (Settings section name)                          │
├─────────────────────────────────────────────────────────────┤
│ Settings Sections (stacked Cards):                          │
│ ├── Section 1 Card                                          │
│ ├── Section 2 Card                                          │
│ └── Danger Zone Card (destructive actions)                  │
└─────────────────────────────────────────────────────────────┘
```

### Server Component (page.tsx)

```tsx
import Link from "next/link"
import { PageHeader } from "@repo/patterns"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui"
import { Button, Input, Field, Switch } from "@repo/ui"
import { ProfileForm } from "./ProfileForm"
import { NotificationSettings } from "./NotificationSettings"
import { DeleteAccountSection } from "./DeleteAccountSection"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences"
        noBorder
      />

      <div className="space-y-6 max-w-2xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountSection />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### Settings Section Pattern

```tsx
"use client"

import { useState } from "react"
import { Switch, Label } from "@repo/ui"
import { updateNotificationSettings } from "@/app/_features/settings/actions"
import { toast } from "sonner"

interface NotificationSettingsProps {
  initialSettings: {
    emailNotifications: boolean
    projectUpdates: boolean
    marketingEmails: boolean
  }
}

export function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  async function handleChange(key: keyof typeof settings, value: boolean) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setIsSaving(true)

    const result = await updateNotificationSettings(newSettings)

    if (result.error) {
      // Revert on error
      setSettings(settings)
      toast.error("Failed to save settings")
    }

    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive email notifications for important updates.
          </p>
        </div>
        <Switch
          checked={settings.emailNotifications}
          onCheckedChange={(v) => handleChange("emailNotifications", v)}
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Project Updates</Label>
          <p className="text-sm text-muted-foreground">
            Get notified when projects are updated.
          </p>
        </div>
        <Switch
          checked={settings.projectUpdates}
          onCheckedChange={(v) => handleChange("projectUpdates", v)}
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Marketing Emails</Label>
          <p className="text-sm text-muted-foreground">
            Receive tips and product updates.
          </p>
        </div>
        <Switch
          checked={settings.marketingEmails}
          onCheckedChange={(v) => handleChange("marketingEmails", v)}
          disabled={isSaving}
        />
      </div>
    </div>
  )
}
```

---

## Template Selection Checklist

When creating a new page, ask:

1. **Is this showing a list of items?** → ListPage
2. **Is this showing details of one item?** → DetailPage
3. **Is this an overview/analytics view?** → DashboardPage
4. **Is this for creating/editing?** → FormPage
5. **Is this for configuration?** → SettingsPage

Then customize:
- Header type (PageGreetingHeader vs PageHeader)
- Content structure (Cards, Tables, Grids)
- Loading states (Skeleton matching layout)
- Empty states (EmptyState with action)
- Error handling (error.tsx boundary)
