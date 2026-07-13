# **Project Overview**

* **Product**: Salt is the proactive AI operating layer for solo creative and service professionals. It reads connected accounts and business context, surfaces what matters (including revenue you're leaving on the table), prepares work and growth-plan steps, and waits for approval.
* **Product Shape**: `LEARN -> ACT -> GROW` (LEARN includes opportunity gaps; ACT includes growth-plan automatable steps; GROW is approval and earned autonomy)
* **Tech Stack**: Next.js 15.5.x, React 19.2.x, TypeScript 5.9.3, Tailwind CSS 4, Supabase (PostgreSQL + Auth + Storage), Stripe
* **Architecture**: Full-stack Next.js App Router with Server Actions and API routes. No separate backend server - everything runs on port 3000
* **Key Goals**: Velocity, Type Safety, and Atomic Commits.

## **Dual agent harness (Cursor + Claude Code)**

| Primary | Backup | Shared source of truth |
|---------|--------|------------------------|
| **Cursor** (`.cursorrules`, `.cursor/rules/`, `.cursor/skills/`) | **Claude Code** (`.claude/agents/`, `.claude/commands/`) | **`CLAUDE.md`** (this file + nested), `docs/` |

Full setup guide: **`docs/guides/dual-agent-setup.md`** · Entry: **`AGENTS.md`** · Greptile: **`docs/guides/greptile-setup.md`**

- Cursor: velocity triggers (`qplan`, `qcode`, `qresearch`, …) in `.cursorrules`
- Claude: slash commands (`/database`, `/ralph`, `/research`, …) in `.claude/commands/`
- Secrets: `pnpm dev:op` and `op run --env-file=.env.1password -- open -a Cursor .`

---

## **⚡️ Operational Commands (The "Golden Path")**

*Explicitly defined to prevent hallucination of 'yarn' or 'make' commands.*

> **⚠️ CRITICAL: Always use `pnpm`, NEVER `npm` or `yarn`**
> This project uses pnpm exclusively. All commands must use `pnpm` (e.g., `pnpm install`, `pnpm add`, `pnpm run`). Using npm or yarn will cause lockfile conflicts and dependency issues.

* **Start Dev**: `pnpm dev:op` (Uses 1Password for secrets — **recommended**)
* **Start Dev (backup)**: `pnpm dev` (Uses `.env.local` — only if 1Password unavailable)
* **Build**: `pnpm build`
* **Lint & Fix**: `pnpm lint --fix`
* **Install Deps**: `pnpm install` (never `npm install`)
* **Add Package**: `pnpm add <package>` (never `npm install <package>`)
* **Database Update**: `pnpm dlx supabase db push`

> **⚠️ CRITICAL: Port 3000 Requirement**
> The application MUST run on port 3000 due to hardcoded database configurations for testing. If port 3000 is in use, kill the process and restart the dev server. E2E tests will fail if running on any other port.

> **Screenshots**: Save development screenshots to `.screenshots/` (gitignored). Never save PNGs to the project root.

### Testing Commands

* **Unit Tests**: `pnpm test`
* **Unit Tests (Watch)**: `pnpm test:watch`
* **E2E Tests**: `pnpm test:e2e`
* **E2E Debug**: `pnpm test:e2e --ui`
* **All Tests**: `pnpm test:all`

### Package Source Access (opensrc)

**opensrc** fetches and caches source code from npm, PyPI, crates.io, and GitHub. Use it when you need to understand library internals beyond TypeScript types.

```bash
pnpm opensrc path zod          # Get path to Zod source (fetches on first use)
pnpm opensrc path react        # Get path to React source
pnpm opensrc path vercel/ai    # Get path to GitHub repo
pnpm opensrc list              # Show all cached packages
```

**When to consult package source:**

| Scenario | Example |
|----------|---------|
| Debugging library behavior | "Why does Stripe's `confirmPayment` throw this error?" → Read the source |
| Understanding undocumented APIs | "What options does `next/image` actually accept?" → Check the source |
| Finding implementation patterns | "How does react-hook-form handle validation internally?" → Study the source |
| Investigating edge cases | "What happens when zod schema has circular refs?" → Read the validation logic |

**Workflow:**
```bash
# 1. Get the source path
SOURCE=$(pnpm opensrc path zod)

# 2. Search for relevant code
rg "safeParse" $SOURCE

# 3. Read specific files
cat $SOURCE/src/types.ts
```

> **Note:** Cache is stored globally at `~/.opensrc`, not in the project. First fetch downloads the package; subsequent calls return the cached path instantly.

### App Routing

The current product is the Salt app, served under `app.usesalt.io` in production. Bridge/Table-era routing is retired as product canon; do not introduce new `bridge`, `/bridge`, `/studio`, or `/table` references unless maintaining legacy compatibility.

Primary app routes:

| Production URL | Local URL | Surface |
|----------------|-----------|---------|
| `app.usesalt.io/hq` | `localhost:3000/hq` | HQ |
| `app.usesalt.io/plays` | `localhost:3000/plays` | Plays |
| `app.usesalt.io/plays?tab=activity&view=captures` | `localhost:3000/plays?tab=activity&view=captures` | Captures (inside Plays Activity) |
| `app.usesalt.io/spaces` | `localhost:3000/spaces` | Spaces |
| `app.usesalt.io/connections` | `localhost:3000/connections` | Connections |
| `app.usesalt.io/people` | `localhost:3000/people` | People |
| `app.usesalt.io/work` | `localhost:3000/work` | Work |
| `app.usesalt.io/conversations` | `localhost:3000/conversations` | Conversations |
| `app.usesalt.io/meetings` | `localhost:3000/meetings` | Meetings |
| `app.usesalt.io/me` | `localhost:3000/me` | Me |
| `app.usesalt.io/billing` | `localhost:3000/billing` | Billing |
| `app.usesalt.io/settings` | `localhost:3000/settings` | Settings (`app/(settings)/`) |

**Legacy redirects:** `/capture` → Plays Activity Captures; `/notes` → `/me`; `/roundtables` and `/tables` → `/spaces`.

Use `localhost:3000/*` for normal development. Only use subdomain-style local testing if a task specifically touches host-based routing.

---

## **🧠 Role & Behavior (Velocity Protocol)**

You are a Senior Engineer. Your goal is "Velocity with Precision."

1. **Context First**: Never guess file paths. Use `Glob`, `rg`, or targeted file reads to locate files before editing.
2. **Skeptical Coding**: Assume existing code might be outdated; trust the file content you read over your training data.
3. **No "Lazy" Fixes**: Never use `any`, `// @ts-ignore`, or placeholder comments like `// ... rest of code`.
4. **Confirm Destructive Actions**: Ask for confirmation before deleting files or running bulk database migrations.

---

## **🚀 Velocity Shortcuts (Trigger Words)**

*Use these triggers to enforce reliable workflows:*

| Trigger | Action |
|---------|--------|
| `qplan` | Analyze the request and codebase. Draft a step-by-step plan. Identify files to create/modify. **For EACH step, include the specific tool/skill/command to use** (see Tool Auto-Assignment below). **Use Cursor plan mode / `.cursor/plans/` for active plans unless the user explicitly asks for a docs plan.** DO NOT write code yet. |
| `qcode` | Implement the approved plan. **Use the tools specified for each step** (e.g., `/frontend-design` for UI). Follow TDD: Write test → Fail → Write code → Pass. Run linter before finishing. |
| `qtest` | Write or run tests. **Determine test type:** Unit (Vitest) for pure logic/components, E2E (Playwright) for user flows. Read `docs/guides/testing-strategy.md` first. Use `/testing-patterns` skill for unit tests, `/webapp-testing` skill for E2E. Run `pnpm test` (unit) or `pnpm test:e2e` (E2E). |
| `qcheck` | Review changes for: 1) Security vulnerabilities 2) Type safety 3) Performance bottlenecks 4) Alignment with project patterns. **Run `pnpm test` to verify tests pass.** |
| `qfix` | Read the error message, analyze the stack trace with `rg`, and propose a fix. |
| `qrestart` | Kill any process on port 3000 (`lsof -ti:3000 \| xargs kill -9`), then start the dev server (`pnpm dev:op`). Use when port 3000 is occupied or the server needs a fresh restart. |
| `qrestart:staging` | Same as `qrestart`, but staging Supabase + 1Password: run **`/devup-staging`** or `pnpm dev:staging:restart:op`. |

