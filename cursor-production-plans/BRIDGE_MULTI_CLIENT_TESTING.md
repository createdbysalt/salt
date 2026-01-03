# Bridge Multi-Client Testing Checklist

Use this checklist to verify that multi-client Bridge access works correctly across all edge cases.

---

## Pre-Test Setup

### Create Test Users

You'll need 3 test user accounts:

1. **User A**: Has access to 1 client only
2. **User B**: Has access to 2 clients in the same studio
3. **User C**: Has access to 2 clients in different studios

### Setup Commands

```sql
-- Verify user A has 1 client
SELECT cu.email, c.name, s.name as studio 
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
JOIN studios s ON s.id = c.studio_id
WHERE cu.email = 'userA@test.com';
-- Should return 1 row

-- Verify user B has 2 clients (same studio)
SELECT cu.email, c.name, s.name as studio 
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
JOIN studios s ON s.id = c.studio_id
WHERE cu.email = 'userB@test.com';
-- Should return 2 rows with same studio

-- Verify user C has 2 clients (different studios)
SELECT cu.email, c.name, s.name as studio 
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
JOIN studios s ON s.id = c.studio_id
WHERE cu.email = 'userC@test.com';
-- Should return 2 rows with different studios
```

---

## Test Scenarios

### ✅ Scenario 1: Single Client User (No Picker)

**User**: User A (1 client)

**Steps**:
1. Open incognito window
2. Go to `http://localhost:3002/bridge`
3. Sign in as User A
4. Should redirect to Bridge home **immediately** (no picker)
5. Should see client name in header
6. Should see projects for that client
7. Should **NOT** see "Switch Client" button

**Expected**:
- ✅ Direct to Bridge home
- ✅ No picker shown
- ✅ No "Switch Client" button
- ✅ Projects load for correct client

---

### ✅ Scenario 2: Multi-Client User (First Visit)

**User**: User B (2 clients, same studio)

**Steps**:
1. Open new incognito window
2. Go to `http://localhost:3002/bridge`
3. Sign in as User B
4. Should redirect to `/bridge/select`
5. Should see both clients listed
6. Should see picker text: "Choose a client to open the bridge"
7. Click first client
8. Should redirect to Bridge home
9. Should see projects for selected client
10. Should see "Switch Client" button in header

**Expected**:
- ✅ Redirected to picker on first visit
- ✅ Both clients visible
- ✅ Selection works
- ✅ Redirects to Bridge home
- ✅ "Switch Client" button present

---

### ✅ Scenario 3: Multi-Client User (Cookie Persists)

**User**: User B (continuing from Scenario 2)

**Steps**:
1. (Still signed in from Scenario 2)
2. Note which client is active (from header)
3. Refresh the page (F5)
4. Should stay on Bridge home
5. Should show **same client** as before refresh
6. Should **NOT** redirect to picker
7. Open DevTools → Application → Cookies
8. Verify `bridge_active_client_id` cookie exists

**Expected**:
- ✅ Page refreshes to same client
- ✅ No redirect to picker
- ✅ Cookie persists

---

### ✅ Scenario 4: Switching Clients

**User**: User B (continuing from Scenario 3)

**Steps**:
1. (Still signed in, on Bridge home)
2. Click "Switch Client" button
3. Should redirect to `/bridge/select`
4. Should see both clients again
5. Click the **other** client (not currently active)
6. Should redirect to Bridge home
7. Header should show **new** client name
8. Projects should be for **new** client

**Expected**:
- ✅ Switcher redirects to picker
- ✅ Selecting different client works
- ✅ Projects update to match new client
- ✅ Cookie updates

---

### ✅ Scenario 5: Cross-Studio Multi-Client

**User**: User C (2 clients, different studios)

**Steps**:
1. Open new incognito window
2. Sign in as User C
3. Should see picker with both clients
4. Verify both client names are clear and distinct
5. Select first client
6. Should see Bridge home for that client
7. Click "Switch Client"
8. Select second client (from different studio)
9. Should see Bridge home for second client
10. Projects should be different

**Expected**:
- ✅ Cross-studio clients both visible
- ✅ No confusion between studios
- ✅ Switching works correctly
- ✅ Data isolation maintained

---

### ✅ Scenario 6: Revoked Access (Cookie Invalidation)

**User**: User B (2 clients)

**Setup**:
1. Sign in as User B
2. Select Client1 (cookie set)
3. Note the `bridge_active_client_id` value in DevTools

**Admin Action** (in separate window):
1. Sign in to studio dashboard
2. Go to Client1 detail page
3. Revoke User B's access
4. Verify `client_users` row is deleted

**User Action** (back in User B window):
1. Refresh Bridge page
2. Should redirect to `/bridge/select`
3. Should see **only 1 client** now (Client2)
4. Cookie should be invalid/ignored
5. Select Client2
6. Should work normally

**Expected**:
- ✅ Revoked client disappears from picker
- ✅ Old cookie is invalidated
- ✅ User can still access remaining client
- ✅ No errors or crashes

---

### ✅ Scenario 7: Re-Invite After Revocation

**User**: User B (continuing from Scenario 6)

**Admin Action**:
1. Re-invite User B to Client1 (via dashboard)
2. User B receives magic link email

