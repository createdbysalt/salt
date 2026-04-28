# Supabase Troubleshooting Guide

**Context:** Solutions for common Supabase-specific issues in SALT.

## Authentication Issues

### User Session Not Found

**Error:**
```
AuthApiError: User session not found
```

**Causes & Solutions:**

1. **Expired Session**
```typescript
// Check and refresh session
const { data: { session }, error } = await supabase.auth.getSession();

if (error || !session) {
  // Try to refresh
  const { data: { session: newSession } } = await supabase.auth.refreshSession();

  if (!newSession) {
    // Session truly expired
    redirect("/signin");
  }
}
```

2. **Cookie Issues**
```typescript
// Ensure cookies are being set properly
// Check middleware.ts
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add SameSite for auth cookies
  response.headers.set(
    "Set-Cookie",
    `sb-auth-token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  return response;
}
```

### OAuth Redirect Loop

**Error:** User keeps getting redirected between login and callback

**Solution:**
```typescript
// app/api/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        `${requestUrl.origin}/signin?error=auth_failed`
      );
    }
  }

  // Redirect to intended destination or dashboard
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
```

### Email Confirmation Issues

**Error:** "Email not confirmed"

**Solutions:**

1. **Resend Confirmation**
```typescript
const { error } = await supabase.auth.resend({
  type: "signup",
  email: userEmail,
});

if (!error) {
  toast.success("Confirmation email sent!");
}
```

2. **Check Email Settings**
```sql
-- In Supabase Dashboard → Authentication → Email Templates
-- Ensure confirmation URL is correct:
{{ .ConfirmationURL }}

-- For custom domain:
https://app.yourdomain.com/api/auth/confirm?token={{ .Token }}
```

## Database & RLS Issues

### Row Level Security Blocking Access

**Error:**
```
Error: new row violates row-level security policy
```

**Debugging Steps:**

1. **Check Current User**
```typescript
// In your API route or component
const { data: { user } } = await supabase.auth.getUser();
console.log("Current user ID:", user?.id);
```

2. **Test RLS Policies**
```sql
-- Run in SQL Editor as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Test SELECT
SELECT * FROM studios WHERE id = 'studio-uuid';

-- Test INSERT
INSERT INTO projects (name, studio_id)
VALUES ('Test', 'studio-uuid');
```

3. **Common RLS Fixes**
```sql
-- Fix: User can't see their own data
CREATE POLICY "Users can view own records"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix: Studio member can't access studio
CREATE POLICY "Studio members can view studio"
ON studios FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studio_members
    WHERE studio_members.studio_id = studios.id
    AND studio_members.user_id = auth.uid()
  )
);
```

### Foreign Key Constraints

**Error:**
```
Error: violates foreign key constraint "projects_studio_id_fkey"
```

**Solution:**
```typescript
// Always verify parent records exist
async function createProject(studioId: string, data: ProjectData) {
  // 1. Verify studio exists and user has access
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("id")
    .eq("id", studioId)
    .single();

  if (studioError || !studio) {
    throw new Error("Studio not found or access denied");
  }

  // 2. Verify client exists (if provided)
  if (data.clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", data.clientId)
      .eq("studio_id", studioId) // Ensure client belongs to studio
      .single();

    if (!client) {
      throw new Error("Client not found or doesn't belong to studio");
    }
  }

  // 3. Now safe to create project
  return supabase.from("projects").insert({
    ...data,
    studio_id: studioId,
  });
}
```

## Migration Issues

### Migration Conflicts

**Error:**
```
Error: Schema migration failed: relation "table_name" already exists
```

**Solution:**
```sql
-- Use IF NOT EXISTS for idempotent migrations
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- For altering tables, check first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE users ADD COLUMN new_column TEXT;
  END IF;
END $$;
```

### RLS Not Applied After Migration

**Issue:** New tables accessible without RLS

**Solution:**
```sql
-- Always enable RLS immediately after table creation
CREATE TABLE sensitive_data (
  id UUID PRIMARY KEY,
  data JSONB
);

-- CRITICAL: Enable RLS
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- Without policies, table is now inaccessible (secure by default)
-- Add policies as needed
CREATE POLICY "Users can manage own data"
ON sensitive_data
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## Real-time Subscription Issues

### Subscriptions Not Receiving Updates

**Common Causes:**

