# Tool Registry

> **Single source of truth for all tools, skills, commands, and agents.**
>
> When `qplan` is triggered, tools are auto-assigned to each step based on work type.
> When adding a new tool, add it to the appropriate category below.

---

## How to Add a New Tool

1. Create your tool file in the appropriate directory:
   - **Agents:** `.claude/agents/<name>.md`
   - **Commands:** `.claude/commands/<name>.md`
   - **Skills:** `.claude/skills/<name>/SKILL.md`

2. Add an entry to the appropriate category below with:
   - Tool name (how to invoke it)
   - Brief description
   - When to use in qplan

3. If it's a new work type category, add a new section.

---

## Work Type Categories

### Frontend UI/Components

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/frontend-design` | skill (external) | Creative, polished UI code generation | **MANDATORY** for all UI work |
| `/ds-check` | command | Design system compliance checker | After implementing UI components |
| `/replicate [url]` | command | Pixel-perfect component replication | Clone reference implementations |
| `/interaction-patterns` | skill | Premium animations, hover states, transitions | Adding micro-interactions |
| `/react-ui-patterns` | skill | Loading states, error handling, data fetching | UI state management patterns |

**Frontend Rules:**
- Always use `/frontend-design` when creating or modifying UI
- **MANDATORY reads before writing code:**
  - `docs/guides/visual-design-reference.md` — Exact spacing, typography, patterns from production
  - `docs/guides/agent-component-guide.md` — Component selection and imports
  - `packages/ui/CLAUDE.md` — Primitive component API
- Always run `/ds-check` after completing frontend work
- Follow Linear Standard: `brand-identity/product/ux-standards.md`

---

### UX Research & Design

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/scout [feature]` | command | Research best-in-class UX patterns | Before implementing new features |
| `/ux-review [target]` | command | Heuristic evaluation, accessibility audit | After implementation for critique |
| `/ux-improve [target]` | command | Full improvement cycle orchestration | Major UX overhauls |
| `/research [topic]` | command | Gemini Deep Research for unknowns | Discovery phase, deep dives |
| `/brief` | command | Create design briefs from inspiration | Translating moodboards to specs |
| `/strategy` | command | Site architecture and user flows | Planning site structure |

---

### Backend/Database

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/database explore` | command | Schema discovery, table relationships | Understanding existing schema |
| `/database migration` | command | Draft migration files safely | Database changes |
| `/database audit` | command | RLS policy auditing | Security review |
| `/payment audit` | command | Stripe security audit | Before payment changes |
| `/payment sandbox` | command | Verify test setup | Testing payment flows |
| `/payment refund` | command | Draft refunds (human approval) | Processing refunds |

---

### Testing

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/testing-patterns` | skill | Vitest patterns, factories, TDD | Writing unit tests |
| `/webapp-testing` | skill | Playwright automation | Writing E2E tests |
| `/systematic-debugging` | skill | Four-phase debugging methodology | Investigating bugs |

---

### Code Quality & Review

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/pragmatic-code-review` | command | Comprehensive code review | Before merging PRs |
| `/design-review` | command | Design review of changes | UI/UX changes |
| `/security-review` | command | Security review of changes | Security-sensitive code |
| `/code-quality` | command | Code quality checks | General quality audit |
| `/docs-sync` | command | Check docs in sync with code | Documentation updates |
| `/analyze-codebase` | command | Generate codebase documentation | Understanding large codebases |

---

### Marketing & Content

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/page` | command | Salt Core page builder orchestration | Building marketing pages |
| `/build-page` | command | Production pages from approved copy | Final page assembly |
| `/copy` | command | Brand-aligned marketing copy | Writing marketing content |
| `/write` | command | MDX blog posts and changelog | Blog/changelog content |
| `/social` | command | Social media content generation | Social posts |
| `/optimize` | command | SEO and AEO optimization | Search visibility |
| `/intelligence` | command | Ambient intelligence panels | Contextual insights |