### Tool Auto-Assignment (`qplan`)

**Every step in a qplan MUST include its recommended tool.**

> **Full tool registry:** `.claude/tool-registry.md`
>
> When adding new tools, update the registry. The qplan will reference it for auto-assignment.

**Quick Reference (most common):**

| Phase | Tools |
|-------|-------|
| Research | `/scout`, `/research`, `/database explore` |
| Frontend | `/frontend-design` **(MANDATORY)**, `/replicate`, `/ds-check` |
| Backend | `/database migration`, `/payment audit` |
| Testing | `/testing-patterns`, `/webapp-testing` |
| Review | `/ux-review`, `/pragmatic-code-review` |

**Frontend Design Requirements:**
- Use vanilla shadcn/ui components from `@repo/ui`
- Read `packages/ui/CLAUDE.md` for component patterns
- Loading states: use `<Loader2 className="animate-spin" />` from lucide-react (NOT a `loading` prop)
- Copy patterns from shadcn docs when unsure

### Plan File Format (`qplan`)

When `qplan` is triggered, use Cursor plan mode / `.cursor/plans/` for active execution plans unless the user explicitly asks for a durable docs plan. If a durable docs plan is requested, save a markdown file to `docs/plans/YYYY-MM-DD-<feature-name>.md` with this structure:

```markdown
# Plan: <Feature Name>
**Date:** YYYY-MM-DD
**Status:** Draft | Approved | In Progress | Complete

## Context
Brief description of the problem/feature and why we're doing this.

## Research Summary
Key findings from /scout, /research, or codebase analysis.

## Implementation Plan

> **Note:** Each step MUST include its tool in `[brackets]`. Frontend work MUST use `/frontend-design`.

### Phase 1: <Name>
- [ ] Step 1 `[tool: /scout feature-name]`
- [ ] Step 2 `[tool: /frontend-design]`

### Phase 2: <Name>
- [ ] Step 3 `[tool: /ds-check]`

## Files to Create/Modify
| File | Action | Purpose | Tool |
|------|--------|---------|------|
| `path/to/file.tsx` | Create | Description | `/frontend-design` |
| `path/to/query.ts` | Modify | Description | — |

## Tool Summary

> Tools auto-assigned from `.claude/tool-registry.md`. Delete rows not applicable.

| Phase | Tools | Purpose |
|-------|-------|---------|
| Research | `/scout`, `/research` | UX patterns, deep research |
| Frontend | `/frontend-design`, `/ds-check` | **MANDATORY** for UI work |
| Backend | `/database explore`, `/database migration` | Schema, migrations |
| Testing | `/testing-patterns`, `/webapp-testing` | Unit + E2E tests |
| Review | `/ux-review` | Post-implementation UX audit |

*See full registry for additional tools: `.claude/tool-registry.md`*

## Open Questions
- Question 1?

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Risk 1 | How we'll handle it |
```

---

## **🧪 Testing Strategy**

**Full strategy:** See `docs/guides/testing-strategy.md`

> **⚠️ CRITICAL: Must run on port 3000 for testing!** All database and testing configurations expect the dev server to be running on localhost:3000. If another process is using port 3000, kill it before running tests.

### Rules (Non-Negotiable)

| Rule | Requirement |
|------|-------------|
| **Toolchain** | Vitest (unit) + Playwright (E2E). **Never Jest. Never Cypress.** |
| **Unit tests** | Co-locate next to source files (`*.test.ts`) |
| **E2E tests** | Isolated in `e2e/` (`*.spec.ts`) |
| **Locators** | Use `getByRole`, `getByLabel`, `getByText`. **Never CSS selectors or XPath.** |
| **Philosophy** | Test behavior, not implementation. Follow the Testing Trophy model. |

### Location Pattern
```
app/_features/auth/components/
├── AuthTokenHandler.tsx
└── AuthTokenHandler.test.tsx   ← Unit test (co-located)

e2e/tests/
└── auth.setup.ts               ← E2E test (isolated)
```

