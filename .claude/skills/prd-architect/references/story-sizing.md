# Story Sizing Heuristics

Guide for right-sizing user stories in PRDs. Each story must be completable in ONE Ralph iteration (one context window).

---

## The Golden Rule

**If you cannot describe the change in 2-3 sentences, it's too big.**

Ralph spawns a fresh Claude instance per iteration with no memory of previous work. If a story is too big, Claude runs out of context before finishing and produces broken code.

---

## Size Indicators

### Right-Sized (Single Iteration)

Each story should have:
- **1 primary file** created or modified
- **2-3 supporting changes** (imports, types, etc.)
- **Max 5 acceptance criteria**
- **Single concept** per story

### Examples of Right-Sized Stories

| Story | Primary Change | Supporting Changes |
|-------|----------------|-------------------|
| Add priority column to tasks | 1 migration file | Type regeneration |
| Display priority badge on cards | 1 component | Import in parent |
| Add filter dropdown | 1 component | Query param handling |
| Create server action for X | 1 action file | Type imports |

### Too Big (Split These)

| Bad Story | Why It's Too Big | Split Into |
|-----------|------------------|------------|
| "Build the entire dashboard" | Multiple components, data fetching, layouts | Schema, queries, layout, widget A, widget B, filters |
| "Add authentication" | DB, middleware, UI, sessions | Schema, middleware, login page, session handling, logout |
| "Refactor the API" | Multiple endpoints | One story per endpoint or pattern |
| "Implement search" | Indexing, UI, filtering, sorting | Index setup, search component, filters, sort controls |

---

## Max Criteria Rule

**No story should have more than 5 acceptance criteria.**

If you need more criteria, the story covers multiple concepts:

### Bad (7 criteria = too many concepts)
```
Story: Add task filtering
- Add status filter dropdown
- Add priority filter dropdown
- Add date range filter
- Filters persist in URL
- Clear all filters button
- Show filter count badge
- Empty state when no results
```

### Good (Split by concept)
```
Story 1: Add status filter
- Add status filter dropdown
- Filter persists in URL
- Typecheck passes

Story 2: Add priority filter
- Add priority filter dropdown
- Filter persists in URL
- Typecheck passes

Story 3: Add filter UI utilities
- Clear all filters button
- Show filter count badge
- Empty state when no results
- Typecheck passes
```

---

## Single Concept Test

Ask: "Does this story do ONE thing?"

| Story | Single Concept? | Fix |
|-------|-----------------|-----|
| "Add and display priority" | No (add + display) | Split into add story, display story |
| "Add priority to database" | Yes | Keep |
| "Display priority badge" | Yes | Keep |
| "Add sorting and filtering" | No (sort + filter) | Split into sorting story, filtering story |

---

## Dependency Sizing

Stories must not depend on incomplete stories in the same iteration.

### Wrong
```
Story 1: Add task creation form
Story 2: Add task list that shows created tasks
← Story 2 depends on Story 1, but Story 1 isn't complete yet
```

### Right
```
Story 1: Add task creation form
Story 2: Add task list (uses existing mock/seed data)
Story 3: Wire task list to show created tasks
← Story 3 comes after both 1 and 2 are complete
```

---

## UI vs Backend Separation

Prefer separating backend and UI changes:

### Instead of
```
Story: Add task comments
- Create comments table
- Add RLS policies
- Create server actions
- Build comment component
- Add comment list to task view
```

### Do this
```
Story 1: Create comments schema
- Create comments table
- Add RLS policies
- Generate types

Story 2: Create comments server actions
- Add comment action
- List comments action
- Delete comment action

Story 3: Build comments UI
- Comment component
- Comment list
- Add to task view
```

---

## Quick Sizing Checklist

Before approving a story size:

- [ ] Can describe change in 2-3 sentences
- [ ] ≤5 acceptance criteria
- [ ] Single primary file change
- [ ] Single concept
- [ ] No dependencies on incomplete stories
- [ ] Backend and UI separated (if complex)

---

## Common Splitting Patterns

### Database Feature
```
Original: "Add X feature to database"

Split:
1. Create schema (tables + columns)
2. Add RLS policies
3. Create CRUD actions
4. Generate types
```

### UI Feature
```
Original: "Build X component"

Split:
1. Create base component (presentation only)
2. Add data fetching
3. Add interactivity (if complex)
4. Add to parent page/layout
```

### Integration Feature
```
Original: "Integrate with X service"

Split:
1. Add environment config
2. Create service client
3. Create server actions for API
4. Build UI for integration
```