**User Action**:
1. (Still signed in, on Client2)
2. Refresh Bridge page
3. Should redirect to `/bridge/select`
4. Should see **both clients** again
5. Select Client1
6. Should work normally

**Expected**:
- ✅ Re-invite restores access
- ✅ Picker shows both clients again
- ✅ User can access both

---

### ✅ Scenario 8: No Client Access

**User**: New user (not invited to any clients)

**Steps**:
1. Create a new auth user (via sign-up)
2. Do NOT add to any `client_users`
3. Navigate to Bridge
4. Should see "No Access" message
5. Should say: "You don't have access to any clients"
6. Should NOT show picker
7. Should suggest contacting studio

**Expected**:
- ✅ "No Access" state displays
- ✅ No picker shown
- ✅ Clear error message

---

### ✅ Scenario 9: Studio Member on Bridge Domain

**User**: Studio member (not a client user)

**Steps**:
1. Sign in as a studio member
2. Navigate to `http://localhost:3002/bridge`
3. Should see "No Access" (NOT dashboard)
4. Bridge domain treats them as client user
5. Navigate to `http://localhost:3002/dashboard`
6. Should work normally (studio dashboard)

**Expected**:
- ✅ Studio members don't auto-access Bridge
- ✅ No access on Bridge domain
- ✅ Dashboard still works on studio domain

---

### ✅ Scenario 10: Duplicate Invite (Multi-Client)

**User**: User A (1 client currently)

**Admin Action**:
1. Sign in to studio dashboard
2. Go to a **different** client's detail page
3. Invite User A to this second client
4. Verify `client_users` row is created (no error)

**User Action**:
1. (User A signed in, on Bridge home for Client1)
2. Refresh page
3. Should redirect to `/bridge/select`
4. Should see **both clients** now
5. Select Client2
6. Should see Bridge home for Client2

**Expected**:
- ✅ No error when inviting to second client
- ✅ Picker appears after refresh
- ✅ Both clients accessible

---

## Manual Test Checklist

Use this checklist to verify all scenarios:

```
□ Scenario 1: Single Client User (No Picker)
□ Scenario 2: Multi-Client User (First Visit)
□ Scenario 3: Multi-Client User (Cookie Persists)
□ Scenario 4: Switching Clients
□ Scenario 5: Cross-Studio Multi-Client
□ Scenario 6: Revoked Access (Cookie Invalidation)
□ Scenario 7: Re-Invite After Revocation
□ Scenario 8: No Client Access
□ Scenario 9: Studio Member on Bridge Domain
□ Scenario 10: Duplicate Invite (Multi-Client)
```

---

## Automated Testing (Future)

Recommended E2E tests to add later:

```typescript
describe("Bridge Multi-Client", () => {
  it("auto-selects single client", async () => {
    // Sign in user with 1 client
    // Assert: lands on Bridge home directly
    // Assert: no picker shown
  });
  
  it("shows picker for 2+ clients", async () => {
    // Sign in user with 2 clients
    // Assert: redirected to /bridge/select
    // Assert: both clients visible
  });
  
  it("persists client selection via cookie", async () => {
    // Sign in user with 2 clients
    // Select client1
    // Refresh page
    // Assert: still on client1 (no picker)
  });
  
  it("handles revoked access gracefully", async () => {
    // Sign in user with 2 clients
    // Select client1 (cookie set)
    // Admin revokes client1 access
    // User refreshes
    // Assert: redirected to picker
    // Assert: only client2 visible
  });
});
```

---

## Debugging Tools

### Check Active Cookie

```javascript
// In browser console
document.cookie
  .split('; ')
  .find(row => row.startsWith('bridge_active_client_id='));
```

### Check User Memberships

```sql
-- In Supabase SQL Editor
SELECT 
  cu.user_id,
  cu.email,
  cu.client_id,
  c.name as client_name,
  c.studio_id,
  s.name as studio_name
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
JOIN studios s ON s.id = c.studio_id
WHERE cu.email = 'test@example.com';
```

### Check Tenant Context (Dev)

```tsx
// In any Bridge page, temporarily add:
export default async function BridgePage() {
  const { context } = await getTenantContext();
  
  console.log("Tenant Context:", {
    actorType: context.actorType,
    userId: context.userId,
    activeClient: context.client,
    allMemberships: context.clientMemberships,
    needsSelection: context.needsClientSelection,
  });
  
  // ... rest of component
}
```

---

## Common Issues

### Picker Loop

**Symptom**: Selecting client redirects back to picker.

**Check**:
- Cookie is being set (DevTools → Application → Cookies)
- Cookie domain is correct (should be localhost or bridge.saltcore.io)
- RLS policy allows access to selected client

### "No Access" for Valid User

**Symptom**: User has `client_users` row but sees "No Access".

**Check**:
- `user_id` in `client_users` matches `auth.uid()`
- RLS policy is not too restrictive
- No errors in browser console

### Projects Not Loading

**Symptom**: Bridge home shows but no projects display.

**Check**:
- Projects exist for the selected client
- RLS policy on `projects` table is correct
- `client_id` filter is using correct value

---

**Last Updated**: December 28, 2025  
**Owner**: Gabriella Martins

