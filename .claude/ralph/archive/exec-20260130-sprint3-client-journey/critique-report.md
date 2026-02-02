# Critique Report

**Execution ID:** exec-20260130-sprint3-client-journey
**Source Document:** brand-identity/product/sprint-3-client-journey-system.md
**Critique Depth:** standard
**Date:** 2026-01-30

## Summary

- **Issues Found:** 12
- **Issues Resolved:** 12
- **Streams Created:** 7
- **Total Stories:** 52

## Decomposition Decisions

### Stream Separation Rationale

The Sprint 3 document covers 9 implementation phases. I consolidated these into 7 parallel-executable streams:

| Original Phases | Stream | Rationale |
|-----------------|--------|-----------|
| Phase 1 (Foundation) | stream-1 | All database work consolidated |
| Phase 1-2 (Intake + Discovery) | stream-2 | Tightly coupled, same public route |
| Phase 3 (Proposals) | stream-3 | Independent feature |
| Phase 4-5 (Payments + Onboarding) | stream-4 | Payment triggers onboarding - sequential |
| Phase 6 (Knowledge Base) | stream-5 | Independent feature |
| Phase 7-8 (Calendar + Transcription) | stream-6 | Tightly coupled via webhooks |
| Phase 9 (E2E Tests) | stream-7 | Must run after all features |

### Dependency Graph

```
stream-1 (foundation)
    ├── stream-2 (intake) ─────────────────────┐
    ├── stream-3 (proposals) ──┬── stream-4 ───┤
    │                          │  (payments)   │
    └── stream-5 (knowledge) ──┴── stream-6 ───┴── stream-7 (e2e)
                                  (calendar)
```

## Story-Level Issues

### S1-001 to S1-003: Consolidated Migration Stories
**Issue:** Original plan had separate migration per table
**Resolution:** Combined into single migration file (20260131200000) to prevent timestamp conflicts

### S2-007: Intake Submission Action
**Issue:** Original scope included sync discovery call
**Resolution:** Changed to async discovery (non-blocking) to keep user experience fast

### S3-007: SignatureCapture Component
**Issue:** Original didn't emphasize legal requirements
**Resolution:** Added explicit acceptance criteria: checkbox UNCHECKED by default, audit trail capture

### S4-004: Payment Webhook
**Issue:** No idempotency requirement
**Resolution:** Added note about idempotency for webhook retry handling

### S6-002 & S6-006: Webhook Handlers
**Issue:** Missing signature verification
**Resolution:** Added step for webhook signature verification where applicable

## Stream-Level Issues

### Stream 1: Foundation
**Issue:** Existing migrations for client_meetings, meeting_templates, calendar_connections
**Resolution:** Extended existing tables instead of creating new ones; protected existing migration files

### Stream 4: Payments-Onboarding
**Issue:** Originally separate streams
**Resolution:** Merged because payment success triggers onboarding - sequential dependency within stream

### Stream 6: Calendar-Meetings
**Issue:** Originally separate streams
**Resolution:** Merged because Cal.com booking creates meeting, Fireflies webhook updates same meeting record

## Cross-Stream Conflict Detection

### No File Conflicts Found
All streams modify distinct file sets:
- stream-1: supabase/migrations/*
- stream-2: app/(public)/intake/*, app/_features/intake/*, app/_lib/discovery/*
- stream-3: app/(user_dashboard)/dashboard/proposals/*, app/_features/proposals/*
- stream-4: app/_features/payments/*, app/_features/onboarding/*
- stream-5: app/_features/knowledge/*
- stream-6: app/_features/booking/*, app/_features/meetings/*, app/_lib/transcription/*
- stream-7: e2e/tests/*

### Migration Coordination
All migrations consolidated in stream-1 to prevent timestamp conflicts.

### Protected Files
Each stream PRD includes `filesProtected` section listing files that must not be modified.

## Existing Infrastructure Leveraged

The codebase already has:

| Component | Location | Used By |
|-----------|----------|---------|
| client_meetings table | 20260104000003_create_client_meetings.sql | stream-6 extends |
| meeting_templates table | 20260104000005_create_meeting_templates.sql | stream-6 uses |
| calendar_connections table | 20260104000004_create_calendar_connections.sql | stream-6 uses |
| client_intakes table | 20260130100000_add_intake_and_knowledge_base.sql | stream-2 uses |
| client_knowledge_base table | 20260130100000_add_intake_and_knowledge_base.sql | stream-5/6 use |
| Stripe Connect | app/_lib/stripe/* | stream-4 uses |
| Resend email | app/_lib/email/* | stream-3/4 use |

## Parallel Execution Plan

### Group 1 (Sequential)
- **stream-1: foundation** — Must complete first (all migrations)

### Group 2 (Parallel)
- **stream-2: intake** — No dependency on other features
- **stream-3: proposals** — No dependency on other features
- **stream-5: knowledge-base** — No dependency on other features

**Speedup:** 3 streams run in parallel = ~40% time saved

### Group 3 (Parallel)
- **stream-4: payments-onboarding** — Depends on stream-3 (needs proposals for payment)
- **stream-6: calendar-meetings** — Depends on stream-5 (saves to knowledge base)

**Speedup:** 2 streams run in parallel = ~20% time saved

### Group 4 (Sequential)
- **stream-7: e2e-tests** — Depends on all features

## Final Verification Checklist

- [x] Every story has "Typecheck passes" criterion
- [x] Every UI story has "Verify in browser" criterion
- [x] Every story has numbered implementation steps
- [x] Every story has doNotChange section
- [x] All migrations in foundation stream
- [x] RLS policies with table creation
- [x] No file conflicts in parallel streams
- [x] E2E stream depends on all features
- [x] DAG has no cycles
- [x] No story has >5 acceptance criteria
- [x] All criteria are verifiable
- [x] Branch names are unique per stream

## Tooling Recommendations

| Stream | Primary Tools |
|--------|---------------|
| stream-1 | database-keeper agent, /database explore, /database audit |
| stream-2 | react-ui-patterns skill, frontend-design skill, /webapp-testing |
| stream-3 | react-ui-patterns skill, frontend-design skill, testing-patterns skill |
| stream-4 | mcp__context7__ (Stripe docs), testing-patterns skill |
| stream-5 | react-ui-patterns skill, frontend-design skill |
| stream-6 | mcp__context7__ (Cal.com, Fireflies docs), testing-patterns skill |
| stream-7 | webapp-testing skill, mcp__playwright__ |

## Execution Estimates

| Metric | Value |
|--------|-------|
| Total Stories | 52 |
| Total Estimated Iterations | 104 |
| Parallel Estimated Iterations | 58 |
| Speedup | 44% |
| Critical Path | stream-1 → stream-3 → stream-4 → stream-7 |
