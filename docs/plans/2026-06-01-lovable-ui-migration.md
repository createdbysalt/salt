# Plan: Lovable UI migration (runbook)

**Date:** 2026-06-01  
**Status:** In progress — Phase 2 Wave 6 (landing2 homepage) shipped locally; app shell waves pending  
**Owner:** Product / engineering  

## Context

Salt’s next visual system is built in **Lovable**. You will have **the full Lovable project source code** (export or separate repo)—not only a hosted preview URL. That codebase is the **reference implementation** for UI; production still ships from **`salt-software`** with Supabase, auth, and Stripe.

The in-repo UI today (v2 tokens in [`DESIGN.md`](../../DESIGN.md), OKLCH in `app/tailwind-base.css`, agent skills citing Linear/Ramp) will be **replaced** when you are ready—not incrementally “tweaked.”

This document is the **runbook** for the port. **Phase 1 (design clearance)** is complete. Say “**start Lovable migration**” to begin **Phase 2** (capture Lovable spec from source code).

**Environments:** See [`docs/guides/deployment-environments.md`](../guides/deployment-environments.md) for Lovable demo vs `main` vs `staging`.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Lovable project URL** | Canonical hosted demo link; optional custom domain (`demo.usesalt.io`) |
| **Lovable source code** | Full project code available for diff, token extraction, and porting |
| **Screen map** | Every surface tagged **Ready** or **TBD** (partial Lovable is OK) |
| **Scope** | **App + marketing** — `app.usesalt.io` and `usesalt.io` public pages |
| **Staging** | Git branch `staging`, Vercel `app.staging.usesalt.io`, separate Supabase project |
| **`main` protected** | PR + CI; releases via `staging` → `main` |
| **No big-bang** | Port in waves; one wave per release when possible |

---

## Phase 1 — Design clearance (mandatory before port)

**Goal:** Stop agents and docs from re-imposing the old system while you build the new one.

**Inventory:** [`2026-06-01-design-clearance-inventory.md`](2026-06-01-design-clearance-inventory.md)

**Actions (summary):**

1. Replace [`DESIGN.md`](../../DESIGN.md) with a **stub** pointing to this runbook until Lovable tokens are captured.  
2. Mark [`2026-05-15-design-system-v2-migration.md`](2026-05-15-design-system-v2-migration.md) as **Historical — superseded**.  
3. Neutralize UI agent/skills: remove enforced Linear Standard, OKLCH-only, Bridge/Studio splits, “never custom tokens.”  
4. Add banners to `docs/guides/*` UI guides: visual rules TBD until Lovable capture.  
5. **Do not** delete `tailwind-base.css` or components yet—the app must keep running.

**Exit criteria:** `rg "Linear Standard" .cursor/skills .claude/agents` returns only historical/archive paths; `DESIGN.md` is stub or Lovable-filled.

---

## Phase 2 — Capture Lovable spec

**Goal:** One in-repo source of truth derived from **Lovable source code** (and hosted preview)—not from memory.

| Step | Tool / method |
|------|----------------|
| **Code inventory** | Map Lovable routes/components → Salt `app/` routes; note stack differences (deps, routing, data) |
| Screen inventory | Lovable repo file tree + hosted URL + screenshots (desktop + mobile) |
| Tokens | Extract from Lovable CSS/Tailwind/theme files; validate with `style-extractor` or live URL if needed |
| Motion | Lovable code + `animation-extractor` where relevant |
| IA / nav | Sidebar order, HQ entry, marketing nav—from Lovable layout components |
| Populate `DESIGN.md` | YAML front matter + rules from Lovable tokens (then align `globals.css` in Wave 1) |
| Sanity CMS | Note which marketing copy stays in Sanity vs hardcoded in Lovable |
| **Integration rules** | Document what must change when porting: `@repo/ui`, DAL, server actions, RLS, no Lovable-only APIs |

**Exit criteria:** `DESIGN.md` version bumped; design-sync (`/design-sync`) audit passes against planned `globals.css` changes.

---

## Phase 3 — Port waves

Merge each wave to **`staging`** first; release to **`main`** when QA passes.

