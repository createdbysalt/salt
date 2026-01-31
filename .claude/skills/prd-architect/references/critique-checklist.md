# Self-Critique Checklist

Comprehensive checklist for reviewing PRDs before execution. Apply after initial generation.

---

## How to Use This Checklist

After generating PRDs for all streams:

1. **Story-Level Review** — Check each story individually
2. **Stream-Level Review** — Check each stream's story order
3. **Cross-Stream Review** — Check for conflicts between streams
4. **Final Verification** — Confirm execution plan validity

Document all issues found and resolutions applied in `critique-report.md`.

---

## Story-Level Checks

### Size and Scope

| Check | Detection | Resolution |
|-------|-----------|------------|
| Story too large | >5 acceptance criteria | Split into atomic stories |
| Multiple concepts | Story has "and" in title | Split by concept |
| Vague scope | Can't describe in 2-3 sentences | Narrow to single change |
| Implicit dependencies | Assumes other story complete | Make dependency explicit or reorder |

### Acceptance Criteria Quality

| Check | Detection | Resolution |
|-------|-----------|------------|
| Vague criteria | Contains "works correctly", "good UX", "handles edge cases" | Rewrite as specific checkbox |
| Unverifiable | Can't be checked programmatically | Make concrete and measurable |
| Missing typecheck | No "Typecheck passes" | Add to every story |
| Missing browser verify | UI story without verification | Add "Verify in browser" |
| Missing test pass | Backend story without test | Add "Tests pass" if applicable |

### Implementation Steps

| Check | Detection | Resolution |
|-------|-----------|------------|
| Steps not numbered | Steps are bullet points | Number sequentially |
| Missing doc read | No step to read relevant docs | Add "Read docs/..." as step 1 |
| Wrong order | Create before read, use before create | Reorder logically |
| Missing verification | No step to verify success | Add verification step at end |

### Boundaries

| Check | Detection | Resolution |
|-------|-----------|------------|
| No doNotChange | Story modifies files without protection list | Add protected files |
| Overly permissive | doNotChange is empty | Add stable code protection |
| Missing boundaries | No ✅/⚠️/🚫 tier definition | Add three-tier boundaries |

---

## Stream-Level Checks

### Ordering

| Check | Detection | Resolution |
|-------|-----------|------------|
| Schema after consumer | Story uses table before schema story | Move schema story first |
| RLS after usage | Query story before RLS story | Add RLS immediately after schema |
| UI before backend | Component uses undefined action | Backend before UI |
| Type usage before generation | Uses types before generated | Type generation after migration |

### Migrations

| Check | Detection | Resolution |
|-------|-----------|------------|
| Multiple migration stories | >1 story creates migrations | Consolidate or coordinate timestamps |
| Missing RLS story | Migration without RLS | Add RLS story |
| Wrong migration order | Dependent tables before parent | Reorder migrations |

### Completeness

| Check | Detection | Resolution |
|-------|-----------|------------|
| Dead-end stories | Story output not consumed | Remove or add consumer story |
| Missing integration | Features don't connect | Add integration stories |
| No verification story | Stream has no way to verify | Add E2E or integration test story |

---

## Cross-Stream Conflict Detection

### File Conflicts

| Check | Detection | Resolution |
|-------|-----------|------------|
| Same file modified | Two streams list same file in stories | Merge streams or sequence them |
| Migration timestamp | Both streams create timestamped migrations | Coordinate timestamps or consolidate |
| Shared component | Both streams modify same component | Sequence streams or merge changes |

### Branch Conflicts

| Check | Detection | Resolution |
|-------|-----------|------------|
| Duplicate branch names | Same branchName in multiple PRDs | Use unique stream-prefixed names |
| Main branch conflicts | Streams might conflict on merge | Plan merge order in execution plan |

### Dependency Conflicts

| Check | Detection | Resolution |
|-------|-----------|------------|
| Circular dependencies | Stream A depends on B, B on A | Break cycle by restructuring |
| Missing dependency | Stream uses output from undeclared dependency | Add dependency to execution plan |
| Type collision | Both streams define same type | Consolidate in foundation stream |

---

## Execution Plan Verification

### DAG Validity

| Check | Detection | Resolution |
|-------|-----------|------------|
| Has cycles | Dependency graph has loop | Restructure to eliminate cycle |
| Orphan streams | Stream has no path from foundation | Add missing dependency or remove |
| Missing foundation | Features don't depend on foundation | All features should depend on foundation |

### Parallel Groups

| Check | Detection | Resolution |
|-------|-----------|------------|
| Conflict in parallel | Parallel streams modify same files | Move to different groups |
| Unnecessary sequence | Sequential streams could be parallel | Move to parallel group if independent |
| Wrong group order | Dependent group before dependency | Reorder groups |

### Branch Names

| Check | Detection | Resolution |
|-------|-----------|------------|
| Not unique | Same name across streams | Add stream ID to branch name |
| Invalid characters | Spaces, special chars in name | Use kebab-case |
| Missing prefix | No ralph/ prefix | Add prefix |

---

## Final Verification

Before approving the execution plan:

### Required Criteria Present
- [ ] Every story has "Typecheck passes"
- [ ] Every UI story has "Verify in browser"
- [ ] Every story has numbered implementation steps
- [ ] Every story has doNotChange section

### Structure Valid
- [ ] All migrations in foundation stream
- [ ] RLS policies with table creation
- [ ] No file conflicts in parallel streams
- [ ] E2E stream depends on all features
- [ ] DAG has no cycles

### Sizes Correct
- [ ] No story has >5 acceptance criteria
- [ ] All criteria are verifiable
- [ ] Stories describable in 2-3 sentences

### Documentation Complete
- [ ] critique-report.md documents all issues found
- [ ] critique-report.md documents all resolutions
- [ ] execution-plan.json has valid structure

---

## Critique Report Template

```markdown
# Critique Report

**Execution ID:** exec-YYYYMMDD-project
**Source Document:** path/to/feature.md
**Critique Depth:** standard
**Date:** YYYY-MM-DD

## Summary

- **Issues Found:** X
- **Issues Resolved:** X
- **Streams Affected:** X

## Story-Level Issues

### S1-003: [Story Title]
**Issue:** Story had 7 acceptance criteria (too large)
**Resolution:** Split into S1-003a, S1-003b, S1-003c

### S2-001: [Story Title]
**Issue:** Missing "Typecheck passes" criterion
**Resolution:** Added criterion

## Stream-Level Issues

### Stream 2: intake
**Issue:** Migration story after component story
**Resolution:** Reordered to put migration first

## Cross-Stream Issues

### Streams 2 & 3
**Issue:** Both modified app/_lib/shared/types.ts
**Resolution:** Moved type definitions to foundation stream

## Execution Plan Changes

- Added dependency: stream-5 depends on stream-3
- Changed parallel group 2: removed stream-4 (file conflict)
- Updated branch names to include stream IDs
```
