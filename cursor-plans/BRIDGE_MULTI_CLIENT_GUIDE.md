# Bridge Multi-Client Access Guide

## Overview

The Bridge now supports users with access to multiple clients. When a user belongs to 2+ clients, they see a client picker and can switch between clients. The system remembers their last selection via a cookie.

---

## How It Works

### User Flow Diagram

```
User signs in → Auth callback → Bridge home
                                    ↓
                          Check client memberships
                                    ↓
                    ┌───────────────┴───────────────┐
                    │                               │
              0 memberships                   1 membership
                    │                               │
                No Access                    Auto-select client
                                                    │
                                            Show Bridge home
                                                    
                                        2+ memberships
                                                ↓
                                    Check bridge_active_client_id cookie
                                                ↓
                                    ┌───────────┴───────────┐
                                    │                       │
                              Valid cookie            No/invalid cookie
                                    │                       │
                            Show Bridge home        Redirect to /bridge/select
                                                            │
                                                    User selects client
                                                            │
                                                    Set cookie + redirect
                                                            │
                                                    Show Bridge home
```

---

## Architecture

### Database Schema

No schema changes required. The existing `client_users` table already supports multi-membership:

```sql
-- A user can belong to multiple clients
-- Constraint: (client_id, user_id) unique
-- NO constraint on (user_id) alone
```

### Cookie Storage

Active client selection is stored in a cookie:

- **Name**: `bridge_active_client_id`
- **Value**: UUID of the active client
- **HttpOnly**: true
- **Secure**: true (production only)
- **SameSite**: lax
- **Max-Age**: 1 year
- **Path**: /

### Tenant Resolution

The `libs/tenancy/context.ts` module handles multi-client resolution:

1. **Loads ALL client memberships** for the authenticated user
2. **Reads the `bridge_active_client_id` cookie**
3. **Validates** the cookie against current memberships
4. **Returns**:
   - `context.client`: The active client (if resolvable)
   - `context.clientMemberships`: All accessible clients
   - `context.needsClientSelection`: Whether picker is needed

### Automatic Redirects

The tenant resolution automatically redirects:

- **0 memberships** → Sign-in page (no access)
- **1 membership** → Auto-select and proceed to Bridge home
- **2+ memberships + no valid cookie** → `/bridge/select` (client picker)
- **2+ memberships + valid cookie** → Proceed to Bridge home

---

## Edge Cases Handled

### 1. Multi-Client (Same Studio)

**Scenario**: User belongs to ClientA and ClientB within the same studio.

**Behavior**:
- User sees client picker
- Both clients listed
- Selection persists via cookie
- Can switch anytime via "Switch Client" button

### 2. Multi-Client (Cross-Studio)

**Scenario**: User belongs to ClientA (Studio1) and ClientC (Studio2).

**Behavior**:
- User sees client picker
- Both clients listed (no studio label needed unless ambiguous)
- Selection persists via cookie
- Can switch anytime

### 3. Revoked Access

**Scenario**: User's `client_users` row is deleted but they still have an old cookie.

**Behavior**:
- On next Bridge visit, tenant resolution validates cookie
- Invalid cookie is ignored
- If other memberships exist, shows picker
- If no memberships remain, shows "No Access"

### 4. Duplicate Email Invited

**Scenario**: Email already exists and is already in another client.

**Behavior**:
- Invite action creates another `client_users` row
- No error (multi-membership is allowed)
- On next Bridge visit, user sees picker

### 5. Studio Member + Client User

**Scenario**: Internal studio user is also invited as a client user.

**Behavior**:
- **On Bridge domain**: Treated as client user (follows picker rules)
- **On Studio dashboard domain**: Treated as studio member
- Context resolution is domain-aware

---

## Client Picker UI

### Location

- **Dev**: `/bridge/select`
- **Production**: `/select` (inside `(client_bridge)` route group)

### Components

1. **`app/bridge/select/page.tsx`** - Server component that loads memberships
2. **`app/bridge/select/ClientPickerForm.tsx`** - Client component for selection UI
3. **`app/bridge/select/actions.ts`** - Server action to set cookie and redirect

### Voice Guidelines

Following the Bridge voice bible:

- ✅ "Choose a client to open the bridge"
- ✅ "You can switch clients anytime"
- ❌ NOT "Choose your client" or "your bridge"

---

## Switch Client Button

The Bridge home pages show a "Switch Client" button when:

```tsx
const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;

{hasMultipleClients && (
  <Link href="/bridge/select" className="btn btn-ghost btn-sm">
    Switch Client
  </Link>
)}
```

---

## Testing Scenarios

### Scenario A: Single Client User

1. Sign in as a user with 1 client membership
2. Should land directly on Bridge home (no picker)
3. Should NOT see "Switch Client" button
4. Should see projects for that client

### Scenario B: Multi-Client User (First Visit)

1. Sign in as a user with 2+ client memberships
2. Should redirect to `/bridge/select`
3. Should see all clients listed
4. Click a client → redirected to Bridge home
5. Should see "Switch Client" button
6. Refresh page → should stay on same client (cookie persists)

