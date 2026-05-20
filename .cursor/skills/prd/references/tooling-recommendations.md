# Tooling Recommendations

Map story types to the best available tools, agents, skills, and MCP servers.

---

## Tool Categories

### 1. Agents (Task tool with subagent_type)

Specialized agents for complex, multi-step autonomous work:

| Agent | Best For | Trigger |
|-------|----------|---------|
| `database-keeper` | Schema exploration, RLS auditing, migration drafting | Database stories |
| `payment-keeper` | Payment auditing, sandbox testing, refund drafting | Payment/billing stories |
| `code-reviewer` | Code review, quality checks | Post-implementation review |
| `code-architect` | Feature architecture design, implementation blueprints | Complex feature planning |
| `code-explorer` | Codebase analysis, execution path tracing | Understanding existing code |
| `security-audit` | Security review of changes | Auth/sensitive data stories |
| `gemini-researcher` | Pre-build research, UX patterns | Research-heavy features |
| `visual-validator` | Compare prototype vs target, accuracy scores | After UI replication |
| `style-extractor` | Extract computed styles from target URLs | Before UI replication |
| `component-replicator` | Reverse-engineer components from URLs | UI replication stories |
| `animation-extractor` | Extract animations from source websites | Animation replication |

### 2. Commands (/command)

User-invocable commands for specific workflows:

#### Database & Backend
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/database explore` | Schema discovery, relationship mapping | Before writing DB stories |
| `/database audit` | RLS policy verification | After migration stories |
| `/database migration` | Draft migration SQL | Schema change stories |

#### Payments
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/payment audit` | Payment security verification | Before payment feature stories |
| `/payment sandbox` | Test environment verification | Payment integration stories |
| `/payment analyze` | Payment/customer investigation | Payment debugging stories |

#### Research & Planning
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/research` | Feature research before building | Complex feature streams |
| `/scout` | UX pattern research from best-in-class apps | UI/UX stories |
| `/problem` | Define problem worth solving, identify HXC | Before PRD creation |
| `/solution` | Explore solution options with 11-star framework | After problem definition |
| `/ideate` | Strategic feature ideation | Roadmap planning |

#### Strategy & Design
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/strategy` | Site strategy & architecture | New project planning |
| `/brief` | Design brief creation | Before UI implementation |
| `/icp` | Ideal Customer Profile development | User research stories |
| `/discover` | Client discovery | New client onboarding |
| `/brand-check` | Brand consistency audit | Voice/brand stories |
| `/review` | Conversion audit | UX review stories |
| `/replicate` | Pixel-perfect component replication | UI cloning stories |

#### Testing & Quality
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/webapp-testing` | Browser-based verification | UI story completion |
| `/code-quality` | Lint, type-check verification | All story completion |
| `/pragmatic-code-review` | Comprehensive code review | Post-implementation |
| `/design-review` | Design review of changes | UI story completion |
| `/security-review` | Security review of changes | Auth/sensitive stories |

#### Git & Workflow
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/commit` | Create git commits | After story completion |
| `/commit-push-pr` | Commit, push, and open PR | After stream completion |

#### Ralph Orchestration
| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/prd` | PRD generation (standard or decompose) | Before Ralph execution |
| `/ralph` | Start autonomous execution | After PRD ready |
| `/ralph-preflight` | Validate setup before running | Before /ralph |
| `/ralph-start` | Start specific stream | Decompose mode |
| `/ralph-status` | Check running Ralphs | During execution |
| `/ralph-logs` | View Ralph logs | Debugging |
| `/ralph-stop` | Stop specific Ralph | When needed |
| `/cancel-ralph` | Stop all Ralphs | Emergency stop |
| `/ralph-cleanup` | Clean up worktrees/containers | After completion |

### 3. Skills

Methodologies and patterns loaded as context:

#### Development Skills
| Skill | Best For | Story Types |
|-------|----------|-------------|
| `testing-patterns` | Unit test writing, TDD workflow | Backend stories with tests |
| `react-ui-patterns` | Loading states, error handling | UI component stories |
| `react-best-practices` | React/Next.js performance patterns | All React stories |
| `interaction-patterns` | Premium animations, hover states, transitions | UI components needing polish |
| `frontend-design` | High-quality UI implementation | Complex UI components, pages |
| `systematic-debugging` | Bug investigation | When stories fail |
| `webapp-testing` | Playwright automation | E2E test stories |
| `dev-browser` | Browser interaction, verification | UI verification |

#### Strategy & Research Skills
| Skill | Best For | Story Types |
|-------|----------|-------------|
| `deep-research` | Research methodology framework | Research-heavy features |
| `icp-development` | Customer profile methodology | User research |
| `brand-voice-extraction` | Brand voice documentation | Voice/brand stories |
| `conversion-audit` | Conversion optimization frameworks | UX audit stories |
| `design-brief-creation` | Visual specification frameworks | Design stories |
| `web-design-guidelines` | UI compliance checking | UI review stories |

### 4. MCP Servers

Direct tool access for specific operations:

| MCP Server | Tools | Use Cases |
|------------|-------|-----------|
| `mcp__supabase__` | `list_tables`, `execute_sql`, `list_migrations` | Database exploration |
| `mcp__stripe__` | `list_customers`, `list_subscriptions`, `retrieve_balance` | Payment read operations (read-only) |
| `mcp__playwright__` | `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_take_screenshot` | UI testing/verification |
| `mcp__context7__` | `resolve-library-id`, `query-docs` | Library documentation lookup |
| `mcp__github__` | `create_pull_request`, `list_commits`, `get_file_contents` | Git workflow automation |
| `mcp__linear__` | `create_issue`, `search_issues`, `update_issue` | Issue tracking |
| `mcp__memory__` | `create_entities`, `search_nodes` | Knowledge graph |
| `mcp__shadcn__` | `search_items_in_registries`, `view_items_in_registries` | Component library lookup |

---

## Story Type → Tooling Matrix

### Database/Schema Stories

```
Recommended:
  - Agent: database-keeper (for exploration and draft)
  - Command: /database explore (before writing)
  - Command: /database migration (for draft)
  - MCP: mcp__supabase__list_tables, mcp__supabase__execute_sql

