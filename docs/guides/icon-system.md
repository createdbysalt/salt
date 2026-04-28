# Icon System

**Status:** Living Document
**Icon Library:** Lucide React (https://lucide.dev)
**Reference:** Linear App Dashboard (extracted January 2026)
**Last Updated:** January 2026

---

## Icon Library: Lucide React

SALT uses **Lucide React** exclusively. Do not mix icon libraries.

```tsx
// GOOD - Always use Lucide
import { Settings, User, ChevronRight } from "lucide-react";

// BAD - Never use other libraries
import { FaSettings } from "react-icons/fa";  // ❌
import { HiUser } from "@heroicons/react";    // ❌
```

---

## Linear's Icon Style (Reference)

Linear uses **filled/solid icons** at 20x20px. SALT matches this with Lucide's filled mode:

| Aspect | Linear | SALT |
|--------|--------|-----------|
| Style | Filled/Solid | **Filled** (default) |
| Base size | 20x20px | 16-20px depending on context |
| Stroke | None (filled) | `strokeWidth={0}`, `fill="currentColor"` |
| Color | Inherits text color | Same - uses `currentColor` |
| Active state | Brighter | Brighter via `text-sidebar-accent-foreground` |
| Inactive state | Muted gray | `text-muted-foreground` |

### Filled vs Outline

SALT defaults to **filled icons** to match Linear. Use outline when you need lighter visual weight.

```tsx
// Default (filled - Linear-style)
<Icon icon={Home} size="md" />

// Explicit filled
<Icon icon={Home} size="md" variant="filled" />

// Outline (for dense UIs or when filled looks too heavy)
<Icon icon={Home} size="md" variant="outline" />
```

### When to Use Outline

- Dense data tables with many icons
- Inline text with icons (e.g., "View details →")
- When filled icons feel too heavy
- Icons that don't have clean filled shapes (arrows, chevrons)

---

## Icon Style Standards

### Sizing

All icons follow a consistent sizing scale:

| Size | Pixels | Use Case | Tailwind Class |
|------|--------|----------|----------------|
| `xs` | 12px | Inline badges, status dots | `size-3` |
| `sm` | 14px | Dense lists, compact UI | `size-3.5` |
| `md` | 16px | Default, most icons | `size-4` |
| `lg` | 18px | Navigation items (standard) | `size-4.5` |
| `xl` | 20px | Navigation (collapsed), empty states | `size-5` |
| `2xl` | 24px | Hero sections, onboarding | `size-6` |

```tsx
// Standard usage (buttons, inline)
<Settings className="size-4" />

// Navigation item (expanded sidebar)
<Home className="size-4" />

// Navigation item (collapsed sidebar) - matches Linear's 20px
<Home className="size-5" />

// Empty state
<FolderOpen className="size-5" />
```

### Filled Icons (Default)

Filled icons use `fill="currentColor"` and `strokeWidth={0}`:

```tsx
// Direct usage (filled)
<Home className="size-4" fill="currentColor" strokeWidth={0} />

// Using Icon component (filled is default)
<Icon icon={Home} size="md" />
```

### Outline Icons (Alternative)

For outline icons, use stroke width **1.75px** for better visibility:

| Context | Stroke Width | Prop |
|---------|--------------|------|
| Default outline | 1.75 | `strokeWidth={1.75}` |
| Subtle/Dense | 1.5 | `strokeWidth={1.5}` |
| Bold/Emphasis | 2 | `strokeWidth={2}` |

```tsx
// Using Icon component with outline variant
<Icon icon={Settings} size="md" variant="outline" />

// Direct usage with stroke
<Settings className="size-4" strokeWidth={1.75} />
```

### Icon Wrapper Component

The `Icon` component provides consistent sizing and supports both variants:

```tsx
import { Icon } from "@/app/_components/ui/icon";
import { Settings, Home, Bell } from "lucide-react";

// Filled (default, Linear-style)
<Icon icon={Home} size="md" />

// Outline
<Icon icon={Home} size="md" variant="outline" />

// With animation
<Icon icon={Bell} size="md" animation="pulse" />
```

### Colors (Linear-Style)

Icons inherit text color via `fill="currentColor"`. Use semantic color classes:

| State | Class | Linear Reference |
|-------|-------|------------------|
| Inactive | `text-muted-foreground` | Muted gray (#6b6f76) |
| Active | `text-foreground` | White/bright |
| Hover | `group-hover:text-foreground` | Brightens on hover |
| Success | `text-green-500` | Green |
| Warning | `text-yellow-500` | Yellow/amber |
| Error | `text-red-500` | Red |
| Accent | `text-accent-foreground` | Brand accent |

```tsx
// Navigation icon (inactive → active on hover)
<div className="group">
  <Icon
    icon={Settings}
    size="md"
    className="text-muted-foreground group-hover:text-foreground transition-colors"
  />
</div>

// Active state (brighter)
<Icon icon={Home} size="md" className="text-foreground" />

// Muted/inactive state
<Icon icon={Settings} size="md" className="text-muted-foreground" />
```

---

## Icon Selection Guidelines

### Choosing Icons

1. **Consistency**: Use the same icon for the same action everywhere
2. **Clarity**: Icon meaning should be obvious without text
3. **Density**: Prefer simpler icons in dense UIs

### Standard Icon Mappings

| Action/Concept | Icon | Lucide Name |
|----------------|------|-------------|
| Settings | ⚙️ | `Settings` |
| User/Profile | 👤 | `User` |
| Add/Create | ➕ | `Plus` |
| Delete | 🗑️ | `Trash2` |
| Edit | ✏️ | `Pencil` |
| Search | 🔍 | `Search` |
| Close | ✕ | `X` |
| Menu | ☰ | `Menu` |
| More/Actions | ⋯ | `MoreHorizontal` |
| External Link | ↗️ | `ExternalLink` |
| Download | ⬇️ | `Download` |
| Upload | ⬆️ | `Upload` |
| Copy | 📋 | `Copy` |
| Check/Success | ✓ | `Check` |
| Warning | ⚠️ | `AlertTriangle` |
| Error | ⛔ | `AlertCircle` |
| Info | ℹ️ | `Info` |
| Refresh | 🔄 | `RefreshCw` |
| Filter | 🔽 | `Filter` |
| Sort | ↕️ | `ArrowUpDown` |
| Calendar | 📅 | `Calendar` |
| Mail/Message | ✉️ | `Mail` |
| Phone | 📞 | `Phone` |
| Link | 🔗 | `Link` |
| Lock | 🔒 | `Lock` |
| Unlock | 🔓 | `Unlock` |
| Eye (View) | 👁️ | `Eye` |
| Eye Off (Hide) | 🙈 | `EyeOff` |
| Folder | 📁 | `Folder` |
| File | 📄 | `File` |
| Image | 🖼️ | `Image` |
| Home | 🏠 | `Home` |
| Star (Favorite) | ⭐ | `Star` |
| Heart (Like) | ❤️ | `Heart` |
| Bell (Notifications) | 🔔 | `Bell` |
| Send | ➤ | `Send` |

---

## Animated Icons

Important icons can have subtle animations to draw attention or indicate state changes. Use sparingly — animation should communicate state, not decorate.

### Animation Patterns

| Animation | Use Case | Duration | Example |
|-----------|----------|----------|---------|
| `spin` | Loading/processing | Infinite, 1s | Loader2 |
| `pulse` | Attention needed | Infinite, 2s | Bell (notifications) |
| `bounce` | New item arrived | 600ms + delay | Bell, Mail |
| `shake` | Error/validation | 400ms | AlertTriangle |
| `scale-in` | Success feedback | 200ms | Check |
| `fade-in` | Subtle appearance | 200ms | Any |
| `ping` | Live/active status | Infinite, 1.5s | Circle (status dot) |

### Implementation

Use the `Icon` component with the `animation` prop:

```tsx
import { Icon } from "@/app/_components/ui/icon";
import { Loader2, Bell, Check, AlertTriangle, RefreshCw } from "lucide-react";

// Spinning loader
<Icon icon={Loader2} size="md" animation="spin" />

// Notification with attention pulse
<Icon icon={Bell} size="md" animation="pulse" className="text-yellow-500" />

// Success checkmark (scales in on mount)
<Icon icon={Check} size="md" animation="scale-in" className="text-green-500" />

// Error shake
<Icon icon={AlertTriangle} size="md" animation="shake" className="text-red-500" />

// Refresh button
<button onClick={handleRefresh}>
  <Icon icon={RefreshCw} size="md" animation={isRefreshing ? "spin" : undefined} />
</button>
```

### Using AnimatedIcon Wrapper

For wrapping existing icons without changing them:

```tsx
import { AnimatedIcon } from "@/app/_components/ui/icon";
import { Bell } from "lucide-react";

<AnimatedIcon animation="pulse">
  <Bell className="size-4 text-yellow-500" />
</AnimatedIcon>
```

### When to Use Animation

```
✅ Loading states (spin)
✅ New notifications (pulse, bounce)
✅ Success confirmation (scale-in)
✅ Error feedback (shake)
✅ Live/realtime status (ping)

❌ Decorative icons
❌ Navigation icons
❌ Static status indicators
❌ Icons in dense lists
```

### Accessibility

Animations respect `prefers-reduced-motion`. The component automatically reduces or disables animations for users who prefer reduced motion.

---

## Button Icons

### Icon + Text Buttons

```tsx
<Button>
  <Plus className="size-4" />
  Add Project
</Button>

<Button variant="ghost" size="sm">
  <Settings className="size-4" />
  Settings
</Button>
```

### Icon-Only Buttons

```tsx
<Button variant="ghost" size="icon">
  <MoreHorizontal className="size-4" />
  <span className="sr-only">More options</span>
</Button>
```

### Icon Position

- **Leading icon** (before text): Actions, navigation
- **Trailing icon** (after text): Dropdowns, external links

```tsx
// Leading (action)
<Button><Plus className="size-4" />Create</Button>

// Trailing (dropdown)
<Button>Options<ChevronDown className="size-4" /></Button>

// Trailing (external)
<Button>Visit Site<ExternalLink className="size-4" /></Button>
```

---

## Navigation Icons

### Sidebar Navigation

```tsx
<NavItem href="/dashboard" icon={Home}>
  Dashboard
</NavItem>

// NavItem internally:
<Link className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent">
  <Icon className="size-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
  <span>Dashboard</span>
</Link>
```

### Active State

```tsx
// Active nav item - icon matches text color
<Icon className={cn(
  "size-4.5 transition-colors",
  isActive
    ? "text-foreground"
    : "text-muted-foreground group-hover:text-foreground"
)} />
```

---

## Status Indicators

### With Icons

```tsx
// Success
<div className="flex items-center gap-2 text-green-500">
  <CheckCircle className="size-4" />
  <span>Completed</span>
</div>

// Warning
<div className="flex items-center gap-2 text-yellow-500">
  <AlertTriangle className="size-4" />
  <span>Needs attention</span>
</div>

// Error
<div className="flex items-center gap-2 text-red-500">
  <XCircle className="size-4" />
  <span>Failed</span>
</div>
```

---

## Accessibility

### Always Provide Context

```tsx
// Icon-only button - MUST have sr-only text
<Button variant="ghost" size="icon" aria-label="Delete item">
  <Trash2 className="size-4" />
  <span className="sr-only">Delete item</span>
</Button>

// Decorative icons - use aria-hidden
<div className="flex items-center gap-2">
  <Star className="size-4" aria-hidden="true" />
  <span>Featured</span>
</div>
```

### Focus States

Icons inside interactive elements should not receive focus themselves:

```tsx
// Button handles focus, icon is decorative
<Button>
  <Plus className="size-4" aria-hidden="true" />
  Add Item
</Button>
```

---

## Don'ts

```tsx
// ❌ Don't use filled icons (Lucide is outline-based)
// ❌ Don't mix icon libraries
// ❌ Don't use oversized icons in dense UI
// ❌ Don't animate decorative icons excessively
// ❌ Don't use icons without text for ambiguous actions
// ❌ Don't change stroke width inconsistently
```

---

## Change Log

| Date | Change |
|------|--------|
| Jan 2026 | Initial icon system documentation |
