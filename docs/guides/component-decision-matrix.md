# Component Decision Matrix

> **Lovable UI migration in progress.** Component choices stay `@repo/ui`-first; visual rules follow [`DESIGN.md`](../../DESIGN.md) when populated. See [migration runbook](../plans/2026-06-01-lovable-ui-migration.md).

**Status:** Living document for AI agents and developers
**Last Updated:** January 2026
**Purpose:** Answer "WHEN do I use this component?"

---

## Quick Reference: The Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT ARE YOU BUILDING?                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  A PAGE?                                                        │
│  ├── List page (Clients, Projects) → ListPage template          │
│  ├── Detail page (Client detail) → DetailPage template          │
│  ├── Dashboard (Overview) → DashboardPage template              │
│  ├── Form (New/Edit) → FormPage template                        │
│  └── Settings → SettingsPage template                           │
│                                                                 │
│  A SECTION?                                                     │
│  ├── Group of related content → Card                            │
│  ├── Data with rows → Table                                     │
│  ├── Filterable list → FilterBar + content                      │
│  ├── Empty state → EmptyState                                   │
│  └── Statistics → StatCard                                      │
│                                                                 │
│  AN ACTION?                                                     │
│  ├── Primary CTA (one per view) → Button default                │
│  ├── Secondary action → Button variant="outline"                │
│  ├── Tertiary/navigation → Button variant="ghost"               │
│  ├── Destructive (delete) → Button variant="destructive"        │
│  └── In toolbar → Button size="toolbar"                         │
│                                                                 │
│  FEEDBACK?                                                      │
│  ├── Loading state → Skeleton (not Spinner)                     │
│  ├── Success/error toast → sonner toast()                       │
│  ├── Inline error → Field with error prop                       │
│  └── Empty data → EmptyState                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Primitives (packages/ui)

Atomic building blocks. Never use directly for layouts—compose into patterns.

### Button

| Use When | Variant | Size |
|----------|---------|------|
| Main page CTA (max 1 per view) | `default` | `default` (40px) |
| Secondary action beside CTA | `outline` | `default` |
| Navigation, tertiary action | `ghost` | `default` |
| Destructive action (delete, remove) | `destructive` | `default` |
| Toolbar/filter buttons | `ghost` or `outline` | `toolbar` (28px) |
| Icon-only button | Any | `icon`, `icon-sm`, `icon-toolbar` |
| In-table actions | `ghost` | `icon-sm` |
| Form submit with loading | `default` + `loading` prop | `default` |

**Anti-patterns:**
- ❌ Multiple `default` buttons in same view (use hierarchy)
- ❌ `destructive` for non-destructive actions
- ❌ Custom button styling (use variants)

### Card

| Use When | Props |
|----------|-------|
| Grouping related content | Default |
| Smaller info cards | `size="sm"` |
| Interactive cards (clickable) | Add `className="card-linear"` |
| Settings sections | Default with `CardHeader` + `CardContent` |

**Compound Components:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
    <CardAction>{/* Optional action button */}</CardAction>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Optional footer with actions */}
  </CardFooter>
</Card>
```

### Badge

| Use When | Variant |
|----------|---------|
| Status indicator (active, pending) | `default` |
| Secondary/muted status | `secondary` |
| Outline for tags | `outline` |
| Destructive status (failed, error) | `destructive` |

### Input / Textarea / Select

| Use When | Component |
|----------|-----------|
| Single-line text | `Input` |
| Multi-line text | `Textarea` |
| Dropdown selection | `Select` |
| Searchable dropdown | `Combobox` |
| Boolean toggle | `Switch` |
| Boolean with label | `Checkbox` |
| Multiple exclusive options | `RadioGroup` |

**Always wrap with Field for labels and errors:**
```tsx
<Field label="Project Name" error={errors.name}>
  <Input {...register("name")} />
