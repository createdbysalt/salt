# SALT Color System (Linear-Inspired)

Comprehensive color system for SALT, derived from Linear's design principles but adapted with **blue as the primary accent color**.

> **Source**: Extracted from linear.app on 2026-01-31 via computed styles
> **Color Space**: Uses LCH (Lightness, Chroma, Hue) with hue 272 for neutrals
> **SALT Accent**: Blue-500 (`#3b82f6`) instead of Linear's purple

---

## Executive Summary

SALT's color system adopts Linear's principles:
1. **Near-black backgrounds** with subtle coolness (hue 272)
2. **High-contrast text hierarchy** (4 levels: primary → muted)
3. **Muted icons** that don't compete with text
4. **Blue accent color** for links and interactive elements (not purple)
5. **Status colors** that are semantic but not overwhelming

---

## Dark Mode Palette (Primary)

### Backgrounds

| Token | LCH Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--bg-page` | `lch(2.467 0 272)` | `#060606` | Page background, deepest black |
| `--bg-sidebar` | `lch(2.467 0 272)` | `#060606` | Sidebar (same as page) |
| `--bg-content` | `lch(4.8 0.7 272)` | `#0c0c0c` | Main content area |
| `--bg-input` | `lch(7.133 2.333 272)` | `#121212` | Input fields, search boxes |
| `--bg-elevated` | `lch(8.3 1.867 272)` | `#151515` | Cards, elevated surfaces |
| `--bg-hover` | `lch(10.633 3.033 272)` | `#1b1b1b` | Hover state backgrounds |
| `--bg-active` | `lch(12.3 3.7 272)` | `#1f1f1f` | Active/selected items |
| `--bg-dropdown` | `lch(10.633 1.867 272)` | `#1b1b1b` | Dropdown menus, popovers |

**Key Insight**: Background progression is ~2-3 L* units per step. Very subtle elevation changes.

### Text Colors

| Token | LCH Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--text-primary` | `lch(100 0 272)` | `#ffffff` | Titles, important text, active nav |
| `--text-secondary` | `lch(90.421 1 272)` | `#e7e7e7` | Body text, nav items, descriptions |
| `--text-tertiary` | `lch(62.6 1.35 272)` | `#9e9e9e` | Less important text, issue IDs |
| `--text-muted` | `lch(61.683 1 272)` | `#9d9d9d` | Disabled, placeholders, timestamps |
| `--text-icon` | `rgb(107, 111, 118)` | `#6b6f76` | Default icon color |