Story metadata:
  "tooling": {
    "before": ["/database explore [tables]"],
    "agent": "database-keeper",
    "verify": ["/database audit"]
  }
```

### RLS Policy Stories

```
Recommended:
  - Agent: database-keeper
  - Command: /database audit --table [name]
  - MCP: mcp__supabase__execute_sql (for policy queries)

Story metadata:
  "tooling": {
    "agent": "database-keeper",
    "verify": ["/database audit"]
  }
```

### Server Action Stories

```
Recommended:
  - Skill: testing-patterns (if tests needed)
  - Skill: react-best-practices (for performance)
  - Agent: security-audit (if auth/sensitive)
  - MCP: mcp__context7__ (for library docs)

Story metadata:
  "tooling": {
    "skill": "testing-patterns",
    "verify": ["pnpm typecheck", "pnpm test"]
  }
```

### UI Component Stories

```
Recommended:
  - Command: /scout [component-type] (for UX patterns)
  - Skill: react-ui-patterns (for loading/error states)
  - Skill: react-best-practices (for performance)
  - Skill: interaction-patterns (for animations, hover states, transitions)
  - Skill: frontend-design (for high-quality UI implementation)
  - Skill: dev-browser (for verification)
  - MCP: mcp__playwright__ (for visual check)
  - MCP: mcp__context7__ (for component library docs)
  - MCP: mcp__shadcn__ (for shadcn component lookup)

Story metadata:
  "tooling": {
    "before": ["/scout [component-type]"],
    "skills": ["react-ui-patterns", "react-best-practices", "interaction-patterns", "frontend-design"],
    "verify": ["pnpm typecheck", "/webapp-testing"],
    "mcp": ["mcp__playwright__browser_snapshot", "mcp__shadcn__search_items_in_registries"]
  }
```

### UI Replication Stories

```
Recommended:
  - Command: /replicate [url] (for pixel-perfect cloning)
  - Agent: style-extractor (extract computed styles)
  - Agent: component-replicator (reverse-engineer components)
  - Agent: animation-extractor (extract animations)
  - Agent: visual-validator (compare accuracy)
  - MCP: mcp__playwright__ (for screenshots and evaluation)

Story metadata:
  "tooling": {
    "command": "/replicate [url]",
    "agents": ["style-extractor", "component-replicator", "visual-validator"],
    "verify": ["visual-validator accuracy score"]
  }
```

### E2E Test Stories

```
Recommended:
  - Skill: webapp-testing
  - Skill: testing-patterns
  - MCP: mcp__playwright__ (all browser tools)

Story metadata:
  "tooling": {
    "skill": "webapp-testing",
    "verify": ["pnpm test:e2e tests/[file].spec.ts"]
  }
```

### Integration Stories

```
Recommended:
  - Agent: code-reviewer (after implementation)
  - Skill: systematic-debugging (if issues)
  - MCP: mcp__context7__ (for external API docs)

Story metadata:
  "tooling": {
    "skill": "systematic-debugging",
    "verify": ["pnpm typecheck", "pnpm test"]
  }
```

### Research-Heavy Stories

```
Recommended:
  - Agent: gemini-researcher
  - Command: /research [topic]
  - Command: /scout [pattern] (for UX patterns)
  - Skill: deep-research

Story metadata:
  "tooling": {
    "before": ["/research [topic]", "/scout [pattern]"],
    "agent": "gemini-researcher",
    "skill": "deep-research"
  }
```

### Payment/Billing Stories

```
Recommended:
  - Agent: payment-keeper
  - Command: /payment audit (before)
  - Command: /payment sandbox (for testing)
  - MCP: mcp__stripe__ (read-only operations)

Story metadata:
  "tooling": {
    "before": ["/payment audit"],
    "agent": "payment-keeper",
    "verify": ["/payment sandbox"]
  }
