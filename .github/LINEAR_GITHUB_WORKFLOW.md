# Salt Core Linear + GitHub Workflow

This document defines how we use Linear (internal planning) + GitHub (code/PRs) to build Salt Core safely and systematically.

## Core Principles
- **Linear is internal-only** (product planning, roadmap, triage)
- **GitHub is public** (code, PRs, external bug reports)
- **Small PRs, frequent merges** (trunk-based development)
- **Standard safety gates** (typecheck + lint + tests on every PR)

---

## Linear Structure

### Teams
- **Salt Core** (main team for all internal work)

### Projects
1. **Phase 0: Foundations** (Infrastructure layer)
2. **Phase 1: Core Marketing Site** (Infrastructure + Velocity)
3. **Phase 2: User Dashboard** (Infrastructure + Operations + Finance)
4. **Phase 3: Client Bridge MVP** (Operations)
5. **Phase 4: Custom Domains** (Infrastructure + Operations)
6. **Phase 5: Intelligence Layer** (Intelligence)
7. **Phase 6: Scale Features** (Community + Velocity)
8. **Quality/Velocity** (continuous improvements)

### Labels (Linear)
**Type:**
- `type:bug`
- `type:feature`
- `type:improvement`
- `type:security`
- `type:tech-debt`

**Layer (6-layer model):**
- `layer:Infrastructure`
- `layer:Intelligence`
- `layer:Operations`
- `layer:Community`
- `layer:Velocity`
- `layer:Finance`

**Area:**
- `area:core-marketing`
- `area:user-dashboard`
- `area:client-bridge`
- `area:auth`
- `area:billing`
- `area:deployment`

**Priority:**
- `priority:critical`
- `priority:high`
- `priority:medium`
- `priority:low`

### Statuses (Linear Workflow)
1. **Backlog** - not yet prioritized
2. **Todo** - ready to work on
3. **In Progress** - actively being worked
4. **In Review** - PR open
5. **Done** - merged to main
6. **Canceled** - won't do

---

## GitHub Labels
(Applied to public issues)

**Type:**
- `type:bug`
- `type:feature`
- `type:improvement`
- `type:security`

**Status:**
- `status:triage` (needs review)
- `status:confirmed` (reproduced)
- `status:wont-fix`

**Area:**
- `area:core-marketing`
- `area:user-dashboard`
- `area:client-bridge`
- `area:auth`
- `area:billing`

---

## The Daily/Weekly Loop

### Twice-Weekly Triage (Tue/Fri, 25 min)
1. Review new GitHub issues
2. Reproduce/classify/label
3. Create corresponding Linear issues (or link if duplicate)
4. Prioritize in Linear backlog
5. Move high-priority items to "Todo"

### Daily Work
1. Pick item from Linear "Todo"
2. Move to "In Progress"
3. Create feature branch: `SC-123-feature-name`
4. Make changes (small scope)
5. Open PR, link to Linear issue
6. Move Linear issue to "In Review"
7. Self-review PR checklist
8. Merge (Linear auto-moves to "Done" via integration)

---

## Branch Naming Convention
`SC-{linear-issue-number}-{short-description}`

Examples:
- `SC-42-bridge-client-auth`
- `SC-101-fix-stripe-webhook`
- `SC-58-marketing-hero-section`

---

## Commit Message Format
Use Conventional Commits:
- `feat: add client auth to Bridge`
- `fix: stripe webhook signature verification`
- `refactor: centralize tenant context resolution`
- `docs: update setup instructions`
- `test: add RLS policy tests`
- `chore: update dependencies`

---

## PR Definition of Done (Standard Gates)
Before merging, every PR must:
- [ ] TypeScript typecheck passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] All tests pass (when tests exist)
- [ ] PR description explains what/why/how
- [ ] Security checklist completed
- [ ] No `any` types (unless justified)
- [ ] No exposed secrets
- [ ] RLS reviewed (if database changes)
- [ ] Rollback plan documented

---

## Migration Workflow
If PR includes database changes:
1. Create migration file: `YYYYMMDDHHMMSS_description.sql`
2. Test locally with Supabase
3. Document in PR what changed
4. Add rollback SQL in PR description
5. Label PR with `requires:migration`

---

## Agentic Safety Patterns

### Before Coding (Architect Mode)
Ask AI for:
- Data model sketch
- API contract
- RLS considerations
- Edge cases
- Phased approach

### During Coding (Implementer Mode)
Constrain AI with:
- "Change only these files"
- "No new dependencies"
- "Must keep server components"
- "Follow libs/tenancy patterns"

### Before Merge (Reviewer Mode)
Ask AI for:
- Threat model
- RLS pitfalls
- Performance concerns
- What could break in prod?

---

## High-Risk Areas (Extra Scrutiny)
These areas require careful review:
- **Auth/session logic** (use `libs/tenancy`)
- **Billing/Stripe webhooks** (use `libs/stripe`)
- **Database migrations** (test rollback)
- **RLS policies** (test as different user types)
- **Tenant boundaries** (verify studio/client isolation)
- **Custom domain routing** (Phase 4)

---

## Linear ↔ GitHub Integration
(To be set up)

When Linear issue is linked to GitHub PR:
- PR merge → Linear issue moves to "Done"
- GitHub issue created → can manually create Linear issue
- Linear uses GitHub branch names for auto-linking

---

## Quick Reference

**Start new feature:**
```bash
# 1. Create Linear issue
# 2. Move to "In Progress"
# 3. Create branch
git checkout -b SC-123-feature-name
# 4. Code, commit, push
git push -u origin SC-123-feature-name
# 5. Open PR (auto-fills from template)
# 6. Move Linear to "In Review"
# 7. Merge when checks pass
```

**Triage GitHub issue:**
1. Reproduce
2. Label (type + area)
3. Create Linear issue if actionable
4. Link Linear ↔ GitHub
5. Prioritize in Linear

---

**Last Updated**: December 28, 2025  
**Owner**: Gabriella Martins

