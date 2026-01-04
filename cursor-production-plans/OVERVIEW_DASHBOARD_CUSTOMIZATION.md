# Overview Dashboard Customization (Future Enhancement)

**Status**: Planned (Not Started)  
**Priority**: v1.1+ Enhancement  
**Inspired By**: ClickUp's customizable dashboard

## The Vision

Allow studio owners to customize their Overview dashboard layout—show/hide widgets, reorder sections, and potentially resize cards. This makes the Overview feel more personal and adapts to different workflow preferences.

## User Problem

Different studio owners have different priorities:
- Some focus on tasks/operations → want Today widget prominent
- Some focus on sales/growth → want MRR/Pipeline at the top
- Some have no retainers yet → want to hide irrelevant widgets
- Some want AI insights front and center, others want it minimized

One-size-fits-all dashboard doesn't serve everyone equally well.

## Proposed Approach (Phased)

### Phase 1: Show/Hide + Reorder (Simplest MVP)
**Storage**: `studios.settings.dashboard.overview.layout`
```typescript
{
  widgets: [
    { id: "hero-metrics", visible: true, order: 0 },
    { id: "today", visible: true, order: 1 },
    { id: "meetings", visible: false, order: 2 },
    { id: "quick-stats", visible: true, order: 3 },
    { id: "projects-table", visible: true, order: 4 },
    { id: "ai-insights", visible: true, order: 5 },
  ]
}
```

**UI**: 
- "Customize Dashboard" button in header
- Opens dialog with checklist + drag handles
- Save → updates database → refresh page

**Effort**: ~4-6 hours (server action + dialog + reordering logic)

### Phase 2: Resize Widgets (Size Presets)
Add size options: `small`, `medium`, `large` for each widget.

```typescript
{
  widgets: [
    { id: "today", visible: true, order: 1, size: "large" },
    { id: "ai-insights", visible: true, order: 2, size: "small" },
  ]
}
```

Translate to Tailwind grid classes:
- Small: `lg:col-span-1`
- Medium: `lg:col-span-2`
- Large: `lg:col-span-3`

**Effort**: ~2-3 hours on top of Phase 1

### Phase 3: Drag-and-Drop Inline (ClickUp-style)
Use `react-grid-layout` or `dnd-kit` for:
- Drag widgets directly on the page
- Free-form positioning
- Real-time preview
- "Edit Layout" toggle mode

**Storage**: Store grid coordinates + dimensions
```typescript
{
  layout: [
    { i: "hero-metrics", x: 0, y: 0, w: 12, h: 2 },
    { i: "today", x: 0, y: 2, w: 4, h: 6 },
    { i: "projects-table", x: 4, y: 2, w: 8, h: 6 },
  ]
}
```

**Effort**: ~8-12 hours (complex state management + persistence)

## Technical Considerations

### Database
- Store in `studios.settings.dashboard.overview.layout` (JSONB, no migration needed)
- Default layout = what we built in v1 (everyone starts here)
- Server action: `update-dashboard-layout.ts`

### Components
- Wrapper: `CustomizableDashboard.tsx` (reads layout, renders widgets conditionally)
- Config: `CustomizeDashboardDialog.tsx` (show/hide + reorder UI)
- Widget registry: Map widget IDs to components

### Edge Cases
- What if new widgets are added in future updates? (Auto-add to end of layout)
- What if a widget is removed from codebase? (Skip it gracefully)
- Mobile responsiveness? (Use default layout on mobile, custom only on desktop)
- Team members see same layout? (Yes, studio-level setting)

### Design System Alignment
- Use existing `Dialog`, `Checkbox`, `DragHandle` components
- Customize button in header next to "New Project"
- Toast notifications on save
- "Reset to Default" option

## Inspiration / References

**ClickUp Dashboard**:
- Toggle "Edit Layout" mode
- Drag-and-drop widgets anywhere
- Resize by dragging corners
- Widget library in sidebar
- Save per-workspace

**Notion Database Views**:
- Hide/show columns
- Reorder columns via drag
- Saved per view
- Simple but effective

**Linear Project Views**:
- Minimal customization (just filters)
- Clean, focused
- Good for users who want less choice

## Decision: Which Approach?

**Recommendation for Salt Core**: Start with **Phase 1** (show/hide + reorder).

**Why**:
- 80% of the value with 20% of the complexity
- Respects "technically grounded" voice (solve real problem, don't over-engineer)
- Can ship in a few hours vs weeks for full drag-and-drop
- Most users just want to hide irrelevant widgets, not pixel-perfect layouts
- Validates demand before investing in complex grid system

**When to add Phase 2/3**:
- User feedback explicitly asks for positioning control
- Multiple users say "I wish I could move X next to Y"
- Usage analytics show certain widgets are always hidden → need better defaults

## Implementation Checklist (Phase 1)

When ready to build:

- [ ] Create `update-dashboard-layout.ts` server action
- [ ] Add layout storage to `studios.settings.dashboard.overview.layout`
- [ ] Build `CustomizeDashboardDialog.tsx` component
- [ ] Add widget registry mapping IDs → components
- [ ] Implement show/hide toggles with checkboxes
- [ ] Add drag-to-reorder with `dnd-kit` (simpler than react-grid-layout for lists)
- [ ] Add "Customize Dashboard" button to Overview header
- [ ] Handle default layout for new studios
- [ ] Add "Reset to Default" option
- [ ] Test with hidden widgets (empty states, responsive layout)
- [ ] Update Overview page to read from layout settings
- [ ] Add loading state for layout changes

## Future Enhancements (Beyond Phase 3)

- **Widget Templates**: "Sales-focused", "Operations-focused", "Founder Dashboard"
- **Widget Variants**: Different versions of same widget (e.g., "Today - Compact" vs "Today - Detailed")
- **Custom Widgets**: Let users add custom metrics/embeds
- **Export/Share Layouts**: Copy layout config to share with other studios
- **Mobile Customization**: Separate layout for mobile vs desktop
- **Widget Filters**: Configure each widget independently (e.g., "Today widget: show only my tasks")

## Related Files

When implementing, these files will be affected:
- `app/(user_dashboard)/dashboard/overview/page.tsx` - Main entry point
- `app/(user_dashboard)/dashboard/overview/actions/update-dashboard-layout.ts` - New action
- `app/(user_dashboard)/dashboard/overview/components/CustomizableDashboard.tsx` - New wrapper
- `app/(user_dashboard)/dashboard/overview/components/CustomizeDashboardDialog.tsx` - New dialog

## Questions to Answer Before Building

1. Should layout be per-user or per-studio? (Studio-level makes more sense for teams)
2. Do we show a "What's New" badge when we add new widgets? (Yes, with dismiss option)
3. Should there be layout presets/templates? (Later, start with just custom)
4. How do we handle widget dependencies? (e.g., AI Insights needs Overview Data) (Load all data, just hide widgets)

---

**Last Updated**: January 2026  
**Captured By**: Cursor AI  
**Ready to Build When**: User requests customization or we see usage patterns that need it