### Keeping Tests Synchronized (Anti-Drift Protocol)

**When making UI changes, ALWAYS update corresponding E2E tests:**

1. **Route changes**: Update `page.goto()` paths in E2E tests
2. **Button/label text changes**: Update `getByRole`/`getByText` selectors
3. **Component restructuring**: Update locator strategies
4. **Feature removal**: Delete or skip obsolete tests

**Workflow:**
```bash
# After UI changes, run affected E2E tests
pnpm test:e2e --grep "feature-name"

# Debug failing tests visually
pnpm test:e2e --ui

# Check test trace on failure
pnpm exec playwright show-trace path/to/trace.zip
```

**Common Selector Fixes:**
| Change | Fix |
|--------|-----|
| Button text `Save` → `Submit` | `getByRole('button', { name: /submit/i })` |
| Route `/old-surface/x` → `/hq` or current app surface | `page.goto('/hq')` |
| Renamed component | Update test file name and locators |

---

## **📚 Critical Documentation Index**

*(Do not hallucinate features. Read these files for ground truth.)*

| Topic | File |
|-------|------|
| Product Truth | `./brand-identity/foundation/product-truth.md` |
| Engineering index | `./brand-identity/INDEX-engineering.md` |
| Feature Inventory | `./brand-identity/product/feature-inventory.md` |
| Engineering specs | `./brand-identity/product-internal/features/` |
| Feature Briefs (public) | `./brand-identity/product/features/` |
| Auth Flow | `./docs/architecture/auth-flow.md` |
| Database Schema | `./docs/architecture/database-schema.md` |
| **Connector System** | `./docs/architecture/connector-system.md` |
| Security Model | `./docs/architecture/security-model.md` |
| API Standards | `./docs/guides/api-standards.md` |
| Testing Strategy | `./docs/guides/testing-strategy.md` |
| UI Patterns & Tailwind v4 | `./docs/guides/ui-patterns.md` |
| Coding Conventions | `./docs/guides/coding-conventions.md` |
| Memory Activity Parity | `./docs/guides/memory-activity-parity.md` |
| Error Handling | `./docs/guides/error-handling.md` |
| Stripe Integration | `./docs/guides/stripe-integration.md` |
| Folder Structure | `./docs/reference/folder-structure.md` |
| Environment Variables | `./docs/reference/environment-variables.md` |

### LEARN → ACT → GROW Primitives

Salt's proactive AI is built on three primitives. **Read these before building playbooks or tools.**

| Topic | File | Purpose |
|-------|------|---------|
| **Primitives Overview** | `./docs/architecture/primitives.md` | **START HERE** — Signals, Tools, Playbooks |
| Signals Reference | `./docs/architecture/signals.md` | Signal taxonomy and registry |
| Tools Reference | `./docs/architecture/tools.md` | Tool contracts and risk classes |
| Playbooks Reference | `./docs/architecture/playbooks.md` | Playbook structure and execution model |
| Memory Tools | `./app/_lib/memory-tools/CLAUDE.md` | Protected Memory mutation tools |
| Playbook Schema v2 | `./app/_features/plays/playbooks/schema/v2/CLAUDE.md` | YAML schema for playbook definitions |

### Design System (AI-Optimized)

| Topic | File | Purpose |
|-------|------|---------|
| Agent Component Guide | `./docs/guides/agent-component-guide.md` | **START HERE** - AI-optimized quick reference |
| Component Decision Matrix | `./docs/guides/component-decision-matrix.md` | WHEN to use each component |
| Component Cookbook | `./docs/guides/component-cookbook.md` | HOW to use with real examples |
| Page Templates | `./docs/guides/page-templates.md` | ListPage, DetailPage, FormPage skeletons |
| Integration Patterns | `./docs/guides/integration-patterns.md` | Server Actions, Suspense, Optimistic UI |
| UI Primitives | `./packages/ui/CLAUDE.md` | @repo/ui component details |
| Composed Patterns | `./packages/patterns/CLAUDE.md` | @repo/patterns usage |

### Brand Identity (Product & Voice)

