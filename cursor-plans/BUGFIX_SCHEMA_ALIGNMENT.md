# Bug Fixes: Database Schema Alignment

## Issues Identified

Based on the error screenshots provided:
1. **"Error loading clients: {}"** - Clients page was failing to load
2. **"Failed to create client"** - Client creation form was failing

## Root Causes

### 1. Outdated Tenant Context Resolution
**File**: `libs/tenancy/context.ts` (line 129-149)

The `loadStudioContext()` function was still using legacy placeholder logic that queried the `profiles` table and used `userId` as `studioId`. After the multi-tenant migration, we have proper `studios` and `studio_members` tables.

**Fix**: Updated to query `studio_members` table correctly:
```typescript
async function loadStudioContext(
  supabase: any,
  userId: string
): Promise<{ id: string; role: TenantRole } | null> {
  const { data: membership, error } = await supabase
    .from("studio_members")
    .select("studio_id, role")
    .eq("user_id", userId)
    .single();
  
  if (error || !membership) {
    console.error("Failed to load studio context:", error);
    return null;
  }
  
  return {
    id: membership.studio_id,
    role: membership.role as TenantRole,
  };
}
```

### 2. Schema Mismatch in Client Creation Action
**File**: `app/(user_dashboard)/dashboard/clients/new/actions.ts`

The action was trying to insert fields that don't exist in the actual database schema:
- ❌ `email` → ✅ `contact_email`
- ❌ `company` → ✅ `contact_phone`
- ❌ `status` (doesn't exist on clients table)

Also, the bridge portal creation was trying to insert invalid fields:
- ❌ `studio_id` (not in bridge_portals schema)
- ❌ `name` (not in bridge_portals schema)
- ❌ `subdomain` (not in bridge_portals schema)

**Fix**: 
- Updated Zod schema to use correct field names
- Simplified bridge portal creation to only include valid fields (`client_id` and `status`)

### 3. Form Field Mismatch
**File**: `app/(user_dashboard)/dashboard/clients/new/ClientForm.tsx`

Form inputs didn't match the database schema:
- ❌ `name="email"` → ✅ `name="contact_email"`
- ❌ `name="company"` → ✅ `name="contact_phone"`

**Fix**: Updated all form field names to match database schema.

### 4. Clients List Page Schema Mismatch
**File**: `app/(user_dashboard)/dashboard/clients/page.tsx`

The page was referencing non-existent fields:
- ❌ `client.email` → ✅ `client.contact_email`
- ❌ `client.company` → ✅ `client.contact_phone`
- ❌ `client.status` (doesn't exist, removed status filter entirely)

**Fix**: 
- Updated all field references to match actual schema
- Removed status filter functionality (can be added later if needed)
- Simplified search to only query `name` and `contact_email`

## Database Schema Reference

### `clients` table (actual schema):
```sql
create table public.clients (
  id uuid primary key,
  studio_id uuid not null references studios(id),
  name text not null,
  slug text not null,
  contact_email text,        -- Not "email"
  contact_phone text,         -- Not "company"
  settings jsonb,
  created_at timestamp,
  updated_at timestamp,
  unique(studio_id, slug)
);
```

### `bridge_portals` table (actual schema):
```sql
create table public.bridge_portals (
  id uuid primary key,
  client_id uuid not null references clients(id) unique,
  custom_domain text unique,
  domain_verified boolean default false,
  status text default 'active',
  theme_config jsonb,
  created_at timestamp,
  updated_at timestamp
);
```

## Testing Checklist

After these fixes, test the following:

- [ ] Sign in to dashboard
- [ ] Navigate to Clients page - should load without errors
- [ ] Click "New Client"
- [ ] Fill in client form with:
  - Client Name: Test Client
  - Slug: test-client (auto-generated)
  - Contact Email: test@example.com
  - Contact Phone: +1 555-123-4567
- [ ] Submit form - should create client successfully
- [ ] Should redirect to client detail page or clients list
- [ ] Bridge portal should be auto-created in database

## Files Changed

1. `libs/tenancy/context.ts` - Updated `loadStudioContext()`
2. `app/(user_dashboard)/dashboard/clients/new/actions.ts` - Fixed schema fields
3. `app/(user_dashboard)/dashboard/clients/new/ClientForm.tsx` - Fixed form field names
4. `app/(user_dashboard)/dashboard/clients/page.tsx` - Fixed display fields and removed status filter

## Build Status

✅ All files compile successfully
✅ No linting errors
✅ Build completed without errors

---

**Next Steps**: Test the application in your browser to verify all fixes work correctly.

