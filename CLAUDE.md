# **Project Overview**

* **Tech Stack**: Next.js 15.1.9, React 19, TypeScript 5.9.3, Tailwind CSS 4, Supabase (PostgreSQL + Auth + Storage), Stripe
* **Architecture**: Full-stack Next.js App Router with Server Actions and API routes. No separate backend server - everything runs on port 3000
* **Key Goals**: Velocity, Type Safety, and Atomic Commits.

---

## **⚡️ Operational Commands (The "Golden Path")**

*Explicitly defined to prevent hallucination of 'yarn' or 'make' commands.*

> **⚠️ CRITICAL: Always use `pnpm`, NEVER `npm` or `yarn`**
> This project uses pnpm exclusively. All commands must use `pnpm` (e.g., `pnpm install`, `pnpm add`, `pnpm run`). Using npm or yarn will cause lockfile conflicts and dependency issues.

* **Start Dev**: `pnpm dev` (Runs on localhost:3000)
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

### Subdomain Development

The app uses subdomains in production (`app.saltcore.io`, `bridge.saltcore.io`). For local development:

| Production | Local (with subdomain) | Local (simple) |
|------------|------------------------|----------------|
| `app.saltcore.io` | `app.lvh.me:3000` | `localhost:3000/studio` |
| `bridge.saltcore.io` | `bridge.lvh.me:3000` | `localhost:3000/bridge` |

**`lvh.me` is a free DNS service** that resolves `*.lvh.me` to `127.0.0.1`. No setup required - just use these URLs in your browser.

**For most development**, use the simple `localhost:3000` paths. Use `lvh.me` when testing subdomain-specific middleware behavior.

---

## **🧠 Role & Behavior (Velocity Protocol)**

You are a Senior Engineer. Your goal is "Velocity with Precision."

1. **Context First**: Never guess file paths. Use `ls -R` or `grep` to locate files before editing.
2. **Skeptical Coding**: Assume existing code might be outdated; trust the file content you read over your training data.
3. **No "Lazy" Fixes**: Never use `any`, `// @ts-ignore`, or placeholder comments like `// ... rest of code`.
4. **Confirm Destructive Actions**: Ask for confirmation before deleting files or running bulk database migrations.

---

## **🚀 Velocity Shortcuts (Trigger Words)**

*Use these triggers to enforce reliable workflows:*

| Trigger | Action |
|---------|--------|
| `qplan` | Analyze the request and codebase. Draft a step-by-step plan. Identify files to create/modify. **For EACH step, include the specific tool/skill/command to use** (see Tool Auto-Assignment below). **Save plan to `docs/plans/YYYY-MM-DD-<feature-name>.md`**. DO NOT write code yet. |
| `qcode` | Implement the approved plan. **Use the tools specified for each step** (e.g., `/frontend-design` for UI). Follow TDD: Write test → Fail → Write code → Pass. Run linter before finishing. |
| `qtest` | Write or run tests. **Determine test type:** Unit (Vitest) for pure logic/components, E2E (Playwright) for user flows. Read `docs/guides/testing-strategy.md` first. Use `/testing-patterns` skill for unit tests, `/webapp-testing` skill for E2E. Run `pnpm test` (unit) or `pnpm test:e2e` (E2E). |
| `qcheck` | Review changes for: 1) Security vulnerabilities 2) Type safety 3) Performance bottlenecks 4) Alignment with project patterns. **Run `pnpm test` to verify tests pass.** |
| `qfix` | Read the error message, analyze the stack trace with `grep`, and propose a fix. |
| `qrestart` | Kill any process on port 3000 (`lsof -ti:3000 \| xargs kill -9`), then start the dev server (`pnpm dev`). Use when port 3000 is occupied or the server needs a fresh restart. |

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

When `qplan` is triggered, save a markdown file to `docs/plans/YYYY-MM-DD-<feature-name>.md` with this structure:

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
| Route `/dashboard/x` → `/studio/x` | `page.goto('/studio/x')` |
| Renamed component | Update test file name and locators |

---

## **📚 Critical Documentation Index**

*(Do not hallucinate features. Read these files for ground truth.)*

| Topic | File |
|-------|------|
| Auth Flow | `./docs/architecture/auth-flow.md` |
| Database Schema | `./docs/architecture/database-schema.md` |
| Security Model | `./docs/architecture/security-model.md` |
| API Standards | `./docs/guides/api-standards.md` |
| Testing Strategy | `./docs/guides/testing-strategy.md` |
| UI Patterns & Tailwind v4 | `./docs/guides/ui-patterns.md` |
| Coding Conventions | `./docs/guides/coding-conventions.md` |
| Error Handling | `./docs/guides/error-handling.md` |
| Stripe Integration | `./docs/guides/stripe-integration.md` |
| Folder Structure | `./docs/reference/folder-structure.md` |
| Environment Variables | `./docs/reference/environment-variables.md` |

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
| Brand Architecture (4-Layer) | `./brand-identity/foundation/brand-architecture.md` |
| Target Audience (ICP) | `./brand-identity/foundation/target-audience.md` |
| Voice Principles | `./brand-identity/foundation/voice-principles.md` |
| Product Terminology | `./brand-identity/voice/terminology.md` |
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
| `ux-pattern-scout` | Research best-in-class UX patterns and adapt for Salt Core |
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

**Database Operations:** Use `/database explore "..."` for schema discovery and `/database migration "..."` for drafting migrations. See `supabase/CLAUDE.md` Section 11 for full details.

**Payment Operations:** Use `/payment audit` for security audits, `/payment sandbox` to verify test setup, and `/payment refund "..."` to draft refunds for human approval. See `.claude/agents/payment-keeper.md` for full details.

**UX Pattern Scouting:** Use `/scout [feature]` to research industry-leading UX patterns and adapt them for Salt Core. The agent finds best-in-class examples (Copilot, Linear, Notion), extracts patterns, and implements using Salt Core's Linear design system. See `.claude/agents/ux-pattern-scout.md` for full details.

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
| **File Creation** | **NEVER use Bash heredocs (`cat << EOF`, `tee`, `echo >`) to create files.** Always use the `Write` tool. Bash heredocs get persisted verbatim in `settings.local.json` when permissions are "always allowed", bloating the file and corrupting pattern matching. This applies to ALL agents, commands, and scripts that produce output files. |

---

## **📁 Key Directories**

### `app/_lib/` - Shared Libraries

Core utilities and integrations used across the app:

| Module | Purpose |
|--------|---------|
| `supabase/` | Database client (server, client, admin, middleware) |
| `stripe/` | Payment integration (SaaS billing, Connect) |
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

Domain-specific code organized by feature: `auth`, `calendar`, `clients`, `insights`, `intelligence`, `marketing`, `messaging`, `portal`, `projects`, `seo`, `shell`, `shared`, `tasks`, `workspace`

### `brand-identity/` - Brand & Product Documentation

Living documentation for brand, voice, and product strategy:

| Folder | Purpose |
|--------|---------|
| `foundation/` | 🔒 Constitutional docs (brand essence, voice principles, target audience, 4-layer architecture) |
| `positioning/` | Strategic positioning (competitive landscape, value proposition) |
| `product/` | Product docs (roadmap, UX standards, S-mode interface plan, pricing) |
| `voice/` | Applied voice (terminology, copy snippets, examples) |
| `research/` | Evidence archive (ICP profiles, market insights, positioning research) |

**Hierarchy of Truth:** `foundation/` > `positioning/` > `product/` > `voice/` > `research/`

See `brand-identity/CLAUDE.md` for full guidelines on using and updating these docs.