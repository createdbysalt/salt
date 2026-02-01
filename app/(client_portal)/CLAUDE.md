# Client Portal (Bridge) Guide

**Context:** You are working within the external client portal (Bridge).
**Architecture:** Token-based auth, light mode default, white-label friendly.

---

## 🎨 Design System for Bridge

**Same components, different surface.** Bridge uses the same design system docs but with client-friendly defaults.

| Doc | Purpose |
|-----|---------|
| `docs/guides/agent-component-guide.md` | Component quick reference |
| `docs/guides/component-cookbook.md` | Usage patterns |
| `brand-identity/product/ux-standards.md` | UX philosophy (see Bridge section) |

**Bridge-Specific Rules:**
- Components auto-adapt via `data-surface="bridge"` tokens
- Prefer light mode (clients expect professional, not dev-tool aesthetic)
- Use more generous spacing (clients aren't power users)
- Avoid dense data tables (simpler layouts work better)

---

## Design System: Bridge Surface

The Bridge uses the `data-surface="bridge"` attribute which applies different design tokens than the Dashboard. This creates a client-friendly experience that is:

- **Light mode by default** — Professional, clean, accessible (dark mode available)
- **White-label friendly** — Studios can customize for their brand
- **More spacious** — Less dense than the power-user Dashboard
- **Softer animations** — Subtle, professional feel

### How It Works

```tsx
// The BridgeSurfaceProvider wraps all Bridge routes
<BridgeSurfaceProvider>
  {/* Forces light mode + adds data-surface="bridge" */}
  <div data-surface="bridge">
    {children}
  </div>
</BridgeSurfaceProvider>
```

### Theme Management

The Bridge defaults to light mode but allows users to switch:

```tsx
// BridgeSurfaceProvider behavior:
// 1. First visit: Default to light mode
// 2. User can toggle: Theme preference saved separately for Bridge
// 3. Bridge theme persists: Uses "salt-bridge-theme" storage key

// To add a theme toggle in Bridge:
import { useBridgeTheme } from "@/app/_features/portal/components/bridge-surface-provider";

function BridgeThemeToggle() {
  const { theme, toggleTheme } = useBridgeTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}
```

Bridge and Dashboard maintain separate theme preferences, so a client in light mode on Bridge won't affect the studio member's dark mode Dashboard.

### Bridge Token Overrides

Located in `app/globals.css` under `[data-surface="bridge"]`:

| Token | Dashboard | Bridge | Why |
|-------|-----------|--------|-----|
| Page header size | 20px | 24px | More readable for clients |
| Nav item size | 13px | 14px | Larger tap targets |
| Card padding | 1rem | 1.5rem | More breathing room |
| Hover scale | 1.02 | 1 | No scale effects (cleaner) |
| Shadows | Dramatic | Soft | Professional, not flashy |

### Adding Bridge-Specific Styles

Use the `[data-surface="bridge"]` selector in CSS:

```css
/* In globals.css or component CSS */
[data-surface="bridge"] .my-component {
  /* Bridge-specific styles */
  padding: var(--bridge-card-padding);
}
```

### Component Behavior

Components automatically adapt to the Bridge surface:
- Same components work in both Dashboard and Bridge
- CSS custom properties change based on surface
- No need for separate "Bridge" versions of components

## Route Structure

```
bridge/
├── layout.tsx              # Wraps with BridgeSurfaceProvider
├── page.tsx                # Client home/overview
├── projects/               # Client's projects
├── messages/               # Messaging with studio
├── requests/               # Support requests
├── billing/                # Invoices and payments
├── knowledge/              # Knowledge base access
├── files/                  # Shared documents
├── intelligence/           # AI insights for client
└── settings/               # Client preferences
```

## Authentication

Bridge uses **token-based authentication** (magic links), not session cookies:

```typescript
// Token validation in pages
import { getTenantContext } from "@/app/_lib/tenancy";

export default async function BridgePage() {
  const { context } = await getTenantContext();

  if (!context.client) {
    redirect("/bridge/login");
  }
  // ...
}
```

## White-Label Support

Studios can customize the Bridge appearance:

```typescript
// Client settings contain branding
const bridgeBranding = client?.settings?.bridge?.branding;
const customLogoUrl = bridgeBranding?.logoUrl;
// Future: custom colors, fonts, etc.
```

## Greetings

Bridge has its own greeting subtitles in `app/_features/shell/greetings/greetings.ts`:

```typescript
// Bridge subtitles are warmer, client-focused
export const bridgeSubtitles: Record<BridgePageKey, string[]> = {
  home: [
    "Everything you need is right here",
    "Your projects are looking great",
    // ...
  ],
  // ...
};
```

## Do's and Don'ts

### Do:
- Use existing components (they adapt automatically)
- Keep UI clean and uncluttered
- Use larger touch targets for forms
- Provide clear feedback on actions

### Don't:
- Use dense layouts (clients aren't power users)
- Show internal/studio-only information
- Use jargon in copy (keep it client-friendly)
- Assume dark mode (Bridge defaults to light)

## Security

1. **Scope all queries to client** — Never expose other clients' data
2. **Validate tokens** — Check authentication on every request
3. **Audit access** — Log portal visits for security
4. **Rate limit** — Protect against abuse
