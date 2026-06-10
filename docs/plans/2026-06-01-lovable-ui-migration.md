# Plan: Prototype UI migration (runbook)

**Date:** 2026-06-01 (updated 2026-06-10)  
**Status:** In progress — Waves 1–6 core surfaces shipped on **`staging`**; setup/onboarding/me/teams/work added; settings deferred  
**Owner:** Product / engineering  

## Context

Salt’s next visual system comes from two external sources (not committed to this repo):

| Source | Role |
|--------|------|
| **Salt Design System bundle** | Canonical tokens, voice, visual rules, component specimens (local export) |
| **salt-prototype** (`Simcoe-House/salt-prototype`) | Reference implementation — routes, components, interactions, mock data |

Production still ships from **`salt-software`** (Next.js App Router, Supabase, auth, Stripe). The prototype is the **UI blueprint**, not a drop-in backend.

The in-repo UI (v2 tokens, OKLCH in `app/tailwind-base.css`, Linear/Ramp agent canon) is being **replaced** in waves—not incrementally tweaked.

**Branch workflow:** App UI waves merge to **`staging`** first; QA on `app.staging.usesalt.io`; release to **`main`** only when launch-ready. See [`deployment-environments.md`](../guides/deployment-environments.md).

**Environments:** Lovable-hosted demo is optional reference; canonical code is **salt-prototype**.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **salt-prototype source** | Local checkout or GitHub `Simcoe-House/salt-prototype` |
| **Salt Design System bundle** | External export — tokens extracted into `DESIGN.md` + CSS (not vendored) |
| **Screen map** | Every surface tagged **Ready** or **TBD** (see below) |
| **Scope** | **App + marketing** — `app.usesalt.io` and `usesalt.io` public pages |
| **Staging** | Git branch `staging`, Vercel `app.staging.usesalt.io`, separate Supabase project |
| **`main` protected** | PR + CI; app releases via `staging` → `main` |
| **No big-bang** | Port in waves; one wave per PR when possible |

---

## Phase 1 — Design clearance ✅ Complete

**Inventory:** [`2026-06-01-design-clearance-inventory.md`](2026-06-01-design-clearance-inventory.md)

**Exit criteria met:** `DESIGN.md` stub in place; old v2 canon neutralized in agent skills.

---

## Phase 2 — Capture spec ✅ Complete (2026-06-08)

**Goal:** One in-repo source of truth derived from **Salt Design System bundle** + **salt-prototype** `src/styles.css` — not from memory.

| Step | Tool / method | Status |
|------|----------------|--------|
| **Code inventory** | Map prototype routes/components → Salt `app/` routes | Done — screen map below |
| Screen inventory | Prototype file tree + screen map table | Done |
| Tokens | Extract from design system + `app/salt-design.css` | Done — Wave 1 |
| Motion | Prototype CSS keyframes + design system README | Captured in `DESIGN.md` |
| IA / nav | Sidebar order, HQ entry — from prototype `Sidebar.tsx` | Captured in `DESIGN.md` |
| Populate `DESIGN.md` | YAML front matter + rules from captured tokens | Done (`2026-06-08-prototype-takeover`) |
| Sanity CMS | Marketing copy on public pages | Homepage/waitlist hardcoded in `landing2`; legal/pricing may use Sanity — see marketing feature |
| **Integration rules** | `@repo/ui`, DAL, server actions, RLS; HQ at `/hq` | Documented in `DESIGN.md` |

**Exit criteria met:** `DESIGN.md` version `2026-06-08-prototype-takeover`; token alignment documented in `DESIGN.md` → `app/salt-design.css` (via `tailwind-base.css` re-export).

---

## Screen inventory (prototype → salt-software)

| Prototype route / component | salt-software target | Wave | Status |
|----------------------------|----------------------|------|--------|
| `/landing2` | `/` (homepage) | 6 | **Done** — [`app/_features/marketing/landing2/`](../../app/_features/marketing/landing2/) |
| `/waitlist` | `/waitlist` | 6 | **Done** |
| `/` (HQ) | `/hq` | 3 | **Done** — Today, Upcoming, Stats tabs |
| `Sidebar`, `TopBar` | `AppSidebar`, `SiteHeader`, `DashboardShellLayout` | 2 | **Done** — mobile drawer + desktop sidebar |
| `hq/*` (BriefingHero, PlayQueue, SideRail, AskSalt) | `app/_features/hq/` + shell | 3 | **Done** — mock queue + Ask Salt panel |
| `/plays` | `/plays` | 4 | **Done** — Queue, Players, Playbooks, Activity tabs + review mode |
| `/capture` | `/capture` | 4 | **Done** — Queue, Stream tabs + review mode |
| `/people`, `/orgs` | `/people`, `/orgs` | 4–5 | **Done** |
| `/work` | `/work` | 5 | **Done** — Memory directory table (demo data) |
| `/setup` | `/setup` | 5 | **Done** — checklist shell |
| `/onboarding` | `/onboarding` (public) | 5 | **Done** — 5-step prototype flow |
| `/files`, `/billing` | `/files`, `/billing` | 5 | **Done** — Memory shell, DataTable, demo data |
| `/roundtables` | `/roundtables` | 5 | **Done** — index grid; detail routes still legacy |
| `/settings` | `/settings/*` | 5 | **Deferred** — different structure |
| Connections (disabled in prototype) | `/connections` | 4 | **Done** — Graph, Insights, Paths tabs |
| Convos | `/conversations` | 4 | **Done** — Pending + Threads split inbox; messaging actions preserved |
| Meetings | `/meetings` | 5 | **Done** — stats strip + directory table (demo data) |
| `/me` | `/me` | 5 | **Done** — hero + tabs (Overview, Preferences, Goals, Salt Memory, Activity) |
| `/teams` | `/teams` | 5 | **Done** — stats strip + directory table (demo data) |