**Key Insight**: Icons (#6b6f76) are deliberately MORE muted than tertiary text (#9e9e9e).

### Borders

| Token | LCH Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--border-subtle` | `lch(13.827 2.84 272)` | `#232323` | Subtle dividers, separators |
| `--border-default` | `lch(16.16 3.54 272)` | `#292929` | Default borders, cards |
| `--border-strong` | `lch(19 3.54 272)` | `#303030` | Focus rings, input borders |
| `--border-code` | `lch(9.77 3.54 272)` | `#191919` | Code block borders |

### Accent Colors (SALT)

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-primary` | `#3b82f6` (Blue-500) | Primary brand, buttons |
| `--accent-link` | `#3b82f6` / `#2563eb` | Links (dark/light mode) |
| `--accent-primary-light` | `#60a5fa` (Blue-400) | Hover states |
| `--accent-primary-dark` | `#2563eb` (Blue-600) | Pressed states |

**SALT Brand Color**:
- Blue-500 (`#3b82f6`) is the primary brand color
- Unlike Linear's purple, we use blue for links and interactive elements
- Maintains the same visual hierarchy principles

### Code Blocks

| Token | Value | Usage |
|-------|-------|-------|
| `--code-bg` | `rgba(255, 255, 255, 0.075)` | Inline code background |
| `--code-text` | `lch(90.65 1.35 272)` | Code text color |
| `--code-border` | `lch(9.77 3.54 272)` | Code border |

---

## Status Colors

Linear uses **muted, monochromatic status icons** by default:

| Status | Icon Style | Color Approach |
|--------|------------|----------------|
| Backlog | Dashed circle | Gray outline |
| Todo | Empty circle | Gray outline |
| In Progress | Partial fill circle | Yellow/orange accent |
| In Review | Circle outline | Green accent |
| Done | Checkmark circle | Purple/violet fill |
| Canceled | X circle | Gray |
| Duplicate | X circle | Gray |

**Key Insight**: Status icons are SMALL and use the semantic color sparingly. The icon shape carries meaning, not just color.

### Priority Icons

| Priority | Icon | Color |
|----------|------|-------|
| No Priority | Three dots (---) | Gray |
| Urgent | Filled bar indicator | Orange/Red |
| High | 3 bars | Gray |
| Medium | 2 bars | Gray |
| Low | 1 bar | Gray |

**Key Insight**: Only "Urgent" uses color. All others are gray to avoid visual noise.

---

## Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Issue Title | 24px | 600 (semibold) | - |
| Body Text | 15px | 400 (normal) | 24px (1.6) |
| Nav Items | 13px | 450 | - |
| Metadata | 12px | 400 | - |

---

## Interactive States

### Nav Items
```
Default:    bg: transparent, color: --text-secondary (#e7e7e7)
Hover:      bg: --bg-hover (#1b1b1b), color: --text-primary (#ffffff)
Active:     bg: --bg-active (#1f1f1f), color: --text-primary (#ffffff)
```

### Buttons
```
Ghost:      bg: transparent, color: --text-secondary
Ghost Hover: bg: --bg-hover, color: --text-primary
Primary:    bg: --bg-active, color: --text-primary, border: --border-subtle
```

### Links
```
Default:    color: --accent-link (purple), no underline
Hover:      color: --accent-link (brighter), underline
```

### Issue Rows
```
Default:    bg: transparent
Hover:      bg: --bg-hover (#1b1b1b)
Selected:   bg: --bg-active (#1f1f1f)
```

---

## Color Philosophy

### 1. Minimal Color, Maximum Information
Linear avoids color except where it adds meaning:
- Gray icons by default
- Purple only for links/actions
- Status colors only on status badges
- No decorative colors

### 2. Depth Through Luminance
Instead of using borders or shadows, Linear creates depth through subtle background changes:
- Page: L* 2.5
- Content: L* 4.8
- Hover: L* 10.6
- Active: L* 12.3

### 3. Icon Subordination
Icons are deliberately more muted than text:
- Text tertiary: #9e9e9e (L* 62)
- Icons: #6b6f76 (L* ~45)

This ensures icons support content without competing for attention.

### 4. Consistent Hue
All neutral colors share hue 272 (slightly cool blue-gray), creating visual harmony.

---

## Recommended SALT Mappings

```css
:root {
  /* Backgrounds (Linear's LCH scale) */
  --background: #060606;                   /* Page - L* 2.5 */
  --card: #151515;                         /* Elevated - L* 8.3 */
  --muted: #0c0c0c;                        /* Content - L* 4.8 */
  --accent: #1f1f1f;                       /* Active - L* 12.3 */

  /* Text Hierarchy */
  --foreground: #ffffff;                   /* Primary - L* 100 */
  --muted-foreground: #6b6f76;             /* Icons/muted */

  /* Borders */
  --border: #232323;                       /* Subtle - L* 13.8 */
  --border-default: #292929;               /* Default - L* 16.2 */

  /* SALT Blue Accent (NOT Linear's purple) */
  --primary: #3b82f6;                      /* Blue-500 */
  --primary-light: #60a5fa;                /* Blue-400 */
  --primary-dark: #2563eb;                 /* Blue-600 */

  /* Icons */
  --sidebar-icon: #6b6f76;                 /* Muted icons */
}
```

---

## Files Updated

Based on this analysis, the following SALT files should be audited:

1. `app/globals.css` - CSS variables
2. `app/_features/shell/components/NavItem.tsx` - Uses `--sidebar-icon`
3. `app/_components/ui/icon.tsx` - Icon system
4. `packages/ui/src/primitives/*.tsx` - UI primitives

---

## References

- Screenshots saved to `.playwright-mcp/`:
  - `linear-dark-mode-overview.png`
  - `linear-hover-state.png`
  - `linear-issue-detail.png`
  - `linear-status-dropdown.png`
  - `linear-priority-dropdown.png`
