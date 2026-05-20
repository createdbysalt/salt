---
name: source-code-context
description: |
  Use when integrating packages, SDKs, or frameworks where documentation is incomplete or the agent keeps hallucinating non-existent functions. Teaches how to reference actual source code instead of guessing.

  USE THIS SKILL WHEN:
  - Integrating a package, SDK, API client, or framework
  - The agent keeps hallucinating functions that don't exist
  - Docs are weak, stale, or too abstract
  - You want the agent to follow the package's actual internal patterns

  PROVIDES: Source code reference methodology, verification checklist, prompt templates
version: 1.0.0
author: David Ondrej / Michael Shimeles interview notes
license: MIT
allowed-tools: Read, Grep, Glob, Bash
---

# Source Code as Agent Context

## Core Philosophy

**Code is the best source of truth.** Docs can be outdated, examples can be incomplete, and blog posts can lag behind the current API. When an agent has access to the actual repo/package source, it can search for real function names, types, examples, and edge cases.

Use this skill to stop the agent from guessing.

---

## Setup (SALT Configuration)

Source code is cached via **opensrc** at `~/.opensrc/repos/github.com/<owner>/<repo>`.

### Fetch a new source:
```bash
pnpm opensrc fetch <owner>/<repo>
pnpm opensrc path <owner>/<repo>   # Get the local path
pnpm opensrc list                   # Show all cached sources
```

### Currently Cached Sources:
Run `pnpm opensrc list` for the full list. Common ones include:
- **UI**: shadcn-ui/ui, radix-ui/primitives, tailwindlabs/tailwindcss
- **Backend**: supabase/supabase, stripe/stripe-node
- **AI**: vercel/ai, langchain-ai/langchainjs, anthropics/anthropic-sdk-python
- **Agents**: composiohq/composio, browser-use/browser-use, NousResearch/hermes-agent
- **Workflow**: n8n-io/n8n, calcom/cal.com, daytonaio/daytona

---

## Feature Prompt Template

When building a feature that uses an external library:

```md
Build <feature>. We use <library/tool>.

Before coding:
1. Get the source path: `pnpm opensrc path <owner>/<repo>`
2. Search for the correct API and patterns: `rg "<search term>" $(pnpm opensrc path <owner>/<repo>)`
3. Identify the files/functions/examples you used as reference.
4. Implement only the minimal service function and one calling route/component.
5. Keep the diff small.
6. Report which source files you referenced.
```

---

## Example Usage

### Example 1: Daytona Integration
```md
We need to integrate Daytona sandboxes into this app.

Before coding:
1. Search the source: `rg "createSandbox\|Sandbox" $(pnpm opensrc path daytonaio/daytona)`
2. Find the current SDK pattern for creating a sandbox and running a command.
3. Implement only the minimal service function and one calling route.
4. Report which files you referenced.
```

### Example 2: Stripe Connect
```md
We need to implement Stripe Connect onboarding.

Before coding:
1. Search the source: `rg "accountLink\|AccountLink" $(pnpm opensrc path stripe/stripe-node)`
2. Find the actual function signatures and options.
3. Implement the minimal flow.
4. Report which files you referenced.
```

### Example 3: Vercel AI SDK Streaming
```md
We need to implement streaming chat with tool use.

Before coding:
1. Search the source: `rg "streamText\|tool" $(pnpm opensrc path vercel/ai)`
2. Find real examples in their test files or examples folder.
3. Implement matching our patterns.
4. Report which files you referenced.
```

---

## Searching Source Code

### Basic Search
```bash
# Get the path
SOURCE=$(pnpm opensrc path <owner>/<repo>)

# Search for a term
rg "functionName" $SOURCE

# Search with context (3 lines before/after)
rg -C 3 "functionName" $SOURCE

# Search only TypeScript files
rg "functionName" $SOURCE --type ts

# Search for type definitions
rg "interface.*Config" $SOURCE --type ts
```

### Finding Examples
```bash
# Look for example folders
ls $SOURCE/examples/ 2>/dev/null || ls $SOURCE/apps/ 2>/dev/null

# Find test files (often have usage examples)
find $SOURCE -name "*.test.ts" -o -name "*.spec.ts" | head -20

# Search in tests specifically
rg "functionName" $SOURCE -g "*.test.ts"
```

---

## Common Pitfalls

### 1. Dumping Too Much Context
**Wrong:** Pasting entire files into chat.
**Right:** Let the agent search files on disk using `rg` and `cat`.

### 2. Trusting Old Docs Over Current Code
**Wrong:** Following a tutorial from 6 months ago.
**Right:** Search the source for current function signatures.

### 3. Letting the Agent Install Alternatives
**Wrong:** Agent can't find API, installs a different package.
**Right:** Make it search the source before adding new dependencies.

### 4. Not Reporting References
**Wrong:** Agent implements without saying where it got the pattern.
**Right:** Require the agent to report which files it referenced.

---

## Verification Checklist

Before considering a source-code-informed task complete:

- [ ] Reference source exists (`pnpm opensrc list` to verify)
- [ ] Agent was explicitly told where to search
- [ ] Agent reported which files/functions it referenced
- [ ] No random replacement package was installed without approval
- [ ] The implementation matches current source-code patterns
- [ ] Package age rule followed (not < 14 days old)

---

## Anti-Hallucination Protocol

### Rule 1: Search Before Implementing
```
✗ WRONG: "The function is probably called createClient()"
✓ RIGHT: "Searching source... found createClient() at src/client.ts:45"
```

### Rule 2: Report References
```
✗ WRONG: Implementing without attribution
✓ RIGHT: "Based on stripe-node/src/resources/AccountLinks.ts:23-45"
```

### Rule 3: Verify Function Signatures
```
✗ WRONG: Guessing parameter names and types
✓ RIGHT: "Source shows signature: createAccountLink(params: AccountLinkCreateParams)"
```

### Rule 4: Check for Breaking Changes
```
✗ WRONG: Using patterns from an old blog post
✓ RIGHT: "Verified against current source - API unchanged"
```
