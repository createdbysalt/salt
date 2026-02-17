# Visual Design Reference

**Status:** Authoritative visual spec extracted from production components
**Last Updated:** February 2026
**Source:** `ClientsPageClient`, `ClientListTable`, `ClientDetailPageClient`
**Purpose:** Ensure visual consistency across all new features

---

## ⚠️ MANDATORY FOR AI AGENTS

Before building ANY new UI component, the `/frontend-design` skill MUST:
1. Read this document
2. Match spacing, typography, and patterns exactly
3. Run `/ds-check` after completion

---

## Page-Level Spacing

### Root Container
```tsx
<div className="space-y-4">  {/* Standard gap between sections */}
```

| Context | Spacing | Example |
|---------|---------|---------|
| Between major sections | `space-y-4` | Header → Filters → Table |
| Page wrapper | `space-y-4` or `space-y-6` | Depends on density |
| Card internal | `space-y-3` | Label → value pairs |

### Toolbar Layout
```tsx
{/* Filters (left) + Actions (right) */}
<div className="flex items-center justify-between gap-4">
  <FiltersSection />
  <ActionsSection />
</div>
```

---

## Table Patterns (Primary List View)

### Container
```tsx
<div className="border rounded-lg overflow-hidden">
  <Table>...</Table>
</div>
```

### Header Row
```tsx
<TableRow className="bg-muted/50 hover:bg-muted/50">
  <TableHead className="w-[280px]">Name</TableHead>     {/* Primary column */}
  <TableHead className="w-[160px]">Company</TableHead>  {/* Secondary */}
  <TableHead className="w-[110px]">Stage</TableHead>    {/* Compact */}
  <TableHead className="w-[100px]">MRR</TableHead>      {/* Numeric */}
  <TableHead className="w-[120px]">Created</TableHead>  {/* Date */}
  <TableHead className="w-[50px]"></TableHead>          {/* Actions */}
</TableRow>
```

### Column Width Reference
| Content Type | Width | Example |
|--------------|-------|---------|
| Name/Title (primary) | `w-[280px]` | Client name, Project name |
| Company/Category | `w-[160px]` | Company name, Type |
| Status/Stage | `w-[110px]` | Lifecycle stage |
| Short numeric | `w-[100px]` | MRR, Amount |
| Projects count | `w-[90px]` | Integer counts |
| Date | `w-[120px]` | Created, Updated |
| Last activity | `w-[120px]` | Relative time |
| Phone | `w-[140px]` | Phone number |
| Tags | `w-[180px]` | Tag badges |
| Actions (icon only) | `w-[50px]` | Dropdown menu |

### Body Row
```tsx
<TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
  <TableCell>
    <Link href={detailUrl} className="block">
      {/* Cell content */}
    </Link>
  </TableCell>
</TableRow>
```

### Cell Typography
```tsx
{/* Primary text */}
<span className="text-sm">Main content</span>

{/* Secondary/muted text */}
<span className="text-sm text-muted-foreground">Secondary info</span>

{/* Placeholder for empty values */}
<span className="text-sm text-muted-foreground">—</span>
```

### Empty State (inline)
```tsx
<div className="text-center py-12 text-muted-foreground">
  <p>No clients found</p>
</div>
```

---

## Card Patterns

### Standard Card
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-lg flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {/* Content rows */}
    </div>
  </CardContent>
</Card>
```

### Card Content Row (clickable)
```tsx
<Link
  href={itemUrl}
  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
>
  <div>
    <p className="font-medium">{title}</p>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
  <Button variant="outline" size="sm">View</Button>
</Link>
```

### Property Label-Value Pattern
```tsx
<div className="space-y-3">
  <div>
    <div className="text-sm text-muted-foreground">Label</div>
    <div>{value}</div>  {/* or link */}
  </div>
</div>
```

---

## Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Table cell icon | 14px | `h-3.5 w-3.5` |
| Inline with text | 16px | `h-4 w-4` |
| Card header icon | 20px | `h-5 w-5` |
| Empty state icon | 48px | `size-12` |
| Dropdown menu item | 16px | `h-4 w-4 mr-2` |

---

## Button Sizes

| Context | Size | Class |
|---------|------|-------|
| Primary page action | default | (no size prop) |
| Table row action | icon-sm | `h-8 w-8` |
| Inline action | sm | `size="sm"` |
| Toolbar filter | toolbar | `size="toolbar"` (28px) |

---

## Avatar Sizes

| Context | Size | Class |
|---------|------|-------|
| Company icon in table | 24px | `h-6 w-6` |
| User avatar | 32px | `h-8 w-8` |
| Large profile | 40px | `h-10 w-10` |

---

## Badge Patterns

### Tag Badge (colorful)
```tsx
<Badge
  variant="outline"
  className="text-xs px-1.5 py-0"
  style={{
    backgroundColor: `${tag.color}15`,  // 15% opacity
    borderColor: tag.color,
    color: tag.color,
  }}
>
  {tag.label}
</Badge>
```

### Status Badge
```tsx
{/* Stage/Status with icon */}
<div className={`flex items-center gap-1.5 text-sm ${stageConfig.className}`}>
  {stageConfig.icon}  {/* h-3.5 w-3.5 */}
  <span>{stageConfig.label}</span>
</div>
```

### Status Colors
| Status | Text Class |
|--------|------------|
| Neutral/Default | `text-muted-foreground` |
| Active/Info | `text-info` |
| Success/Complete | `text-success` |
| Warning/Pitch | `text-warning` |
| Error/Lost | `text-destructive` |

---

## Warning/Info Banners

### Destructive Warning
```tsx
<div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
  <div className="text-sm">
    <p className="font-medium text-destructive">Warning headline</p>
    <p className="text-muted-foreground mt-1">Explanation text.</p>
  </div>
</div>
```

### Info Banner
```tsx
<div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
  <InfoIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
  <div className="text-sm">
    <p className="font-medium">Info headline</p>
    <p className="text-muted-foreground mt-1">Explanation text.</p>
  </div>
</div>
```

---

## Dropdown Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-[180px]">
    <DropdownMenuItem asChild>
      <Link href={detailUrl}>
        <ExternalLink className="h-4 w-4 mr-2" />
        View details
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive focus:text-destructive">
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Transitions

| Element | Transition |
|---------|------------|
| Row hover | `transition-colors` |
| Link hover | `hover:bg-accent transition-colors` |
| General interactive | `transition-all duration-200` |

---

## Typography Quick Reference

| Element | Classes |
|---------|---------|
| Table cell text | `text-sm` |
| Muted text | `text-sm text-muted-foreground` |
| Card title | `text-lg` + `font-medium` (via CardTitle) |
| Section title | `font-medium` |
| Empty state | `text-muted-foreground` |
| Badge text | `text-xs` |

---

## Checklist: Before Submitting New Component

- [ ] Table uses `border rounded-lg overflow-hidden` container
- [ ] Header row has `bg-muted/50`
- [ ] Column widths match reference table above
- [ ] Empty values use `—` (em dash), not "N/A"
- [ ] Icons are correct size for context
- [ ] Text uses `text-sm` in tables
- [ ] Hover states use `hover:bg-muted/50` or `hover:bg-accent`
- [ ] Spacing matches `space-y-4` standard
- [ ] Badges use `text-xs px-1.5 py-0`
- [ ] Dropdown menu is `w-[180px]` with `align="end"`
