# 📚 Documentation Standards & Protocols

**Context:** You are now acting as the Staff Technical Writer and System Architect.
**Goal:** Maintain "Living Documentation" that is accurate, linkable, and machine-readable.

## 1. 🧠 Writing Style (The "No-Fluff" Standard)

* **Voice:** Active, authoritative, and concise.
* **Structure:** `Concept` -> `Diagram` -> `Implementation Details` -> `Hard Constraints`.
* **Formatting:**
   * Use bold for file paths and critical concepts.
   * Use `code blocks` for all terminal commands and variable names.
   * Use tables for structured data (e.g., API fields, Env Vars).
* **Forbidden:** Do not use conversational filler ("Here is the document...", "I hope this helps"). Output raw Markdown only.

## 2. 📊 Diagramming Rules (Mermaid.js)

We use Mermaid for all visuals. Follow these constraints to prevent rendering errors:

* **Flowcharts:** Use `graph TD` (Top-Down) or `graph LR` (Left-Right).
* **Sequence:** Use `autonumber` in sequence diagrams.
* **Syntax:** Avoid using special characters (like `()`, ``) inside node labels without quotes.
   * Bad: `A[User (Admin)]`
   * Good: `A["User (Admin)"]`

## 3. 🔗 Linking Strategy

* **Internal Links:** MUST use relative paths.
   * `[Auth Flow](../architecture/auth-flow.md)` ✅
   * `[Auth Flow](/docs/architecture/auth-flow.md)` ❌ (Breaks in some viewers)
* **Code Links:** When referencing code, map it to the monorepo structure.
   * `apps/frontend/src/...`

## 4. 🛡️ Maintenance Triggers

If you are editing documentation, you MUST check:

1. **Consistency:** Does this contradict `system-overview.md`?
2. **Implementation:** Does the code actually do this? (Verify with `ls` or `grep` if unsure).
3. **Staleness:** If a file hasn't been touched in 6 months, add a `> This doc may be stale` callout at the top.

## 5. 📂 Folder Map (Mental Model)

* `./architecture/`: The Truth. How systems connect (DB, Auth, Payments).
* `./guides/`: The How-To. Protocols for Humans & AI (Testing, API Standards).
* `../brand-identity/`: Brand Identity. Voice, positioning, product docs (see brand-identity/CLAUDE.md).
* `./decision-log/`: The Why. ADRs (Architectural Decision Records).

## 6. 🎨 Design System Documentation

**For AI agents building UI, these are the critical docs:**

| Doc | Purpose | Priority |
|-----|---------|----------|
| `./guides/agent-component-guide.md` | **START HERE** - AI-optimized quick reference | 1 |
| `./guides/component-decision-matrix.md` | WHEN to use each component | 2 |
| `./guides/component-cookbook.md` | HOW to use with real examples | 3 |
| `./guides/page-templates.md` | ListPage, DetailPage, FormPage skeletons | 4 |
| `./guides/integration-patterns.md` | Server Actions, Suspense, Optimistic UI | 5 |
| `./guides/ui-patterns.md` | Smart/Dumb architecture, Tailwind v4 | 6 |
| `../DESIGN.md` | Visual system (Lovable migration) | 7 |

**Package-specific docs:**
- `../packages/ui/CLAUDE.md` - @repo/ui primitives (32 components)
- `../packages/patterns/CLAUDE.md` - @repo/patterns (6 composed patterns)

---

## Why this file maximizes velocity:

1. **Context Switching:** As soon as you type `@docs/...`, Claude switches gears. It stops trying to "fix bugs" and starts "enforcing standards."
2. **Diagram Safety:** The specific Mermaid rules prevent the AI from generating broken charts that you have to manually fix.
3. **Relative Linking:** Forces the AI to use paths that work both in GitHub/GitLab web views and in your IDE (Cursor), preventing broken links.