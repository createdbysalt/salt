---
version: "2026-06-08-prototype-takeover"
status: active
name: Salt
description: Warm Lovable gradient meets editorial cream — prototype design system for salt-software.
---

# Salt design system

**Canonical runbook:** [docs/plans/2026-06-01-lovable-ui-migration.md](docs/plans/2026-06-01-lovable-ui-migration.md)

**Sources (external, not vendored in repo):**

| Source | Role |
|--------|------|
| Salt Design System bundle (`colors_and_type.css`, README) | Tokens, voice, visual rules |
| [salt-prototype](https://github.com/Simcoe-House/salt-prototype) | Reference UI (components, interactions) |

**In-repo implementation (single source of truth):**

| File | Role |
|------|------|
| **`app/salt-design.css`** | All `:root` / `.dark` tokens, gradients, shadows, prototype utilities |
| **`app/globals.css`** | Tailwind + shadcn imports, bridge surface scope, legacy compat classes, marketing motion |
| `app/tailwind-base.css` | Deprecated pointer — re-exports `salt-design.css` only |

Legacy v2 blue primary (`#4e58fc`), Linear token blocks, and sharp `--radius: 0` overrides were **removed from `globals.css` on 2026-06-08**. Unported app surfaces inherit prototype tokens immediately; they may look rough until their migration wave lands.

---

## Palette

Warm near-white paper on a cream canvas — never pure `#fff` for page chrome.

| Token | OKLCH | Role |
|-------|-------|------|
| `--ink` | `oklch(0.16 0.012 60)` | Text, filled primary buttons (~`#1a160f`) |
| `--cream` | `oklch(0.972 0.012 75)` | Warm fill accent |
| `--background` | `oklch(0.99 0.008 75)` | Page background |
| `--foreground` | ink | Body text |
| `--card` | `oklch(0.99 0.006 80)` | Elevated surfaces |
| `--muted` | `oklch(0.96 0.010 70)` | Subtle fills |
| `--muted-foreground` | `oklch(0.46 0.014 65)` | Secondary text |
| `--border` | `oklch(0.89 0.012 70)` | Hairline borders |
| `--primary` | ink | Filled buttons (not blue) |
| `--ring` | `--flame` | Focus ring |

**Accent signals** (tints, rings, chips — not large flat fills):

| Token | OKLCH | Use |
|-------|-------|-----|
| `--flame` | `oklch(0.72 0.18 35)` | Primary accent, focus, momentum |
| `--blush` | `oklch(0.78 0.14 18)` | Coral accent |
| `--sky` | `oklch(0.74 0.10 250)` | Dusty blue |
| `--violet` | `oklch(0.66 0.18 320)` | Pink-violet |

**Dark mode:** warm near-black — `#1c1c1c` bg, `#272725` cards, `#40403f` borders, `#c5c1b9` muted text. Not cool gray.

**Status colors** (`--success`, `--warning`, `--destructive`, `--info`) and **relationship chart colors** remain for entity encoding and backward compatibility.

---

## Gradients

One signature family — **mineral aurora** (teal → blue → amber). Hero and AI surfaces only; never flat color blocks behind large areas.

| Token | Geometry | Use |
|-------|----------|-----|
| `--gradient-aurora` | linear 135° | Briefing hero, AI moments, progress fills |
| `--gradient-sunrise` | linear 180° | Vertical hero variant |
| `--gradient-ember` | radial | Corner glow emphasis |
| `--gradient-ink` | linear 180° | Dark depth panels |

**On aurora:** Geist headlines in white (medium, `-0.02em`, never italic); Inter body at ~85% white; eyebrows at ~70% white. Grain overlay keeps text crisp — no scrim. Never put ink text on aurora.

Apply via `.surface-aurora` (gradient + `feTurbulence` grain overlay).

---

## Typography

| Role | Family | Rules |
|------|--------|-------|
| UI / body | **Inter** | 400–700, `-0.011em` tracking, `ss01` + `cv11` features |
| Display | **Geist** | **500** weight, `-0.02em` tracking, line-height ~0.98, `ss01`/`ss02`/`cv11` — **never italic on headlines** |
| Mono | system mono | Tabular nums for stats |

Utility: `.font-display` for Geist headlines. Italic only as muted inline accent in body copy — not on display type.

**Scale:** `.salt-h1` through `.salt-small`, `.salt-eyebrow` (uppercase, `0.16em` tracking) — see `colors_and_type.css` in design bundle.

---

## Shape

- **Base radius:** `1rem` (16px) — `--radius`
- **Cards:** `rounded-2xl` / `rounded-3xl` (24–28px)
- **Heroes:** 28px (`--radius-3xl`)
- **Chips & buttons:** pill (`999px`)
- **Borders:** hairline, often replaced by `.ring-soft`

---

## Shadows

Apple-quiet — soft, layered, low opacity, subtle white inset on light mode:

- `--shadow-card` — resting cards
- `--shadow-lift` — hover / focus elevation
- `--shadow-glow` — blue-tinted AI emphasis

---

## Surfaces & components

| Class | Purpose |
|-------|---------|
| `.surface-aurora` | Gradient hero + grain |
| `.glass-card` | Translucent card, blur 20px, hairline border |
| `.chip` | Uppercase pill label |
| `.ring-soft` | 1px color-mixed ring + faint shadow |
| `.hover-lift` | `translateY(-2px)` + shadow-lift on hover |
| `.kbd` | Keyboard hint badge |
| `.focus-card` | Focused play card elevation |

**Ambient page wash:** large blurred radial blobs in sky/flame/violet at low opacity (fixed behind content).

---

## Motion

| Easing | Value | Use |
|--------|-------|-----|
| Apple ease | `cubic-bezier(0.32, 0.72, 0, 1)` | Panels, tabs, disclosures |
| Rise | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrance (8px up + fade) |

**Animations:** `animate-rise`, `animate-float`, `animate-pulse-glow`, `animate-shimmer`, `animate-grain`

**Reduced motion:** disable ambient loops under `prefers-reduced-motion: reduce`.

**Library:** use `framer-motion` in production (prototype uses `motion` v12 — same API family).

---

## Voice & copy

Calm, confident, time-respecting. Salt is a distinct actor — not "we" or "I".

- **Person:** second person ("you"); Salt in third person ("Salt ran 3 plays for you")
- **Casing:** sentence case everywhere; **eyebrows** uppercase with wide tracking; product nouns capitalized: Play, Player, Memory, Roundtable, Capture, Connection, HQ
- **Buttons:** verb-first, specific — "Review 3 plays", never "Submit"
- **Trust:** show sourcing — "Why Salt suggested this", "What Salt used as context", confidence %
- **Numbers:** specific, tabular — "$4.2k cleared", "3 need you"
- **No emoji** in product UI

Full voice guide: Salt Design System bundle `README.md` → CONTENT FUNDAMENTALS.

---

## Iconography

- **Primary:** Lucide line icons (1.75–2.25 stroke)
- **Channels:** Simple Icons (`react-icons/si`) for Gmail, Slack, Notion, Stripe
- **Brand:** Salt wordmark via CSS mask on `/salt-logo.svg`

---

## Integration constraints

When porting from salt-prototype:

1. Use `@repo/ui` primitives where they fit; match prototype layout with Tailwind + component classes above
2. **Never** copy prototype `data.ts` — use feature `queries.ts` / `actions.ts` and `@/app/_lib/demo` mocks until real DAL exists
3. HQ route is **`/hq`** in production (prototype uses `/`)
4. App UI ships on **`staging`** branch; QA on `app.staging.usesalt.io`
5. Gradients and aurora are **sparse** — hero, AI, confidence rings only

---

## Information architecture (app shell)

Primary nav order matches salt-prototype `Sidebar.tsx`:

| Item | Route | Notes |
|------|-------|--------|
| HQ | `/hq` | Default signed-in home; Today / Upcoming / Stats tabs |
| Connections | `/connections` | Enabled in app (prototype nav item disabled) |
| Plays | `/plays` | Badge when queue count > 0 |
| Capture | `/capture` | Inbox badge |
| Spaces | `/spaces` | Project command centers |

**Memory** (collapsible): People, Orgs, Work, Files, Billing, Convos → `/conversations`, Meetings, Teams, Me.

**Shell layout:**

| Breakpoint | Sidebar | Top bar |
|------------|---------|---------|
| `< md` (768px) | Hidden; hamburger opens 280px drawer | Logo left, Ask Salt right |
| `≥ md` | Sticky 248px column | Search + Conversations + Ask Salt |

**Ask Salt:** Desktop — 420px right panel pushes content. Mobile — full-screen overlay with scroll lock.

**HQ Today grid:** `lg:grid-cols-[1fr_360px]` — main column (BriefingHero + PlayQueue) + SideRail (stacks below on narrow viewports).

---

## Token alignment (Wave 1 + takeover)

All semantic colors, radii, gradients, and prototype component classes live in **`app/salt-design.css`**. `app/globals.css` imports it once at the top — there is no second `:root` block that overrides prototype values.

Domain tokens kept for Memory / entity surfaces until Wave 4–5:

- `--relationship-*` (chart encoding for People, Orgs, Work, Files)
- `--avatar-neutral*` (avatar fallbacks)
- `--success`, `--warning`, `--info`, `--chart-*`

Historical v2 + Linear spec: git history + [docs/plans/2026-05-15-design-system-v2-migration.md](docs/plans/2026-05-15-design-system-v2-migration.md) (superseded).
