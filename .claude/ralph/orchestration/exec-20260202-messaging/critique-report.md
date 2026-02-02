# Critique Report: Messaging Improvements

**Execution ID:** exec-20260202-messaging
**Created:** 2026-02-02
**Critique Depth:** standard

---

## Summary

| Metric | Value |
|--------|-------|
| Total Streams | 7 |
| Total Stories | 32 |
| Issues Found | 5 |
| Issues Resolved | 5 |
| Remaining Risks | 2 (low severity) |

---

## Issues Found & Resolutions

### Issue 1: Foundation Migration Too Large
**Detection:** Story S1-001 had 9 acceptance criteria spanning multiple table changes
**Severity:** Medium
**Resolution:** Kept as single migration since all changes are ALTER TABLE statements that should run atomically. Split would create partial schema state risk.

### Issue 2: Missing user_mentions Column
**Detection:** Stream 6 (mentions-notifications) referenced user_mentions column not in foundation
**Severity:** High
**Resolution:** Added S6-002 to create migration for user_mentions column. This story must complete before S6-003.

### Issue 3: Potential File Conflict - MessageComposer
**Detection:** Streams 3, 4, and 6 all modify MessageComposer.tsx
**Severity:** Medium
**Resolution:** Streams can run in parallel because:
- Stream 3 adds KB mention picker (separate trigger, separate state)
- Stream 4 replaces textarea with RichMarkdownEditor
- Stream 6 adds @mention picker (separate trigger, separate state)

Each adds distinct functionality. Order of merge: Stream 4 first (core editor), then 3 and 6 (additive features).

### Issue 4: Vague Criteria in Original PRD
**Detection:** Several criteria were vague ("works correctly", "handles gracefully")
**Severity:** Low
**Resolution:** Rewrote all criteria as verifiable checkboxes with specific conditions.

### Issue 5: Missing Browser Verification
**Detection:** 4 UI stories lacked "Verify in browser using dev-browser skill"
**Severity:** Low
**Resolution:** Added browser verification to all UI stories with specific verification steps.

---

## Remaining Risks

### Risk 1: Knowledge Base Dependency (Low)
**Description:** Stream 3 (knowledge-mentions) assumes existing KB upload infrastructure
**Mitigation:** Stories reference existing actions. If KB upload is incomplete, S3-004 will need adaptation.
**Impact:** Single story delay, not stream failure.

### Risk 2: Notification System Assumption (Low)
**Description:** Stream 6 assumes existing notification infrastructure
**Mitigation:** S6-003 checks for existing system first. If none exists, notification will be created but may not surface in UI until notification center is built.
**Impact:** Mentions work, but notification may not be visible until notification UI exists.

---

## Stream Dependencies Verified

```
stream-1 (foundation)
    │
    ├──> stream-2 (search) ✓
    ├──> stream-3 (knowledge-mentions) ✓
    ├──> stream-4 (rich-text) ✓
    ├──> stream-5 (threading-context) ✓
    └──> stream-6 (mentions-notifications) ✓
              │
              └──> stream-7 (polish) ✓ [depends on stream-5 for sidebar]
```

All dependencies are correctly ordered. No circular dependencies detected.

---

## Story Size Verification

All stories verified to be completable in one Ralph iteration:

| Stream | Avg Criteria | Max Criteria | Status |
|--------|--------------|--------------|--------|
| stream-1 | 9 | 11 | ⚠️ At limit but atomic migration |
| stream-2 | 8 | 10 | ✓ Good |
| stream-3 | 8 | 10 | ✓ Good |
| stream-4 | 7 | 9 | ✓ Good |
| stream-5 | 8 | 10 | ✓ Good |
| stream-6 | 7 | 9 | ✓ Good |
| stream-7 | 8 | 9 | ✓ Good |

---

## Architectural Decisions Documented

1. **File attachments through Knowledge Base** - Files upload to KB first, then are mentioned in messages. This creates organized, searchable knowledge rather than chat clutter.

2. **Single-level threading** - Reply to messages supported, but no reply-to-reply. Keeps complexity manageable.

3. **Typing indicators studio-only** - Clients don't see studio typing to avoid pressure. Studios see client typing for engagement awareness.

4. **Search across all conversations** - Full-text search with tsvector searches all accessible conversations, not just current one.

---

## Recommended Execution Order

1. **Group 1:** Run stream-1 (foundation) alone
2. **Group 2:** Run streams 2, 3, 4 in parallel (after foundation merges)
3. **Group 3:** Run streams 5, 6 in parallel
4. **Group 4:** Run stream-7 (depends on stream-5 sidebar)

Estimated parallel execution: 4 sequential groups vs 7 sequential streams = ~43% time savings.

---

## Checklist

- [x] All stories sized for one iteration
- [x] All UI stories have browser verification
- [x] All stories have "Typecheck passes" criterion
- [x] Dependencies correctly ordered
- [x] No circular dependencies
- [x] File conflicts identified and sequenced
- [x] Vague criteria rewritten
- [x] Architectural decisions documented