---

### Product Planning

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/prd` | command | Generate PRDs for Ralph | Feature planning |
| `/problem` | command | Define problem worth solving | Before building features |
| `/solution` | command | Explore solutions with 11-star framework | Brainstorming approaches |
| `/ideate` | command | Strategic feature ideation | Roadmap planning |
| `/ticket` | command | Work on JIRA/Linear ticket E2E | Ticket-based work |
| `/product-planning` | skill | Frameworks: JTBD, Kano, opportunity scoring | Strategic planning |

---

### Client & Brand Work

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/discover` | command | Client discovery and onboarding | New client projects |
| `/icp` | command | Ideal Customer Profile development | Understanding target audience |
| `/brand-check` | command | Brand consistency audit | Brand compliance |
| `/brand-voice-extraction` | skill | Capture client voice from samples | Voice documentation |
| `/icp-development` | skill | Deep ICP frameworks | Customer psychology |
| `/conversion-audit` | skill | Audit for conversion optimization | Finding conversion issues |
| `/design-brief-creation` | skill | Translate inspiration to specs | Design handoff prep |

---

### Autonomous Agents (Ralph)

| Tool | Type | Description | qplan Usage |
|------|------|-------------|-------------|
| `/ralph` | command | Run autonomous agent loop | Large feature execution |
| `/ralph-preflight` | command | Pre-flight checks | Before starting Ralph |
| `/ralph-start` | command | Start Ralph container | Launching Ralph |
| `/ralph-status` | command | Check Ralph status | Monitoring progress |
| `/ralph-logs` | command | View Ralph logs | Debugging Ralph |
| `/ralph-stop` | command | Stop Ralph container | Halting execution |
| `/ralph-cleanup` | command | Clean up worktrees/containers | Post-execution cleanup |
| `/cancel-ralph` | command | Cancel active Ralph loop | Emergency stop |
| `/project` | command | Project orchestration | Multi-agent coordination |

---

## Quick Reference: Most Common Tools by Phase

| Phase | Tools |
|-------|-------|
| **Research** | `/scout`, `/research`, `/database explore` |
| **Frontend** | `/frontend-design`, `/replicate`, `/ds-check` |
| **Backend** | `/database migration`, `/payment audit` |
| **Testing** | `/testing-patterns`, `/webapp-testing` |
| **Review** | `/ux-review`, `/pragmatic-code-review`, `/ds-check` |
| **Large Features** | `/prd`, `/ralph`, `/ralph-preflight` |

---

## Agents (Background Reference)

These agents power the commands above. You typically invoke them via commands, not directly:

| Agent | Powers | Location |
|-------|--------|----------|
| `database-keeper` | `/database` | `.claude/agents/database-keeper.md` |
| `payment-keeper` | `/payment` | `.claude/agents/payment-keeper.md` |
| `ux-pattern-scout` | `/scout` | `.claude/agents/ux-pattern-scout.md` |
| `ux-analyst` | `/ux-review` | `.claude/agents/ux-analyst.md` |
| `design-system-guardian` | `/ds-check` | `.claude/agents/design-system-guardian.md` |
| `ux-optimizer` | `/ux-improve` | `.claude/agents/ux-optimizer.md` |
| `gemini-researcher` | `/research` | `.claude/agents/gemini-researcher.md` |
| `component-replicator` | `/replicate` | `.claude/agents/component-replicator.md` |
| `page-director` | `/page` | `.claude/agents/page-director.md` |
| `marketing-copywriter` | `/copy` | `.claude/agents/marketing-copywriter.md` |
| `client-discovery` | `/discover` | `.claude/agents/client-discovery.md` |
| `icp-analyst` | `/icp` | `.claude/agents/icp-analyst.md` |
| `brand-identity-steward` | `/brand-check` | `.claude/agents/brand-identity-steward.md` |
| `strategic-ideator` | `/ideate` | `.claude/agents/strategic-ideator.md` |