---

## Phase 3 — Port waves

Merge each wave to **`staging`** first; release to **`main`** when QA passes.

| Wave | Scope | Acceptance criteria |
|------|--------|------------------------|
| **1 — Tokens** | `app/salt-design.css`, `app/globals.css`, `packages/theme` | ✅ Done — app builds; landing2 on `/` |
| **2 — Shell** | `DashboardShellLayout`, `AppSidebar`, `SiteHeader` | ✅ Done — auth gate; mobile drawer; `/hq` loads |
| **3 — HQ** | `app/(hq)/hq/**`, `app/_features/hq/` | ✅ Done — Today / Upcoming / Stats match prototype Ready screens |
| **4 — Core app** | People, Plays, Capture, Connections, Conversations | ✅ Done — E2E smoke where routes exist |
| **5 — Extended app** | Roundtables, Meetings, Files, Billing (not settings) | ✅ Done — index/list surfaces; roundtable detail legacy |
| **6 — Marketing** | `(public)/*`, marketing features | landing2 done; remainder TBD |
| **7 — Tests & agents** | `e2e/tests/*`, UI skills/agents | E2E green; agents cite `DESIGN.md` |

**Per-PR checklist:**

- [ ] Ported from salt-prototype (path in prototype + PR note)  
- [ ] Tokens match `DESIGN.md`  
- [ ] Uses `@repo/ui` / `@repo/patterns` where possible  
- [ ] No `any`, no `@ts-ignore`  
- [ ] Co-located tests updated; E2E grep for affected flows  
- [ ] `pnpm typecheck` + `pnpm test` on touched packages  

---

## Phase 4 — Agent & documentation sync

After `DESIGN.md` reflects prototype tokens:

| Artifact | Action |
|----------|--------|
| `.cursor/skills/frontend-design` | Prototype + `@repo/ui`; remove Bridge/Studio split |
| `.cursor/skills/interaction-patterns` | Align motion to captured spec |
| `.cursor/skills/ux-scout` | Reference prototype + `DESIGN.md` |
| `.claude/agents/design-system-guardian` | Enforce prototype tokens |
| `docs/guides/agent-component-guide.md` | Full refresh |

**Dual harness:** Update Cursor skills first; sync `.claude/` per [`docs/guides/dual-agent-setup.md`](../guides/dual-agent-setup.md).

---

## Environments during migration

| Surface | Where | Use during port |
|---------|--------|-----------------|
| **Reference UI** | salt-prototype (local / GitHub) | Component + interaction source |
| **Integration** | `app.staging.usesalt.io` | Every wave QA |
| **Production** | `app.usesalt.io` | Release when wave ships |
| **Local app work** | `localhost:3000` on **`staging`** branch | `pnpm dev:staging:op` |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Agents revert UI to old canon | Phase 1 clearance; enforce `DESIGN.md` after capture |
| Big-bang PR | Wave boundaries + staging |
| E2E locator debt | Update tests in same PR as surface port |
| Prototype / repo drift | Screen inventory; re-diff when prototype updates |
| Mock data copied into prod | Port UI only; DAL + RLS unchanged |
| External DS bundle drifts | Re-run capture when prototype updates |

---

## Definition of done (full migration)

- [ ] All **Ready** prototype screens ported on `main`  
- [ ] `DESIGN.md` matches production CSS  
- [ ] UI agents/skills aligned  
- [ ] E2E suite green on staging and production smoke  
- [ ] [`deployment-environments.md`](../guides/deployment-environments.md) checklist complete  

---

## Related documents

| Document | Purpose |
|----------|---------|
| [2026-06-01-design-clearance-inventory.md](2026-06-01-design-clearance-inventory.md) | Phase 1 clearance |
| [deployment-environments.md](../guides/deployment-environments.md) | Branches, domains, env vars |
| [2026-05-15-design-system-v2-migration.md](2026-05-15-design-system-v2-migration.md) | Historical in-repo v2 work |
| [`DESIGN.md`](../../DESIGN.md) | In-repo visual canon |

---

## Execution triggers (voice)

| Phrase | Starts |
|--------|--------|
| “start prototype migration” | Phase 2+ (capture + waves) |
| “port wave N” | Specific wave in Phase 3 |
