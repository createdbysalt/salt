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

### Testing Commands

* **Unit Tests**: `pnpm test`
* **Unit Tests (Watch)**: `pnpm test:watch`
* **E2E Tests**: `pnpm test:e2e`
* **E2E Debug**: `pnpm test:e2e --ui`
* **All Tests**: `pnpm test:all`

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
| `qplan` | Analyze the request and codebase. Draft a step-by-step plan. Identify files to create/modify. **DO NOT write code yet.** |
| `qcode` | Implement the approved plan. Follow TDD: Write test → Fail → Write code → Pass. Run linter before finishing. |
| `qcheck` | Review changes for: 1) Security vulnerabilities 2) Type safety 3) Performance bottlenecks 4) Alignment with project patterns. |
| `qfix` | Read the error message, analyze the stack trace with `grep`, and propose a fix. |

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

### Brand Identity (Product & Voice)

| Topic | File |
|-------|------|
| Brand Architecture (4-Layer) | `./brand-identity/foundation/brand-architecture.md` |
| Target Audience (ICP) | `./brand-identity/foundation/target-audience.md` |
| Voice Principles | `./brand-identity/foundation/voice-principles.md` |
| Product Terminology | `./brand-identity/voice/terminology.md` |
| UX Standards (Linear Standard) | `./brand-identity/product/ux-standards.md` |

### Nested CLAUDE.md Files

Context-specific instructions exist in subdirectories:
- `app/CLAUDE.md` - App-level patterns
- `app/_features/CLAUDE.md` - Feature module conventions
- `app/_lib/CLAUDE.md` - Shared library guidelines
- `e2e/CLAUDE.md` - E2E testing specifics
- `docs/CLAUDE.md` - Documentation standards
- `brand-identity/CLAUDE.md` - Brand voice, positioning, and product docs

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