| Wave | Scope | Acceptance criteria |
|------|--------|------------------------|
| **1 — Tokens** | `app/tailwind-base.css`, `app/globals.css`, `packages/theme` | App builds; no visual regressions on unported pages beyond token shift |
| **2 — Shell** | `DashboardLayoutWrapper`, `AppSidebar`, `HqSidebar`, nav | Auth gate works; `/hq` loads on staging subdomain |
| **3 — HQ** | `app/(hq)/hq/**`, inbox, insights | Core daily loop matches Lovable Ready screens |
| **4 — Core app** | People, Plays, Capture, Connections, Conversations | E2E smoke for each surface updated |
| **5 — Extended app** | Roundtables, Meetings, Work, settings, orgs | Ready screens only; TBD deferred |
| **6 — Marketing** | `(public)/*`, `app/_features/marketing` | `usesalt.io` matches Lovable; Sanity paths documented |
| **7 — Tests & agents** | `e2e/tests/*`, UI skills/agents | All targeted E2E green; agents cite `DESIGN.md` only |

**Per-PR checklist:**

- [ ] Ported from Lovable (path in Lovable codebase + PR link to hosted screen if useful)  
- [ ] Uses `@repo/ui` / `@repo/patterns`—no new ad-hoc wrappers unless spec requires  
- [ ] No `any`, no `@ts-ignore`  
- [ ] Co-located tests updated; E2E grep run for affected flows  
- [ ] `pnpm typecheck` + `pnpm test` on touched packages  

---

## Phase 4 — Agent & documentation sync

After `DESIGN.md` reflects Lovable:

| Artifact | Action |
|----------|--------|
| `.cursor/skills/frontend-design` | Lovable + `@repo/ui`; remove Bridge/Studio split |
| `.cursor/skills/interaction-patterns` | Align motion to captured spec |
| `.cursor/skills/ux-scout` | Reference Lovable + `DESIGN.md` |
| `.claude/agents/design-system-guardian` | Enforce Lovable tokens, not v2 OKLCH mandate |
| `.claude/tool-registry.md` | UI row = Lovable port workflow |
| `docs/guides/agent-component-guide.md` | Full refresh |
| `brand-identity` UX copy | Update voice-principles Linear section |

**Dual harness:** Update Cursor skills first; sync `.claude/` per [`docs/guides/dual-agent-setup.md`](../guides/dual-agent-setup.md).

---

## Environments during migration

| Surface | Where | Use during port |
|---------|--------|-----------------|
| **Design / pitch** | Lovable URL | Reference only |
| **Integration** | `app.staging.usesalt.io` | Every wave QA |
| **Production** | `app.usesalt.io` | Release when wave ships |
| **Local** | `localhost:3000` | Dev; `app.lvh.me` for subdomain testing |

Do **not** enable in-repo `NEXT_PUBLIC_DEMO_MODE` on Vercel while Lovable is the demo ([`app/_lib/feature-flags`](../architecture/auth-flow.md)).

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Agents revert UI to old canon | Phase 1 clearance before Wave 1 |
| Big-bang PR | Wave boundaries + staging |
| E2E locator debt | Update tests in same PR as surface port |
| Lovable / repo drift | PR links to Lovable page; Ready vs TBD tracker |
| Staging → prod data leak | Separate Supabase project + keys |
| Sanity vs Lovable marketing | Document content ownership per page |

---

## Definition of done (full migration)

- [ ] All **Ready** Lovable screens ported on `main`  
- [ ] `DESIGN.md` matches production CSS  
- [ ] UI agents/skills aligned (clearance inventory checklist complete)  
- [ ] E2E suite green on staging and production smoke  
- [ ] [`deployment-environments.md`](../guides/deployment-environments.md) checklist complete for staging  
- [ ] Lovable kept as archive or retired (team decision)

---

## Related documents

| Document | Purpose |
|----------|---------|
| [2026-06-01-design-clearance-inventory.md](2026-06-01-design-clearance-inventory.md) | What to clear before port |
| [deployment-environments.md](../guides/deployment-environments.md) | Branches, domains, env vars |
| [2026-05-15-design-system-v2-migration.md](2026-05-15-design-system-v2-migration.md) | Historical in-repo v2 work |

---

## Execution triggers (voice)

| Phrase | Starts |
|--------|--------|
| “start design clearance” | Phase 1 |
| “start Lovable migration” | Phase 2+ (after clearance) |
| “port wave N” | Specific wave in Phase 3 |
