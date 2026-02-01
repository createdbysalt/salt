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
| `security-audit` | Security review of changes | Auth/sensitive data stories |
| `gemini-researcher` | Pre-build research, UX patterns | Research-heavy features |

### 2. Commands (/command)

User-invocable commands for specific workflows:

| Command | Best For | When to Recommend |
|---------|----------|-------------------|
| `/database explore` | Schema discovery, relationship mapping | Before writing DB stories |
| `/database audit` | RLS policy verification | After migration stories |
| `/database migration` | Draft migration SQL | Schema change stories |
| `/payment audit` | Payment security verification | Before payment feature stories |
| `/payment sandbox` | Test environment verification | Payment integration stories |
| `/payment analyze` | Payment/customer investigation | Payment debugging stories |
| `/research` | Feature research before building | Complex feature streams |
| `/webapp-testing` | Browser-based verification | UI story completion |
| `/code-quality` | Lint, type-check verification | All story completion |

### 3. Skills

Methodologies and patterns loaded as context:

| Skill | Best For | Story Types |
|-------|----------|-------------|
| `testing-patterns` | Unit test writing, TDD workflow | Backend stories with tests |
| `react-ui-patterns` | Loading states, error handling | UI component stories |
| `interaction-patterns` | Premium animations, hover states, transitions | UI components needing polish |
| `frontend-design` | High-quality UI implementation | Complex UI components, pages |
| `systematic-debugging` | Bug investigation | When stories fail |
| `webapp-testing` | Playwright automation | E2E test stories |
| `dev-browser` | Browser interaction, verification | UI verification |

### 4. MCP Servers

Direct tool access for specific operations:

| MCP Server | Tools | Use Cases |
|------------|-------|-----------|
| `mcp__supabase__` | `list_tables`, `execute_sql`, `list_migrations` | Database exploration |
| `mcp__stripe__` | `list_customers`, `list_subscriptions`, `retrieve_balance` | Payment read operations (read-only) |
| `mcp__playwright__` | `browser_navigate`, `browser_click`, `browser_snapshot` | UI testing/verification |
| `mcp__context7__` | `resolve-library-id`, `query-docs` | Library documentation lookup |
| `mcp__github__` | `create_pull_request`, `list_commits` | Git workflow automation |

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
  - Skill: react-ui-patterns (for loading/error states)
  - Skill: interaction-patterns (for animations, hover states, transitions)
  - Skill: frontend-design (for high-quality UI implementation)
  - Skill: dev-browser (for verification)
  - MCP: mcp__playwright__ (for visual check)
  - MCP: mcp__context7__ (for component library docs)

Story metadata:
  "tooling": {
    "skills": ["react-ui-patterns", "interaction-patterns", "frontend-design"],
    "verify": ["pnpm typecheck", "/webapp-testing"],
    "mcp": ["mcp__playwright__browser_snapshot"]
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

Story metadata:
  "tooling": {
    "before": ["/research [topic]"],
    "agent": "gemini-researcher"
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
  "skills": ["testing-patterns"],
  "mcpServers": ["mcp__context7__"],
  "verificationCommands": ["pnpm typecheck", "pnpm test"]
}
```

#### Feature Stream (UI-Heavy)
```json
"streamTooling": {
  "primaryAgent": null,
  "commands": ["/webapp-testing"],
  "skills": ["react-ui-patterns", "interaction-patterns", "frontend-design", "dev-browser"],
  "mcpServers": ["mcp__playwright__", "mcp__context7__"],
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

---

## Tooling Detection Heuristics

When analyzing a story, detect the best tools based on:

| If story contains... | Recommend |
|---------------------|-----------|
| "migration", "table", "schema", "column" | database-keeper, /database |
| "RLS", "policy", "security" | database-keeper, /database audit |
| "component", "UI", "button", "form" | react-ui-patterns, interaction-patterns, dev-browser |
| "animation", "transition", "hover", "modal" | interaction-patterns, frontend-design |
| "test", "spec", "E2E" | webapp-testing, testing-patterns |
| "API", "integration", "webhook" | mcp__context7__, testing-patterns |
| "research", "investigate", "explore" | gemini-researcher, /research |
| "auth", "permission", "sensitive" | security-audit agent |

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
