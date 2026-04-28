---
allowed-tools: Bash(find:*), Bash(ls:*), Bash(grep:*), Bash(wc:*), Bash(du:*), Bash(head:*), Bash(tail:*), Bash(cat:*), Bash(touch:*), Read, Glob, Grep
description: Generate comprehensive analysis and documentation of SALT codebase
---
# Comprehensive Codebase Analysis - SALT

## Project Discovery Phase

### Directory Structure
!`find . -type d -maxdepth 3 -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" -not -path "./coverage/*" -not -path "./ralph-worktrees/*" -not -path "./_archived/*" | head -100`

### File Count and Size Analysis
- Total files: !`find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" -not -path "./ralph-worktrees/*" | wc -l`
- TypeScript/React files: !`find . -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*" -not -path "./ralph-worktrees/*" \( -name "*.ts" -o -name "*.tsx" \) | wc -l`
- Project size: !`du -sh . --exclude=node_modules --exclude=.git --exclude=.next 2>/dev/null || du -sh .`

## Configuration Files Analysis

### Package Management (pnpm)
- Package.json: @package.json
- pnpm-lock.yaml exists: !`ls -la pnpm-lock.yaml 2>/dev/null`
- pnpm-workspace.yaml: @pnpm-workspace.yaml
- .npmrc: @.npmrc

### Build & Dev Tools
- Next.js config: @next.config.js
- TypeScript config: @tsconfig.json
- Tailwind config: @tailwind.config.js
- PostCSS config: @postcss.config.js
- ESLint config: @eslint.config.mjs
- Vitest config: @vitest.config.ts
- Playwright config: @playwright.config.ts
- Velite (MDX) config: @velite.config.js
- shadcn/ui config: @components.json

### Environment & Infrastructure
- .env files: !`find . -maxdepth 1 -name ".env*" -type f 2>/dev/null`
- Supabase config: !`ls -la supabase/ 2>/dev/null | head -10`

### CI/CD Configuration
- GitHub Actions: !`find .github/workflows -type f \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null`

## Source Code Analysis

### App Router Structure (Next.js 15)
- Route groups: !`find ./app -maxdepth 1 -type d | grep -E "^\./app/\(" | head -20`
- API routes: !`find ./app/api -type f -name "route.ts" 2>/dev/null | head -20`
- Pages: !`find ./app -name "page.tsx" -not -path "./ralph-worktrees/*" | head -30`

### Feature Modules
- Features directory: !`ls -la app/_features/ 2>/dev/null`
- Shared libs: !`ls -la app/_lib/ 2>/dev/null`

### Packages (Monorepo)
- Workspace packages: !`ls -la packages/ 2>/dev/null`

### Database & Storage (Supabase)
- Migration files: !`find ./supabase/migrations -type f -name "*.sql" 2>/dev/null | wc -l`
- Recent migrations: !`ls -la supabase/migrations/ 2>/dev/null | tail -10`

### Testing Files
- Unit tests: !`find . -name "*.test.ts" -o -name "*.test.tsx" -not -path "./node_modules/*" -not -path "./ralph-worktrees/*" 2>/dev/null | wc -l`
- E2E tests: !`find ./e2e -name "*.spec.ts" 2>/dev/null | wc -l`

## Key Documentation

### Root Documentation
@README.md
@CLAUDE.md

### Architecture Docs
- Auth flow: @docs/architecture/auth-flow.md
- Database schema: @docs/architecture/database-schema.md
- Security model: @docs/architecture/security-model.md

### Brand Identity
- Brand architecture: @brand-identity/foundation/brand-architecture.md
- Voice principles: @brand-identity/foundation/voice-principles.md

## Your Task

Based on all the discovered information above, create a comprehensive analysis that includes:

## 1. Project Overview
- Project type: Full-stack SaaS application (SALT - Agency/Freelancer CRM)
- Tech stack: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Supabase, Stripe
- Architecture: App Router with Server Actions, feature-driven organization
- Package manager: pnpm (monorepo with workspace packages)