</Field>
```

### Dialog / Sheet / AlertDialog

| Use When | Component |
|----------|-----------|
| Confirmation required | `AlertDialog` (ConfirmDialog pattern) |
| Quick form/action | `Dialog` |
| Complex form or sidebar | `Sheet` (slide-in panel) |
| Multiple fields/steps | `Sheet` |

**Rule:** Prefer inline editing over modals when possible.

### Tabs

| Use When | Notes |
|----------|-------|
| Switching between views in same context | Use URL state for shareable tabs |
| Organizing detail page content | Use with content below |

---

## Layer 2: Composed Patterns (packages/patterns)

Ready-to-use patterns combining primitives.

### PageHeader

| Use When | Example |
|----------|---------|
| Detail pages | `title={client.name}` |
| Form pages | `title="New Project"` |
| Sub-pages | With `breadcrumbs` prop |
| Pages with primary action | With `actions` prop |

```tsx
<PageHeader
  title="Client Name"
  description="Optional subtitle"
  breadcrumbs={<Link href="..">← Back</Link>}
  actions={<Button>Primary Action</Button>}
  noBorder // Optional: remove bottom border
/>
```

### PageGreetingHeader (app/_components/patterns)

| Use When | Example |
|----------|---------|
| Main list pages (Clients, Projects) | `page="clients"` |
| Dashboard home | `page="overview"` |
| Where you want animated greetings | `mode="greeting"` |

```tsx
<PageGreetingHeader
  page="clients"
  viewer={{ firstName: "Sarah" }}
  variant="dashboard"
  mode="greeting" // or "title" for static
/>
```

### FilterBar

| Use When | Props |
|----------|-------|
| Searchable lists | `searchValue`, `onSearchChange` |
| Filterable lists | `filters` slot |
| Lists with bulk actions | `actions` slot |

```tsx
<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search clients..."
  filters={<Select>...</Select>}
  actions={<Button>Export</Button>}
/>
```

### EmptyState

| Use When | Props |
|----------|-------|
| No data to display | `title`, `description` |
| First-time user state | Add `action` with CTA |
| Error state | Adjust messaging |

```tsx
<EmptyState
  icon={<FolderIcon className="size-12" />}
  title="No projects yet"
  description="Create your first project to get started"
  action={<Button>Create Project</Button>}
/>
```

### StatCard

| Use When | Notes |
|----------|-------|
| Dashboard KPIs | Single metric with label |
| Quick stats in detail pages | Compact version |

### ConfirmDialog

| Use When | Notes |
|----------|-------|
| Destructive actions | Delete, archive, remove |
| Irreversible actions | Actions that can't be undone |

---

## Layer 3: Page Templates

See `docs/guides/page-templates.md` for complete templates.

| Template | Use For | Key Components |
|----------|---------|----------------|
| **ListPage** | Clients, Projects, Invoices | PageGreetingHeader + FilterBar + Table/Cards |
| **DetailPage** | Client detail, Project detail | PageHeader + Tabs + Content sections |
| **DashboardPage** | Overview, Analytics | PageGreetingHeader + Bento grid + StatCards |
| **FormPage** | New/Edit forms | PageHeader + Form + Actions |
| **SettingsPage** | Settings sections | PageHeader + Card sections |

---

## Decision Matrix by Use Case

### "I need to display a list of items"

```
Is the list searchable/filterable?
├── YES → FilterBar + content
└── NO → Direct content

