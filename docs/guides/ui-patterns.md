# 🎨 UI Patterns & Component Strategy

## 1. The "Smart vs. Dumb" Architecture

We strictly separate Logic (Smart/Container) from Rendering (Dumb/Presentational).

### 🧠 Smart Components (Containers)

* **Location:** `apps/frontend/src/app/(routes)/**/page.tsx` or `_components/feature-container.tsx`
* **Responsibilities:**
   * Fetching data (Server Components or React Query).
   * Validating arguments/props.
   * Handling redirections.
   * Passing only data down to Dumb Components.
* **Rule:** NEVER write complex JSX logic (like big conditional renders) inside a Smart Component.

### 🎨 Dumb Components (Presentational)

* **Location:** `apps/frontend/src/components/ui` or `packages/ui`
* **Responsibilities:**
   * Receiving data via `props`.
   * Rendering UI based solely on props.
   * Emitting events (e.g., `onSave(data)`) back to the parent.
* **Rule:** Dumb components MUST be pure. They should not trigger side effects or fetch data.

## 2. Component Composition (Shadcn UI + Tailwind)

We use Shadcn UI primitives as our atomic building blocks.

### The "cn" Utility Pattern

Always use the `cn()` utility to merge Tailwind classes. This allows parent components to override styles without conflicts.

❌ **Bad (Conflict Prone):**

```typescript
// If parent passes className="bg-red-500", it creates a conflict
<button className={`bg-blue-500 ${props.className}`}>
```

✅ **Good (Merge Safe):**

```typescript
import { cn } from "@/lib/utils";

<button className={cn("bg-blue-500 hover:bg-blue-600", props.className)}>
```

### Composition Rules

1. **Slot Pattern:** Use `Radix UI` Slot patterns for polymorphism (e.g., making a button render as an `<a>` tag).
2. **No Margins on Hosts:** Components should NOT define external margins (`m-4`). The parent container should control layout/spacing.
3. **Strict Tokens:** Use semantic colors (`bg-primary`, `text-destructive`) instead of raw hex values or arbitrary Tailwind colors (`bg-blue-400`). This ensures Dark Mode works automatically.

## 3. State Management Hierarchy

Do not default to `useState`. Follow this priority order:

1. **URL State (High Priority):** If it's a filter, pagination, or tab, it MUST be in the URL (searchParams).
   * Why? Shareable links and browser history support.
2. **Server State:** Data from the database. Use TanStack Query (Client) or Async/Await (Server).
3. **Form State:** Use React Hook Form + Zod. Never manage form inputs with raw `useState`.
4. **UI State:** (Open/Close toggles). Use `useState` or `useReducer`.
5. **Global State (Last Resort):** Use Zustand. Only for data truly needed globally (e.g., User Session, Sidebar State).

## 4. Anti-Patterns (What to Reject)

If you see these patterns, REFACTOR IMMEDIATELY.

* ⚠️ **Prop Drilling:** Passing props down more than 2 levels. Fix: Use Composition (passing `children`) or Context.
* ⚠️ **`useEffect` for Data Fetching:** Never use `useEffect` to fetch data. Fix: Use TanStack Query or Server Components.
* ⚠️ **Inline Styles:** `<div style={{ marginTop: 20 }}>`. Fix: Use Tailwind `mt-5`.
* ⚠️ **God Components:** Files exceeding 250 lines. Fix: Break into sub-components.

## 5. Accessibility (Non-Negotiable)

AI Agents must enforce accessibility defaults.

* **Interactive Elements:** Must have `aria-label` if no text is visible (e.g., Icons).
* **Images:** Must have meaningful `alt` text.
* **Forms:** All inputs must be linked to a `<label>` via `id`.
* **Focus:** Never remove focus outlines (`outline-none`) without providing a custom `:focus-visible` alternative.

### Example Prompt for Claude/Cursor

"Create a 'UserCard' component. Context: `@ui-patterns.md` `@packages/ui` Requirements:
1. It is a Dumb Component.
2. It accepts `User` object prop (from shared types).
3. Use `Card`, `Avatar`, and `Badge` primitives from Shadcn.
4. Use `cn()` for class merging.
5. NO internal state."

---

## 6. Tailwind CSS v4 Configuration

We use **Tailwind CSS v4** with a CSS-first configuration approach (no `tailwind.config.js`).

### CSS-First Configuration

All customization happens in `app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme inline {
  --color-brand-500: #570df8;
  --spacing-custom: 2.5rem;
  --font-display: "Inter", sans-serif;
}
```

### Key Differences from v3:

- **No `tailwind.config.js`** - all customization in CSS
- Use `@import "tailwindcss"` instead of `@tailwind` directives
- PostCSS uses `@tailwindcss/postcss` plugin
- Theme variables defined with `@theme` directive

### Custom Utilities

Create custom utilities directly in CSS:

```css
@utility btn-custom {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--color-brand-500);
}
```

### Component Integration

- Use **shadcn/ui** components as atomic building blocks
- Legacy compatibility layer for old component styles (`app/globals.css` lines 248-327)
- Focus on semantic design tokens rather than arbitrary colors
- Implement responsive design with Tailwind breakpoints
- Always include proper accessibility attributes