```

### Brand/Voice Stories

```
Recommended:
  - Command: /brand-check (for consistency)
  - Command: /discover (for client context)
  - Skill: brand-voice-extraction

Story metadata:
  "tooling": {
    "command": "/brand-check",
    "skill": "brand-voice-extraction"
  }
```

---

## Stream-Level Tooling

Each stream PRD should include a `streamTooling` section:

```json
{
  "streamId": "stream-1",
  "streamName": "foundation",
  "streamTooling": {
    "primaryAgent": "database-keeper",
    "commands": ["/database explore", "/database migration"],
    "skills": [],
    "mcpServers": ["mcp__supabase__"],
    "verificationCommands": ["/database audit", "pnpm typecheck"]
  },
  "userStories": [...]
}
```

### Stream Type Templates

#### Foundation Stream (Database)
```json
"streamTooling": {
  "primaryAgent": "database-keeper",
  "commands": ["/database explore", "/database migration", "/database audit"],
  "skills": [],
  "mcpServers": ["mcp__supabase__"],
  "verificationCommands": ["/database audit", "pnpm dlx supabase gen types typescript --local"]
}
```

#### Feature Stream (Backend-Heavy)
```json
"streamTooling": {
  "primaryAgent": null,
  "commands": ["/code-quality"],
  "skills": ["testing-patterns", "react-best-practices"],
  "mcpServers": ["mcp__context7__"],
  "verificationCommands": ["pnpm typecheck", "pnpm test"]
}
```

#### Feature Stream (UI-Heavy)
```json
"streamTooling": {
  "primaryAgent": null,
  "commands": ["/webapp-testing", "/scout"],
  "skills": ["react-ui-patterns", "react-best-practices", "interaction-patterns", "frontend-design", "dev-browser"],
  "mcpServers": ["mcp__playwright__", "mcp__context7__", "mcp__shadcn__"],
  "verificationCommands": ["pnpm typecheck", "Verify in browser"]
}
```

#### E2E Test Stream
```json
"streamTooling": {
  "primaryAgent": null,
  "commands": [],
  "skills": ["webapp-testing", "testing-patterns"],
  "mcpServers": ["mcp__playwright__"],
  "verificationCommands": ["pnpm test:e2e"]
}
```

#### Payment Stream
```json
"streamTooling": {
  "primaryAgent": "payment-keeper",
  "commands": ["/payment audit", "/payment sandbox"],
  "skills": [],
  "mcpServers": ["mcp__stripe__"],
  "verificationCommands": ["/payment sandbox", "pnpm typecheck"]
}
```

#### Research Stream
```json
"streamTooling": {
  "primaryAgent": "gemini-researcher",
  "commands": ["/research", "/scout"],
  "skills": ["deep-research"],
  "mcpServers": ["mcp__context7__"],
  "verificationCommands": []
}
```

---

## Tooling Detection Heuristics

When analyzing a story, detect the best tools based on:

| If story contains... | Recommend |
|---------------------|-----------|
| "migration", "table", "schema", "column" | database-keeper, /database |
| "RLS", "policy", "security" | database-keeper, /database audit |
| "component", "UI", "button", "form" | react-ui-patterns, interaction-patterns, dev-browser, /scout |
| "animation", "transition", "hover", "modal" | interaction-patterns, frontend-design |
| "replicate", "clone", "copy from" | /replicate, style-extractor, component-replicator |
| "test", "spec", "E2E" | webapp-testing, testing-patterns |
| "API", "integration", "webhook" | mcp__context7__, testing-patterns |
| "research", "investigate", "explore" | gemini-researcher, /research, /scout |
| "auth", "permission", "sensitive" | security-audit agent, /security-review |
| "payment", "billing", "subscription", "stripe" | payment-keeper, /payment |
| "brand", "voice", "tone" | brand-voice-extraction, /brand-check |
| "customer", "persona", "ICP" | icp-development, /icp |
| "conversion", "friction", "funnel" | conversion-audit, /review |

---

## Story Metadata Extension

Add tooling recommendations to each story:

```json
{
  "id": "S1-001",
  "title": "Create intake system database schema",
  "tooling": {
    "agent": "database-keeper",
    "commands": ["/database explore intake", "/database migration"],
    "skills": [],
    "mcp": ["mcp__supabase__list_tables"],
    "verify": ["/database audit", "pnpm typecheck"]
  },
  "acceptanceCriteria": [...],
  "implementationSteps": [
    "1. Run /database explore to understand existing schema",
    "2. Use database-keeper agent to draft migration",
    "3. Review draft migration in .claude/ralph/migrations/",
    "4. Run /database audit to verify RLS",
    "5. Generate types with Supabase CLI"
  ]
}
```

---

## Integration with Ralph

When Ralph executes a story with tooling recommendations:

1. **Before starting**: Load recommended skills into context
2. **During execution**: Use recommended MCP servers
3. **For verification**: Run verification commands
4. **On failure**: Use systematic-debugging skill

The tooling metadata helps Ralph:
- Know which agent to consult for complex decisions
- Have the right patterns loaded for the task
- Use efficient verification methods
- Debug issues with the right methodology