## 2. Detailed Directory Structure Analysis
For each major directory, explain:
- Purpose and role in the application
- Key files and their functions
- How it connects to other parts

Key directories to analyze:
- `app/` - Next.js App Router pages and routes
- `app/_features/` - Domain-driven feature modules
- `app/_lib/` - Shared infrastructure utilities
- `packages/` - Monorepo workspace packages (@repo/ui, @repo/patterns, etc.)
- `supabase/` - Database migrations and config
- `e2e/` - End-to-end tests (Playwright)
- `docs/` - Architecture and guide documentation
- `brand-identity/` - Brand voice and positioning docs
- `.claude/` - Claude Code agents and commands

## 3. File-by-File Breakdown
Organize by category:
- **Core Application Files**: Route groups, layouts, pages
- **Feature Modules**: Actions, queries, components per domain
- **Configuration Files**: Next.js, TypeScript, Tailwind, testing
- **Data Layer**: Supabase client, migrations, RLS policies
- **UI Components**: @repo/ui primitives, @repo/patterns composed
- **Testing**: Vitest unit tests, Playwright E2E
- **Documentation**: CLAUDE.md files, architecture docs, guides
- **DevOps**: GitHub Actions, deployment scripts

## 4. API & Server Actions Analysis
Document:
- Server Actions in `app/_features/*/actions.ts`
- API routes in `app/api/` (webhooks only)
- Authentication patterns (Supabase Auth)
- Data access patterns (DAL)

## 5. Architecture Deep Dive
Explain:
- App Router structure with route groups
- Feature module organization
- Server vs Client component boundaries
- Supabase integration (Auth, Database, Storage)
- Stripe integration (SaaS billing, Connect)

## 6. Environment & Setup Analysis
Document:
- Required environment variables (from .env.example or docs)
- Installation: `pnpm install`
- Development: `pnpm dev` (port 3000 required)
- Database: `pnpm dlx supabase db push`
- Testing: `pnpm test` (unit), `pnpm test:e2e` (E2E)

## 7. Technology Stack Breakdown
- Runtime: Node.js 20+
- Framework: Next.js 15.x with App Router
- UI: React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- Database: Supabase (PostgreSQL + Auth + Storage)
- Payments: Stripe (Subscriptions + Connect)
- Testing: Vitest + Playwright
- Package Manager: pnpm 10.x (monorepo)

## 8. Visual Architecture Diagram
Create a diagram showing:
```
┌─────────────────────────────────────────────────────────────────────┐
│                           SALT                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Route Groups                                                        │
│  ├── (studio)     → Internal studio/admin dashboard                 │
│  ├── (client_portal) → Bridge client portal                         │
│  ├── (public)     → Marketing, auth pages                           │
│  └── (sandbox)    → Dev tools                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Feature Modules (_features/)                                        │
│  ├── auth, billing, clients, projects, messaging, etc.              │
│  └── Each: actions.ts, queries.ts, components/, hooks/              │
├─────────────────────────────────────────────────────────────────────┤
│  Packages (@repo/*)                                                  │
│  ├── ui          → shadcn primitives                                │
│  ├── patterns    → Composed UI patterns                             │
│  ├── utils       → Shared utilities                                 │
│  └── shared-types → Zod schemas & types                             │
├─────────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                      │
│  ├── Supabase    → Auth, Database (PostgreSQL), Storage             │
│  └── Stripe      → SaaS billing, Connect for payments               │
└─────────────────────────────────────────────────────────────────────┘
```

## 9. Key Insights & Recommendations
Provide:
- Code quality assessment
- Potential improvements
- Security considerations (RLS, auth patterns)
- Performance optimization opportunities
- Maintainability suggestions

Think deeply about the codebase structure and provide comprehensive insights that would be valuable for new developers joining the project or for architectural decision-making.

At the end, write all of the output into a file called "codebase_analysis.md" in the project root.
