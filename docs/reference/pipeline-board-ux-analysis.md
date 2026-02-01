# Pipeline Board UX Analysis

Based on Linear's Projects Board view, this document outlines the interaction patterns and functionality to implement for Salt Core's Pipeline page.

## Current Implementation Status

### ✅ Implemented
- Board layout with 5 columns (Lead, Discovery, Pitch, Active, Complete)
- Drag and drop between columns (via dnd-kit)
- Status icons in column headers (with semantic colors)
- Basic card display with client info
- Column count badges
- Hover states for action buttons

### 🔄 Needs Enhancement
- Column backgrounds now more visible (`bg-muted/40`)
- Drag feedback could be improved

---

## Linear Board Interaction Patterns

### 1. Create New Item (+ Button)

**Linear's Approach:**
- Clicking "+" opens a **full modal dialog**
- Pre-fills the column's status (e.g., clicking + in "Planned" sets status to "Planned")
- Full form with all fields visible

**Form Fields:**
- Icon picker
- Name (required, focused on open)
- Summary (optional)
- Status dropdown (pre-filled from column)
- Priority dropdown
- Lead/Owner selector
- Members multi-select
- Start date picker
- Target date picker
- Labels multi-select
- Dependencies
- Rich text description
- Milestones section

**Actions:**
- Cancel (discard)
- Create (submit)

**Salt Core Implementation:**
```
Priority: HIGH
Effort: MEDIUM

We should implement:
1. "Add Client" dialog triggered by + button
2. Pre-fill lifecycle_stage based on which column was clicked
3. Include: Name, Email, Company, Notes, Stage (pre-filled)
4. Keyboard shortcut: 'C' to create new client
```

### 2. Card Click → Detail View

**Linear's Approach:**
- Clicking card **navigates to full detail page** (not modal)
- URL changes to `/project/[slug]/overview`
- Has tabs: Overview, Updates, Issues
- Right sidebar with properties
- "Close" button returns to board

**Salt Core Implementation:**
```
Priority: HIGH
Effort: LOW (already exists)

Current: Cards link to /dashboard/clients/[id]
Status: ✅ Already implemented correctly
Enhancement: Add "Back to Pipeline" breadcrumb on client detail page
```

### 3. Drag and Drop

**Linear's Approach:**
- Cards can be dragged between columns
- Visual feedback:
  - Card follows cursor with slight opacity reduction
  - Target column highlights
  - Placeholder appears where card will drop
- Optimistic update (immediate visual feedback)
- Server sync in background
- Toast notification on success/failure

**Salt Core Implementation:**
```
Priority: HIGH
Effort: DONE (basic), MEDIUM (enhancements)

Current: ✅ Basic drag between columns works
Enhancements needed:
1. Better visual feedback during drag (card preview)
2. Column highlight on hover during drag (✅ now using bg-accent/50)
3. Placeholder where card will be inserted
4. Smooth animation on drop
5. Toast notifications (✅ implemented)
```

### 4. Column Header Interactions

**Linear's Approach:**
- Status icon (colored by type)
- Column name
- Count (plain number, no badge)
- Menu button (•••) - appears on hover
  - Column settings
  - Sort options
  - Filter options
- Plus button (+) - appears on hover
  - Creates new item in this column

**Salt Core Implementation:**
```
Priority: MEDIUM
Effort: MEDIUM

Current: ✅ Icons, name, count, menu button, plus button
Enhancements needed:
1. Wire up + button to create client dialog
2. Wire up ••• menu with options:
   - Sort by name
   - Sort by date added
   - Collapse column
3. Always show buttons (not just on hover) for discoverability
```

### 5. Card Hover States

**Linear's Approach:**
- Subtle background change
- Action buttons become visible (menu, quick actions)
- Cursor changes to pointer

**Salt Core Implementation:**
```
Priority: LOW
Effort: LOW

Current: ✅ Hover shows drag handle and menu
Enhancement: Could add quick action buttons (email, call)
```

### 6. Keyboard Shortcuts

**Linear's Approach:**
- `C` - Create new item
- `⌘B` - Toggle board/list view
- Arrow keys - Navigate between cards
- `Enter` - Open selected card
- `Esc` - Close dialogs/deselect

**Salt Core Implementation:**
```
Priority: LOW
Effort: MEDIUM

Suggested shortcuts:
- 'C' - Create new client
- 'Esc' - Deselect / close dialogs
- Arrow keys - Navigate (future)
```

---

## Recommended Implementation Order

### Phase 1: Core Functionality (Sprint 1)
1. ✅ Column visibility (backgrounds)
2. ⬜ "Add Client" dialog from + button
3. ⬜ Column menu with sort options

### Phase 2: Polish (Sprint 2)
4. ⬜ Better drag animation (card preview)
5. ⬜ Drop placeholder indicator
6. ⬜ "Back to Pipeline" breadcrumb on client detail

### Phase 3: Power User Features (Future)
7. ⬜ Keyboard shortcuts
8. ⬜ Quick filters per column
9. ⬜ Board/List view toggle
10. ⬜ Save custom views

---

## Design Tokens Reference

### Column Styling
```css
/* Default column background */
bg-muted/40

/* Column on drag hover */
bg-accent/50

/* Column border radius */
rounded-lg
```

### Card Styling
```css
/* Card background */
bg-card

/* Card border */
border border-border/50

/* Card shadow */
shadow-[0_1px_2px_rgba(0,0,0,0.05)]

/* Card hover */
hover:border-border hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]

/* Card border radius */
rounded-md
```

### Status Icons
| Stage | Icon | Color |
|-------|------|-------|
| Lead | Circle | text-muted-foreground |
| Discovery | CircleDot | text-muted-foreground |
| Pitch | Zap | text-warning |
| Active | CircleDot | text-info |
| Complete | CheckCircle2 | text-success |

---

## Files to Modify

| File | Purpose |
|------|---------|
| `PipelineBoard.tsx` | Board layout, DnD context |
| `PipelineColumn.tsx` | Column header, drop zone |
| `PipelineCard.tsx` | Card display, drag source |
| `CreateClientDialog.tsx` | NEW - Create client modal |
| `ColumnMenu.tsx` | NEW - Column actions dropdown |