| Topic | File |
|-------|------|
| Product Truth | `./brand-identity/foundation/product-truth.md` |
| Brand Architecture | `./brand-identity/foundation/brand-architecture.md` |
| Target Audience (ICP) | `./brand-identity/foundation/target-audience.md` |
| Voice Principles | `./brand-identity/foundation/voice-principles.md` |
| Product Terminology (audience) | `./brand-identity/voice/terminology.md` |
| Engineering terminology | `./brand-identity/product-internal/terminology-engineering.md` |
| Engineering index | `./brand-identity/INDEX-engineering.md` |
| Feature Inventory | `./brand-identity/product/feature-inventory.md` |
| Feature Briefs (public) | `./brand-identity/product/features/` |
| Engineering specs | `./brand-identity/product-internal/features/` |
| UX / design (Lovable migration) | `./DESIGN.md`, `docs/plans/2026-06-01-lovable-ui-migration.md` |
| UX Standards | `./brand-identity/product/ux-standards.md` |

### Tool Registry

| Topic | File | Purpose |
|-------|------|---------|
| Tool Registry | `.claude/tool-registry.md` | **All tools, skills, commands** - single source of truth for qplan auto-assignment |

### Nested CLAUDE.md Files

Context-specific instructions exist in subdirectories:
- `app/CLAUDE.md` - App-level patterns
- `app/_features/CLAUDE.md` - Feature module conventions
- `app/_lib/CLAUDE.md` - Shared library guidelines
- `e2e/CLAUDE.md` - E2E testing specifics
- `docs/CLAUDE.md` - Documentation standards
- `brand-identity/CLAUDE.md` - Brand voice, positioning, and product docs
- `supabase/CLAUDE.md` - Database safety, RLS patterns, and agent integration

### Agent Infrastructure

AI agents live in `.claude/agents/` and commands in `.claude/commands/`:

| Agent/Command | Purpose |
|---------------|---------|
| `database-keeper` | Schema exploration, RLS auditing, migration authoring |
| `/database` | Invoke database-keeper with subcommands: explore, analyze, audit, migration |
| `payment-keeper` | Payment auditing, sandbox testing, draft-only refunds |
| `/payment` | Invoke payment-keeper with subcommands: audit, monitor, sandbox, analyze, refund |
| `ux-pattern-scout` | Research best-in-class UX patterns and adapt for Salt |
| `/scout` | Scout UX patterns: `/scout clients`, `/scout projects --focus "detail page"` |
| `ux-analyst` | UX heuristic evaluation, accessibility auditing, cognitive load assessment |
| `/ux-review` | Critique implemented UI: `/ux-review clients`, `/ux-review --diff` |
| `design-system-guardian` | Design system compliance, token/component enforcement |
| `/ds-check` | Check DS compliance: `/ds-check clients`, `/ds-check --fix` |
| `ux-optimizer` | Orchestrate UX improvement cycles (analyze, research, propose, implement) |
| `/ux-improve` | Full improvement cycle: `/ux-improve clients --scope standard` |
| `/research` | Pre-build research with Gemini Deep Research |
| `/replicate` | Pixel-perfect component replication from URLs |
| `/ralph` | Autonomous agent loop for PRD execution |
| `/connector` | Composio connector lifecycle: `add <names...>`, `audit`, `test`, `enable`, `icons` — **read `docs/architecture/connector-system.md` first** |
| `/devup` | Restart dev server on :3000 and verify it actually serves; root-causes failures instead of blind-restarting |
| `/devup-staging` | Same as `/devup` with **staging Supabase** + 1Password (`.env.staging.1password`) |
| `/push` | Atomic commit + push + branch-state report; `staging` mode handles the PR, `status` mode is read-only |
| `/envkeys` | Key setup checklist across 1Password + Vercel staging/production with known traps encoded |
| `/interview` | Founder-grade PMF interview → qplan spec + three failure modes → v1 |
| `/fix-ui` | Newest screenshot → locate component → fix → visual verify |
| `/plan-run` | Execute/resume a plan file; reconciles checkboxes against codebase reality first |
| `/audit` | Read-only subsystem audit: inventory, doc drift, dead code, risks |

**Database Operations:** Use `/database explore "..."` for schema discovery and `/database migration "..."` for drafting migrations. See `supabase/CLAUDE.md` Section 11 for full details.