### Scenario C: Multi-Client User (Switching)

1. Already on Bridge home (from Scenario B)
2. Click "Switch Client" button
3. Should see `/bridge/select` again
4. Click different client
5. Should see Bridge home with new client's projects

### Scenario D: Revoked Access

1. User with 2 clients selects ClientA (cookie set)
2. Admin revokes access to ClientA
3. User refreshes Bridge
4. Should see `/bridge/select` again (cookie invalidated)
5. Should only see ClientB in picker

### Scenario E: Cross-Studio Membership

1. User belongs to ClientA (Studio1) and ClientB (Studio2)
2. Should see picker with both clients
3. Selection works normally
4. No confusion about studio context

### Scenario F: Studio Member Visiting Bridge

1. User is a studio member (not a client user)
2. Navigate to `bridge.saltcore.io`
3. Should see "No Access" (not redirected to dashboard)
4. Tenant resolution treats them as client user on Bridge domain

---

## Developer Notes

### Adding Multi-Client Support to New Pages

When creating new Bridge pages:

```tsx
import { getTenantContext } from "@/libs/tenancy";

export default async function MyBridgePage() {
  const { context } = await getTenantContext();
  
  // Tenant resolution already handled redirects
  // If code reaches here, context.client is guaranteed to exist
  
  const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;
  
  // Use context.client.id for queries
  const { data } = await supabase
    .from("projects")
    .eq("client_id", context.client.id);
  
  // Show switcher if needed
  return (
    <div>
      {hasMultipleClients && <Link href="/bridge/select">Switch Client</Link>}
      {/* Your content */}
    </div>
  );
}
```

### Cookie Invalidation

To manually clear the active client cookie (e.g., for logout):

```ts
import { cookies } from "next/headers";

const cookieStore = await cookies();
cookieStore.delete("bridge_active_client_id");
```

### Querying All Memberships

The tenant context already provides all memberships:

```ts
const { context } = await getTenantContext();

if (context.clientMemberships) {
  context.clientMemberships.forEach(m => {
    console.log(m.clientName, m.role, m.studioId);
  });
}
```

---

## Security Considerations

### RLS Still Enforced

Multi-client access does NOT bypass RLS:

- Users can only see data for clients where they have a `client_users` row
- The active client cookie is just a UX preference
- All database queries still filter by `client_id` with RLS

### Cookie Validation

The tenant resolution **always validates** the cookie:

1. Reads `bridge_active_client_id` from cookie
2. Checks if that client ID exists in user's memberships
3. If not found, treats as invalid and redirects to picker

### Cross-Studio Safety

Even if a user belongs to multiple studios via client memberships:

- They can only access data for clients they're explicitly invited to
- Studio-level data (in dashboard) is separate
- No data leakage between studios

---

## Troubleshooting

### User Stuck on Picker

**Symptoms**: Picker appears, user selects client, but returns to picker.

**Causes**:
- Cookie not being set (check browser settings)
- RLS policy blocking access to selected client
- Redirect loop in tenant resolution

**Debug**:
```tsx
// In app/bridge/select/actions.ts, add logging:
console.log("Setting cookie for client:", validatedData.clientId);
console.log("User memberships:", context.clientMemberships);
```

### "No Access" for Valid User

**Symptoms**: User should have access but sees "No Access".

**Causes**:
- `client_users` row doesn't exist
- User's `user_id` doesn't match `auth.uid()`
- RLS policy is too restrictive

**Debug**:
```sql
-- Check client_users table
SELECT * FROM client_users WHERE email = 'user@example.com';

-- Check auth.users
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

### Switch Client Button Not Showing

**Symptoms**: User has multiple clients but no switcher.

**Causes**:
- `context.clientMemberships` is undefined
- Length check is failing

**Debug**:
```tsx
console.log("Memberships:", context.clientMemberships);
console.log("Length:", context.clientMemberships?.length);
```

---

## Future Enhancements

Potential improvements for later phases:

1. **Server-side preference storage**: Replace cookie with `bridge_user_preferences` table for cross-device sync
2. **Recent clients list**: Show recently accessed clients first in picker
3. **Client search**: If user has 10+ clients, add search/filter
4. **Client groups**: Group clients by studio or category in picker
5. **Quick switcher**: Keyboard shortcut (Cmd+K) for fast switching

---

## Related Files

- **Tenant resolution**: `libs/tenancy/context.ts`
- **Types**: `libs/tenancy/types.ts`
- **Dev picker**: `app/bridge/select/`
- **Prod picker**: `app/(client_bridge)/select/`
- **Dev home**: `app/bridge/page.tsx`
- **Prod home**: `app/(client_bridge)/page.tsx`
- **Auth callback**: `app/api/auth/callback/route.ts`
- **Voice guidelines**: `brand/bible/salt_core_voice_bible.md`

---

**Last Updated**: December 28, 2025  
**Owner**: Gabriella Martins