1. **RLS Blocking Real-time**
```typescript
// Ensure user has SELECT permission
const { data: canRead } = await supabase
  .from("projects")
  .select("id")
  .eq("id", projectId)
  .single();

if (!canRead) {
  console.error("User cannot read this project");
}
```

2. **Incorrect Channel Setup**
```typescript
// ❌ Bad: Generic channel name
const channel = supabase.channel('changes');

// ✅ Good: Unique channel name
const channel = supabase.channel(`projects:${studioId}`);

// Subscribe with proper filters
channel
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'projects',
      filter: `studio_id=eq.${studioId}` // Filter for performance
    },
    (payload) => {
      console.log('Change received:', payload);
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

3. **Cleanup Issues**
```typescript
// Always cleanup subscriptions
useEffect(() => {
  const channel = supabase.channel(`room:${roomId}`);

  // Subscribe
  channel.subscribe();

  // IMPORTANT: Cleanup
  return () => {
    channel.unsubscribe();
  };
}, [roomId]); // Re-subscribe if roomId changes
```

## Performance Issues

### Slow Queries

**Symptoms:** Queries taking > 1 second

**Solutions:**

1. **Add Indexes**
```sql
-- Check slow queries in Supabase Dashboard → Database → Query Performance

-- Add indexes for common lookups
CREATE INDEX idx_projects_studio_id ON projects(studio_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_studio_members_user_studio ON studio_members(user_id, studio_id);
```

2. **Optimize Queries**
```typescript
// ❌ Bad: N+1 query
const studios = await supabase.from("studios").select("*");
for (const studio of studios.data) {
  const members = await supabase
    .from("studio_members")
    .select("*")
    .eq("studio_id", studio.id);
}

// ✅ Good: Single query with join
const { data } = await supabase
  .from("studios")
  .select(`
    *,
    studio_members (
      user_id,
      role,
      user:users (
        email,
        name
      )
    )
  `);
```

### Connection Pool Exhausted

**Error:**
```
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Solutions:**

1. **Reuse Supabase Client**
```typescript
// ❌ Bad: Creating new client each time
export async function getUser() {
  const supabase = createClient();
  return supabase.auth.getUser();
}

// ✅ Good: Reuse client
const supabase = createClient();
export async function getUser() {
  return supabase.auth.getUser();
}
```

2. **Close Unused Connections**
```typescript
// For long-running processes
process.on('SIGTERM', async () => {
  await supabase.removeAllChannels();
  process.exit(0);
});
```

## Local Development Issues

### Supabase CLI Not Working

**Error:**
```
Error: Cannot connect to local Supabase
```

**Solutions:**
```bash
# 1. Check Docker is running
docker --version
docker ps

# 2. Reset Supabase
npx supabase stop --backup
npx supabase start

# 3. Check status
npx supabase status

# 4. Use correct local URLs
# Local Supabase uses:
# API URL: http://localhost:54321
# ANON KEY: Check supabase status output
```

### Local vs Production Data Mismatch

**Issue:** Local database doesn't match production schema

**Solution:**
```bash
# 1. Pull remote schema
npx supabase db pull

# 2. Generate migration
npx supabase db diff --use-migra -f sync_with_production

# 3. Apply to local
npx supabase db reset

# 4. (Optional) Seed with test data
npx supabase db seed
```

## Environment Variable Issues

### Wrong Supabase Instance

**Symptoms:** Data not appearing, auth not working

**Check:**
```bash
# Verify you're using correct project
echo $NEXT_PUBLIC_SUPABASE_URL

# Should match your project:
# Production: https://[project-id].supabase.co
# Local: http://localhost:54321
```

**Solution:**
```typescript
// Add environment checks
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

// Verify in browser console
console.log('Connected to:', window.location.origin);
```

## Quick Debugging Commands

```bash
# Check local Supabase status
npx supabase status

# View recent migrations
ls -la supabase/migrations/

# Test database connection
npx supabase db lint

# Reset everything
npx supabase db reset --debug

# View Supabase logs
npx supabase logs --tail
```

## Getting Help

If issues persist:

1. Check Supabase Status: https://status.supabase.com
2. Review logs in Dashboard → Logs
3. Enable debug mode:
```typescript
const supabase = createClient({
  auth: {
    debug: true
  }
});
```
4. Check browser network tab for API responses
5. Test queries directly in SQL Editor