**Payment Operations:** Use `/payment audit` for security audits, `/payment sandbox` to verify test setup, and `/payment refund "..."` to draft refunds for human approval. See `.claude/agents/payment-keeper.md` for full details.

**UX Pattern Scouting:** Use `/scout [feature]` to research industry-leading UX patterns and adapt them for Salt. The agent finds best-in-class examples (Copilot, Linear, Notion), extracts patterns, and implements using Salt's Linear design system. See `.claude/agents/ux-pattern-scout.md` for full details.

**UX Quality System:** Three agents work together for UX quality:
- `/ux-review [target]` - Critique implemented UX against Nielsen's heuristics and WCAG. Outputs scored report with severity-ranked issues.
- `/ds-check [target]` - Enforce design system compliance (tokens, components, patterns). Auto-fix available for many violations.
- `/ux-improve [target]` - Orchestrate full improvement cycle: analyze issues, prioritize with RICE+Kano, research best practices, propose RFC-style improvements, implement approved changes.

---

## **🛡️ Non-Negotiable Standards**

| Category | Rule |
|----------|------|
| **Components** | Functional components only. Use hooks for state. |
| **Styling** | Use Tailwind utility classes; do not use inline styles. |
| **Data Fetching** | All data fetching must go through the Data Access Layer (DAL). |
| **Error Handling** | All server actions must return a standard `Result<T, E>` object. |
| **Testing** | Co-locate unit tests. Isolate E2E in `e2e/`. No Jest. No Cypress. |
| **Locators** | E2E tests use role-based locators only (`getByRole`, `getByLabel`). |
| **Connectors** | **MUST read `docs/architecture/connector-system.md` before adding/modifying connectors.** Add to unified registry first; capture adapters and Ask Salt derive from it. |
| **File Creation** | **NEVER use Bash heredocs (`cat << EOF`, `tee`, `echo >`) to create files.** Always use the `Write` tool. Bash heredocs get persisted verbatim in `settings.local.json` when permissions are "always allowed", bloating the file and corrupting pattern matching. This applies to ALL agents, commands, and scripts that produce output files. |

---

## **📁 Key Directories**

### `app/_lib/` - Shared Libraries

Core utilities and integrations used across the app:

| Module | Purpose |
|--------|---------|
| `supabase/` | Database client (server, client, admin, middleware) |
| `stripe/` | Payment integration (Salt SaaS billing only — user Stripe accounts connect via Composio) |
| `security/` | Auth tokens, safe redirects, URL validation |
| `permissions/` | RLS helpers and permission checks |
| `tenancy/` | Multi-tenant context and guards |
| `email/` | Resend integration for transactional emails |
| `hooks/` | Shared React hooks (realtime, unread counts) |
| `theme/` | Theme resolution and accent presets |
| `ai/` | GPT integration |
| `rate-limit/` | API rate limiting |
| `seo/` | Lighthouse and CrUX integrations |

### `app/_features/` - Feature Modules

Domain-specific code organized by feature. Current app-facing surfaces include `hq`, `plays`, `capture` (stream folded into Plays Activity), `connections`, `meetings`, `people`, `orgs`, `work`, `spaces`, `shell`, and supporting modules such as `auth`, `billing`, `payments`, `marketing`, `messaging`, and `relationships` (shared components/actions).

### `brand-identity/` - Brand & Product Documentation

Living documentation for brand, voice, and product strategy:

| Folder | Purpose |
|--------|---------|
| `foundation/` | Constitutional docs: product truth, brand architecture, voice principles, target audience |
| `positioning/` | Strategic positioning: competitive landscape, value proposition |
| `product/` | Product docs: feature inventory, feature briefs, roadmap, UX standards, pricing |
| `voice/` | Applied voice (terminology, copy snippets, examples) |
| `research/` | Evidence archive (ICP profiles, market insights, positioning research) |

**Hierarchy of Truth:** `foundation/` > `positioning/` > `product/` > `voice/` > `research/`

See `brand-identity/CLAUDE.md` for full guidelines on using and updating these docs.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke context-save / context-restore (not native checkpoint rewind)
- Code quality, health check → invoke health