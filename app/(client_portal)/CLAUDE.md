# Client Portal (Bridge) Guide

**Context:** You are working within the external client portal (Bridge).
**Architecture:** Token-based auth, light mode default, white-label friendly.

---

## Style Isolation

Bridge styles are **completely isolated** from the Dashboard:

1. **`bridge.css`** - Imported only in Bridge layout (not in globals.css)
2. **`data-surface="bridge"`** - Scopes all CSS variable overrides
3. **Bridge-specific tokens** - Own color palette, spacing, typography

This means:
- Changes to Bridge will NOT affect the Dashboard
- Changes to Dashboard will NOT affect Bridge
- Shared `@repo/ui` components work in both (adapt via CSS variables)

---

## File Structure

```
bridge/
├── bridge.css              # Bridge-only styles (imported in layout)
├── layout.tsx              # Shell with data-surface="bridge"
├── page.tsx                # Home/overview
├── progress/               # Project timeline
├── messages/               # Communication
├── files/                  # Shared documents
├── requests/               # Support requests
├── billing/                # Invoices and payments
└── settings/               # Client preferences
```

---

## Design Tokens

All Bridge tokens are defined in `bridge.css` under `[data-surface="bridge"]`:

| Token | Value | Purpose |
|-------|-------|---------|
| `--bridge-bg-page` | `#ffffff` | Page background |
| `--bridge-bg-surface` | `#fafafa` | Card/section background |
| `--bridge-text-primary` | `#111111` | Primary text |
| `--bridge-text-muted` | `#666666` | Secondary text |
| `--bridge-accent` | `#2563eb` | Brand accent (customizable) |
| `--bridge-radius-lg` | `12px` | Card border radius |
| `--bridge-spacing-xl` | `24px` | Section spacing |

### Using Tokens

```tsx
// In Bridge components, use CSS variables directly:
<div className="bg-[var(--bridge-bg-surface)] text-[var(--bridge-text-primary)]">
  ...
</div>

// Or use the pre-defined utility classes:
<div className="bridge-card">...</div>
<button className="bridge-btn bridge-btn-primary">...</button>
```

---

## Layout Components

Pre-built CSS classes in `bridge.css`:

| Class | Purpose |
|-------|---------|
| `.bridge-shell` | Root container (flex column, min-h-screen) |
| `.bridge-header` | Sticky header with logo |
| `.bridge-sidebar` | Fixed sidebar (desktop only) |
| `.bridge-main` | Main content area |
| `.bridge-content` | Content container with max-width |
| `.bridge-mobile-nav` | Bottom nav for mobile |

### Navigation Classes

| Class | Purpose |
|-------|---------|
| `.bridge-nav-section` | Nav group container |
| `.bridge-nav-label` | Section label (MY PROJECT, etc.) |
| `.bridge-nav-item` | Navigation link |
| `.bridge-nav-icon` | Icon inside nav item |

---

## Component Classes

| Class | Purpose |
|-------|---------|
| `.bridge-card` | Card with subtle shadow |
| `.bridge-card-hover` | Card with hover effect |
| `.bridge-btn` | Base button |
| `.bridge-btn-primary` | Primary action button |
| `.bridge-btn-secondary` | Secondary button |
| `.bridge-btn-ghost` | Ghost/text button |

---

## Navigation Structure

Grouped by client mental model:

```
MY PROJECT
├── Overview (home)
├── Progress (timeline/milestones)
└── Messages (communication)

RESOURCES
├── Files (documents)
└── Reports (intelligence)

ACCOUNT
├── Requests (support)
├── Billing (invoices)
└── Settings (preferences)
```

---

## Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Light mode default** | Professional, clean appearance |
| **Generous spacing** | Clients aren't power users |
| **Softer interactions** | Subtle hover states, no scale effects |
| **Mobile-first** | Bottom nav, responsive layouts |
| **White-label ready** | CSS variables for customization |

---

## Do's and Don'ts

### Do:
- Use Bridge-specific tokens (`--bridge-*`)
- Keep layouts clean and uncluttered
- Provide clear visual feedback
- Test on mobile (bottom nav)

### Don't:
- Import Dashboard styles
- Use dense data tables
- Show internal jargon
- Assume dark mode preference

---

## Adding New Pages

1. Create file in `bridge/[route]/page.tsx`
2. Use Bridge tokens for styling
3. Add nav item to `layout.tsx` if needed
4. Test mobile layout

```tsx
// Example new page
export default function NewPage() {
  return (
    <div className="space-y-8">
      <h1>Page Title</h1>
      <div className="bridge-card">
        Content here
      </div>
    </div>
  );
}
```
