# Critical Path Test Suite

This document outlines the critical user flows that must be tested after each migration phase.

## 1. Authentication Flows 🔐

### 1.1 Studio Member Sign In
- [ ] Navigate to `/signin`
- [ ] Enter email
- [ ] Receive magic link email
- [ ] Click magic link
- [ ] Verify redirect to `/dashboard`
- [ ] Verify user session established

### 1.2 Client Bridge Sign In
- [ ] Navigate to `/bridge/login`
- [ ] Enter email
- [ ] Receive magic link email
- [ ] Click magic link (goes to `/bridge/verify`)
- [ ] Verify redirect to `/bridge` or `/bridge/select`
- [ ] Verify client context loaded

### 1.3 Dual-Role User
- [ ] Sign in as user with both studio and client access
- [ ] Verify can access `/dashboard`
- [ ] Verify can access `/bridge`
- [ ] Verify correct context in each area

## 2. Core Dashboard Functions 📊

### 2.1 Projects
- [ ] Create new project
- [ ] View project list
- [ ] View project detail
- [ ] Edit project settings
- [ ] Upload files to project
- [ ] View project activity

### 2.2 Clients
- [ ] Create new client
- [ ] View client list
- [ ] View client detail
- [ ] Access client bridge

### 2.3 Messages
- [ ] View conversation list
- [ ] Send new message
- [ ] Receive message (realtime)
- [ ] Mark messages as read

## 3. Client Portal (Bridge) 🌉

### 3.1 Client Selection
- [ ] Multi-client user sees `/bridge/select`
- [ ] Can switch between clients
- [ ] Active client persists in cookie

### 3.2 Core Features
- [ ] View projects list
- [ ] View project detail
- [ ] Access files
- [ ] Send messages
- [ ] View progress updates

### 3.3 Billing
- [ ] View billing page
- [ ] Create checkout session
- [ ] Handle successful payment
- [ ] Handle payment cancellation

## 4. API & Webhooks 🔧

### 4.1 Stripe Webhooks
- [ ] Receive checkout.session.completed
- [ ] Update user subscription
- [ ] Handle invoice events

### 4.2 Server Actions
- [ ] Test form submissions
- [ ] Test data mutations
- [ ] Verify error handling
- [ ] Check optimistic updates

## 5. Performance Benchmarks ⚡

### 5.1 Page Load Times
Target: Under 2 seconds for all pages

- [ ] Dashboard: _____ ms
- [ ] Projects List: _____ ms
- [ ] Bridge Home: _____ ms
- [ ] Messages: _____ ms

### 5.2 Database Queries
- [ ] No N+1 queries
- [ ] Parallel queries working
- [ ] Tenant context cached

## 6. Edge Cases & Error States 🚨

### 6.1 Auth Errors
- [ ] Invalid magic link
- [ ] Expired magic link
- [ ] No client access
- [ ] No studio access

### 6.2 Data States
- [ ] Empty states render correctly
- [ ] Loading states show
- [ ] Error boundaries catch errors
- [ ] 404 pages work

## Test Execution Log

### Pre-Migration Baseline
Date: _____
- All tests passing? [ ]
- Known issues:

### Phase 1 Complete
Date: _____
- All tests passing? [ ]
- New issues:

### Phase 2 Complete
Date: _____
- All tests passing? [ ]
- New issues:

(Continue for each phase...)

## Automated Test Commands

```bash
# Run E2E tests (when available)
npm run test:e2e

# Check TypeScript
npm run type-check

# Lint check
npm run lint

# Build test
npm run build
```

## Manual Test Checklist

Before marking any phase complete:
1. [ ] Run through all critical paths manually
2. [ ] Test on multiple browsers (Chrome, Safari, Firefox)
3. [ ] Test on mobile viewport
4. [ ] Check console for errors
5. [ ] Verify no 404s in network tab
6. [ ] Check performance metrics