What format?
├── Tabular data with columns → Table
├── Cards with rich content → Grid of Cards
├── Simple text list → List items
└── Kanban/drag-drop → Custom board component
```

### "I need to show item details"

```
How much data?
├── Single section → Card
├── Multiple sections → Tabs or stacked Cards
└── Very complex → Tabs with Card sections inside
```

### "I need a form"

```
Form complexity?
├── 1-3 fields → Dialog
├── 4-8 fields → Sheet or inline form
└── 8+ fields or wizard → Full page FormPage
```

### "I need to show a loading state"

```
What's loading?
├── Page content → Skeleton matching final layout
├── Button action → Button with loading prop
├── Background operation → Toast notification
└── Async operation → Optimistic UI + revert on error
```

### "I need to show an error"

```
Error scope?
├── Field validation → Field with error prop
├── Form submission → Toast + keep form open
├── Data fetch error → EmptyState with retry action
└── Critical error → Error boundary
```

---

## Component Inventory Reference

### Primitives (packages/ui/src/primitives/)

| Component | Purpose |
|-----------|---------|
| `accordion` | Collapsible content sections |
| `alert` | Inline notification banners |
| `alert-dialog` | Confirmation dialogs |
| `avatar` | User/entity images |
| `badge` | Status indicators, tags |
| `button` | Interactive actions |
| `card` | Content containers |
| `checkbox` | Boolean inputs |
| `combobox` | Searchable dropdowns |
| `command` | Command palette (Cmd+K) |
| `dialog` | Modal overlays |
| `dropdown-menu` | Context menus |
| `field` | Form field wrapper |
| `glass-card` | Frosted glass effect card |
| `input` | Text inputs |
| `input-group` | Input with addons |
| `label` | Form labels |
| `progress` | Progress indicators |
| `radio-group` | Exclusive options |
| `select` | Dropdown selection |
| `separator` | Visual dividers |
| `sheet` | Slide-in panels |
| `skeleton` | Loading placeholders |
| `spinner` | Loading indicator (use sparingly) |
| `stat-card` | Metric display |
| `switch` | Boolean toggles |
| `table` | Data tables |
| `tabs` | View switching |
| `textarea` | Multi-line text |
| `toast` | Notifications (via sonner) |
| `tooltip` | Hover info |

### Patterns (packages/patterns/src/)

| Pattern | Purpose |
|---------|---------|
| `app-shell` | Dashboard layout wrapper |
| `page-header` | Page titles and actions |
| `filter-bar` | Search and filter UI |
| `empty-state` | No-data states |
| `stat-card` | Dashboard metrics |
| `confirm-dialog` | Destructive action confirmation |

---

## Anti-Patterns to Avoid

### ❌ Creating Custom Components When Patterns Exist

```tsx
// ❌ WRONG
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold">Clients</h1>
  <button className="bg-primary...">Add Client</button>
</div>

// ✅ CORRECT
<PageHeader
  title="Clients"
  actions={<Button>Add Client</Button>}
/>
```

### ❌ Using Raw Tailwind Colors

```tsx
// ❌ WRONG (ESLint will catch this)
<div className="bg-blue-500 text-white">

// ✅ CORRECT
<div className="bg-primary text-primary-foreground">
```

### ❌ Spinners for Content Loading

```tsx
// ❌ WRONG
{loading && <Spinner />}

// ✅ CORRECT (use Skeleton matching content shape)
<Suspense fallback={<ClientListSkeleton />}>
  <ClientList />
</Suspense>
```

### ❌ Multiple Primary Buttons

```tsx
// ❌ WRONG
<Button>Save</Button>
<Button>Save and Continue</Button>

// ✅ CORRECT
<Button>Save and Continue</Button>
<Button variant="outline">Save Draft</Button>
```

### ❌ Modals for Complex Forms

```tsx
// ❌ WRONG - too many fields for modal
<Dialog>
  <form with 10+ fields />
</Dialog>

// ✅ CORRECT - use Sheet or dedicated page
<Sheet>
  <form with 10+ fields />
</Sheet>
```

---

## Sources

- [shadcn/ui Registry Documentation](https://ui.shadcn.com/docs/registry)
- [Linear Design System (Figma)](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [Radix Primitives - Linear Case Study](https://www.radix-ui.com/primitives/case-studies/linear)
- [Building Agentic Design Systems](https://medium.com/@disco_lu/building-agentic-design-systems-the-future-of-ai-enhanced-design-6ad0470cf1e3)
