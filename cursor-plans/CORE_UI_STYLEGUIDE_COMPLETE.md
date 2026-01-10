# Core UI Style Guide - Implementation Complete

## Overview

The Core UI living style guide has been successfully implemented at `/design-system` (development-only).

## Access

- **Route**: `http://localhost:3000/design-system`
- **Environment**: Development only (returns 404 in production)
- **SEO**: Blocked with `noindex, nofollow`

## Features

### 1. Theme Controls (Top Bar)
- **Context Switcher**: Toggle between Dashboard (dark-first) and Bridge (light-first)
- **Mode Switcher**: Toggle between Light and Dark modes
- **Reset Button**: One-click reset to context defaults
- **Context Indicator**: Shows which mode is default for current context

### 2. Foundations Section
- **Colors**: All CSS variables with visual swatches, hex values, and copy-to-clipboard
  - Semantic Colors (background, foreground, primary, secondary, etc.)
  - Status Colors (success, warning, destructive, info)
  - Structure Colors (borders, inputs, sidebars, etc.)
  - Chart Colors (5-color data viz palette)
  
- **Typography**: Geist Sans and Geist Mono type scale
  - Font families and weights
  - Heading hierarchy (h1-h4)
  - Body text sizes
  - Code/mono styles

- **Spacing**: Tailwind spacing scale visualization (4px base unit)

- **Border Radius**: Shape tokens (sm, md, lg, xl, 2xl)

- **Shadows**: Elevation system

### 3. Components Section
- **Buttons**: All variants (default, secondary, destructive, outline, ghost, link), sizes, and states
- **Badges**: Status indicators with all semantic variants (including new success, warning, info)
- **Forms**: Input, Label, Textarea components with disabled states
- **Cards**: Flexible content containers with header/content/footer
- **Skeleton**: Loading state components
- **Icons**: Lucide React icon gallery

### 4. Interactive Features
- **Copy-to-Clipboard**: All tokens and code snippets
- **Tabbed Views**: Component documentation organized into Variants | Sizes | States | Code
- **Live Previews**: Real components, not screenshots
- **Context-Aware**: All components respond to Dashboard/Bridge context switches

## Theme System

### Context Overrides (`data-ui-context`)

The style guide uses `data-ui-context="dashboard" | "bridge"` attribute on `<html>` to apply context-specific overrides:

#### Bridge Context
- **Default Mode**: Light
- **Surfaces**: Slightly brighter (`--background: oklch(0.995 0 0)`)
- **Borders**: Clearer contrast (`--border: oklch(0.90 0 0)`)
- **Philosophy**: Client-facing, professional, light-first

#### Dashboard Context
- **Default Mode**: Dark
- **Surfaces**: Uses standard tokens (optimized for dark mode)
- **Philosophy**: Power-user, data-dense, dark-first

### How It Works

The `StyleguideControls` component:
1. Captures initial `<html>` state on mount
2. Applies `data-ui-context` and `.dark` class as user toggles
3. Auto-sets mode to context default when switching contexts
4. Restores previous state on unmount (navigating away)

## Files Created

```
app/design-system/
├── page.tsx                              # Server component with dev-only guard
├── _components/
│   ├── styleguide-shell.tsx              # Main UI shell with all content
│   ├── styleguide-controls.tsx           # Top bar controls (context/mode toggles)
│   ├── component-section.tsx             # Reusable section wrapper
│   ├── token-swatch.tsx                  # Color token display with copy
│   └── copy-button.tsx                   # Copy-to-clipboard utility
└── _data/
    └── tokens.ts                         # Token metadata and groups
```

## CSS Changes

Added to `app/globals.css`:

```css
/* Context overrides for Bridge light-first, Dashboard dark-first */
:root[data-ui-context="bridge"] { /* Bridge light mode overrides */ }
.dark[data-ui-context="bridge"] { /* Bridge dark mode overrides */ }
:root[data-ui-context="dashboard"] { /* Dashboard light (inherits defaults) */ }
.dark[data-ui-context="dashboard"] { /* Dashboard dark (inherits defaults) */ }
```

## Component Enhancements

### Badge Component (`components/ui/badge.tsx`)
Added three new semantic variants:
- `success`: Green badge for positive states
- `warning`: Amber badge for caution states
- `info`: Blue badge for informational states

Usage:
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="info">New</Badge>
```

## Usage Guidelines

### Viewing the Style Guide
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/design-system`
3. Toggle contexts and modes to preview all variations

### Using Design Tokens
All tokens are CSS variables accessible via `var(--token-name)`:

```tsx
// In components
<div style={{ backgroundColor: 'var(--primary)' }}>...</div>

// In Tailwind classes
<div className="bg-primary text-primary-foreground">...</div>
```

### Copying Snippets
1. Hover over any color swatch or component
2. Click the copy button
3. Toast notification confirms copy
4. Paste into your code

## Development Notes

- **No Production Access**: The route returns `notFound()` in production
- **State Management**: Theme changes are isolated to the style guide (restore on unmount)
- **Toast System**: Uses the custom `useToast` hook + `Toaster` component
- **TypeScript**: Fully typed with proper Badge variant types
- **Accessibility**: All components maintain focus rings and keyboard navigation

## Future Enhancements

Potential additions (not implemented yet):
- Search/filter components
- Component status badges (stable/beta/experimental)
- Contrast ratio calculations
- Export design tokens to JSON
- Side-by-side light/dark comparison view
- Bridge accent preset customization preview
- Responsive preview frames

## Integration with Existing System

The style guide works alongside:
- **Legacy Style Guide**: `app/legacy/dashboard/style-guide/page.tsx` (can be retired or kept for reference)
- **Theme Provider**: `components/theme-provider.tsx` (global light/dark state)
- **Theme Resolution**: `libs/theme/*` (accent preset system for Bridge white-labeling)

The new Core UI style guide is the **canonical reference** for the design system.

---

**Implementation Date**: January 3, 2026  
**Status**: ✅ Complete (all todos finished)  
**Design System Name**: **Core UI**



