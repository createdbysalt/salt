---
name: interaction-patterns
description: Production-grade interaction patterns extracted from Linear, Vercel, and Claude. Use when building UI components that need premium animations, hover states, loading feedback, or transitions. Provides exact Framer Motion and CSS implementations.
---

# Interaction Pattern Library

A curated collection of interaction patterns extracted from premium software. Each pattern includes exact values from production implementations—no guessing required.

## When to Use This Skill

Load this skill when working on:
- UI components with hover states
- Loading indicators and skeletons
- Modal/drawer/popover transitions
- Toast/notification animations
- Button feedback (press, success, error)
- Page or view transitions
- Any animation work requiring premium feel

## Pattern Categories

### `/patterns/feedback/`
Micro-interactions that provide immediate response to user actions.
- `button-press.json` - Tactile button press effect
- `success-checkmark.json` - Animated success confirmation
- `error-shake.json` - Error state shake animation

### `/patterns/loading/`
Loading states that feel responsive and polished.
- `skeleton-pulse.json` - Content placeholder animation
- `spinner.json` - Minimal loading spinner

### `/patterns/navigation/`
View transitions and layout animations.
- `modal-open.json` - Modal entrance/exit
- `sidebar-slide.json` - Sidebar expand/collapse
- `page-transition.json` - Route change animation

### `/patterns/hover/`
Hover states that feel alive without being distracting.
- `card-lift.json` - Card elevation on hover
- `button-glow.json` - Subtle button highlight

## How to Find a Pattern

1. **Identify the intent**: What user action or state change needs animation?
2. **Choose category**: feedback, loading, navigation, or hover
3. **Browse patterns**: Each pattern has `whenToUse` field
4. **Copy implementation**: Use `framerMotion` for React or `css` for vanilla

## How to Apply a Pattern

### With Framer Motion (Recommended)

```tsx
import { motion } from 'framer-motion';

// From patterns/hover/card-lift.json
<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
>
  Card content
</motion.div>
```

### With CSS (Fallback)

```css
/* From patterns/hover/card-lift.json */
.card {
  transition: transform var(--duration-fast) var(--ease-out-expo);
}
.card:hover {
  transform: scale(1.02) translateY(-2px);
}
```

## CSS Custom Properties

Use these tokens from `app/globals.css`:

```css
/* Easing */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);    /* Most common */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
--ease-out-circ: cubic-bezier(0, 0.55, 0.45, 1);
--ease-out-back: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
--ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1);

/* Durations */
--duration-micro: 100ms;   /* Instant feedback */
--duration-fast: 150ms;    /* Hover, press */
--duration-normal: 200ms;  /* Standard transitions */
--duration-slow: 300ms;    /* Enter animations */
--duration-slower: 400ms;  /* Complex transitions */
```

## Accessibility

Every pattern includes a `reducedMotion` field. Always respect user preferences:

```tsx
import { useReducedMotion } from 'framer-motion';

const Card = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
    >
      Content
    </motion.div>
  );
};
```

## Pattern Schema

Each pattern follows this structure:

```json
{
  "id": "unique-pattern-id",
  "name": "Human Readable Name",
  "source": { "site": "linear.app", "extractedAt": "2026-01-31" },
  "intent": "hover | feedback | loading | navigation",
  "description": "What this pattern does",
  "whenToUse": "List of appropriate use cases",
  "framerMotion": { /* Framer Motion props */ },
  "css": { /* CSS fallback */ },
  "accessibility": { "reducedMotion": "Behavior description" }
}
```

## Integration with Ralph

When Ralph encounters a UI component story, it should:
1. Check if an interaction pattern applies
2. Look up the exact implementation from this library
3. Use the pattern values instead of guessing

This ensures every animation in Salt Core matches the quality bar of Linear, Vercel, and Claude.
