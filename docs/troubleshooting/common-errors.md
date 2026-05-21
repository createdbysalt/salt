# Common Errors & Solutions

**Context:** Quick solutions to frequently encountered errors in Salt development.

## Build Errors

### Missing Environment Variables

**Error:**
```
Error: Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY
```

**Solution:**
```bash
# 1. Copy example env file
cp .env.example .env.local

# 2. Add missing variables
# Get from Supabase Dashboard → Settings → API

# 3. Restart dev server
pnpm dev
```

### TypeScript Errors

**Error:**
```
Type error: Property 'params' does not exist on type 'Promise<{ id: string }>'
```

**Cause:** Next.js 15 params are now Promises

**Solution:**
```typescript
// Before (Next.js 14)
export default function Page({ params }) {
  const { id } = params;
}

// After (Next.js 15)
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
}
```

### Module Not Found

**Error:**
```
Module not found: Can't resolve '@/components/Button'
```

**Solution:**
```bash
# 1. Check file exists
ls components/Button.tsx

# 2. Check tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# 3. Clear cache and rebuild
rm -rf .next
pnpm dev
```

## Runtime Errors

### Hydration Mismatch

**Error:**
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**Common Causes & Solutions:**

```typescript
// ❌ Bad: Date/time on server vs client
<div>{new Date().toLocaleString()}</div>

// ✅ Good: Use stable values
<div>{format(date, "PPP")}</div>

// ❌ Bad: Random values
<div>{Math.random()}</div>

// ✅ Good: Use stable IDs
<div>{user.id}</div>

// ❌ Bad: Browser-only checks in SSR
{typeof window !== 'undefined' && <ClientOnlyComponent />}

// ✅ Good: Use dynamic import
const ClientOnly = dynamic(() => import('./ClientOnly'), {
  ssr: false
});
```

### Headers Already Sent

**Error:**
```
Error: Can't set headers after they are sent to the client
```

**Solution:**
```typescript
// ❌ Bad: Multiple responses
export async function GET() {
  if (condition) {
    return NextResponse.json({ error: "Bad" });
  }
  // Missing return causes second response
  NextResponse.json({ data: "Good" });
}

// ✅ Good: Single response
export async function GET() {
  if (condition) {
    return NextResponse.json({ error: "Bad" });
  }
  return NextResponse.json({ data: "Good" });
}
```

## Supabase Errors

### Auth Session Missing

**Error:**
```
Error: No user session found
AuthApiError: Invalid JWT
```

**Solution:**
```typescript
// 1. Always check auth first
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user || error) {
  redirect("/signin");
}

// 2. Handle expired sessions
if (error?.message.includes("JWT")) {
  await supabase.auth.signOut();
  redirect("/signin");
}
```

### RLS Policy Violation

**Error:**
```
Error: new row violates row-level security policy for table "projects"
```

**Solution:**
```sql
-- Check current user
SELECT auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- Common fix: Add INSERT policy
CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (studio_id IN (
  SELECT studio_id FROM studio_members
  WHERE user_id = auth.uid()
));
```

### Foreign Key Violation

**Error:**
```
Error: insert or update on table "projects" violates foreign key constraint
code: 23503
```

**Solution:**
```typescript
// Verify parent record exists
const { data: studio } = await supabase
  .from("studios")
  .select("id")
  .eq("id", studioId)
  .single();

if (!studio) {
  throw new Error("Studio not found");
}

// Then create child record
const { data: project } = await supabase
  .from("projects")
  .insert({ studio_id: studioId, ...data });
```

## Stripe Errors

### Webhook Signature Failed

**Error:**
```
Error: Webhook signature verification failed
```

**Solution:**
```typescript
// 1. Use raw body, not parsed
export async function POST(req: NextRequest) {
  const body = await req.text(); // NOT req.json()

  // 2. Get fresh webhook secret
  const sig = headers().get("stripe-signature");

  // 3. Use correct secret for environment
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  stripe.webhooks.constructEvent(body, sig, webhookSecret);
}
```

### Customer Already Exists

**Error:**
```
Error: Customer email already exists
```

**Solution:**
```typescript
// Check for existing customer first
const existingCustomers = await stripe.customers.list({
  email: userEmail,
  limit: 1,
});

let customerId;
if (existingCustomers.data.length > 0) {
  customerId = existingCustomers.data[0].id;
} else {
  const newCustomer = await stripe.customers.create({
    email: userEmail,
  });
  customerId = newCustomer.id;
}
```

## Next.js Errors

### Dynamic Import Failed

**Error:**
```
Error: Failed to import dynamic component
```

**Solution:**
```typescript
// ❌ Bad: Conditional dynamic import
const Component = dynamic(() =>
  condition ? import('./A') : import('./B')
);

// ✅ Good: Stable imports
const ComponentA = dynamic(() => import('./A'));
const ComponentB = dynamic(() => import('./B'));

return condition ? <ComponentA /> : <ComponentB />;
```

### API Route Not Found

**Error:**
```
404: API route not found
```

**Common Issues:**
```bash
# Wrong file name
app/api/users/index.ts  # ❌ Bad
app/api/users/route.ts  # ✅ Good

# Wrong method
export async function get()  # ❌ Bad
export async function GET()  # ✅ Good

# Missing export
async function POST()  # ❌ Bad
export async function POST()  # ✅ Good
```

## Database Errors

### Connection Timeout

**Error:**
```
Error: Connection timeout - no response from database
```

**Solution:**
```bash
# 1. Check Supabase status
npx supabase status

# 2. Check connection string
echo $DATABASE_URL

# 3. Restart local Supabase
npx supabase stop
npx supabase start

# 4. Check network/VPN
```

### Migration Failed

**Error:**
```
Error: Migration failed: syntax error at or near "EXIST"
```

**Solution:**
```sql
-- Common SQL syntax issues

-- ❌ Bad
CREATE TABLE IF NOT EXIST users

-- ✅ Good
CREATE TABLE IF NOT EXISTS users

-- ❌ Bad: Missing semicolons
CREATE TABLE users (...)
ALTER TABLE users...

-- ✅ Good: End statements with semicolons
CREATE TABLE users (...);
ALTER TABLE users...;
```

## Development Environment

### Port Already in Use

**Error:**
```
Error: Port 3000 is already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or use different port
PORT=3001 pnpm dev
```

### Node Version Mismatch

**Error:**
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check current version
node --version

# Use volta (recommended)
volta install node@20

# Or use nvm
nvm install 20
nvm use 20
```

## Performance Issues

### Slow Page Load

**Symptoms:** Pages take long to load in development

**Solutions:**
```typescript
// 1. Check for N+1 queries
// ❌ Bad
const studios = await getStudios();
for (const studio of studios) {
  studio.members = await getMembers(studio.id);
}

// ✅ Good: Use joins
const studios = await supabase
  .from("studios")
  .select("*, studio_members(*)");

// 2. Add loading states
<Suspense fallback={<Loading />}>
  <SlowComponent />
</Suspense>

// 3. Use static generation where possible
export const revalidate = 3600; // 1 hour
```

### Memory Leaks

**Symptoms:** Dev server crashes, "JavaScript heap out of memory"

**Solutions:**
```bash
# 1. Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev

# 2. Clear caches
rm -rf .next
rm -rf node_modules/.cache

# 3. Check for infinite loops
// Common in useEffect without deps
useEffect(() => {
  // This runs forever!
  setState(new Date());
}); // Missing dependency array
```

## Quick Fixes Reference

| Error Pattern | Quick Fix |
|--------------|-----------|
| "Cannot read property of undefined" | Add optional chaining: `user?.profile?.name` |
| "Headers already sent" | Ensure single response with `return` |
| "Hydration mismatch" | Check for dynamic content, use `suppressHydrationWarning` |
| "Module not found" | Clear cache: `rm -rf .next` |
| "Invalid hook call" | Check if component needs "use client" |
| "Too many re-renders" | Check setState in render, add dependencies |
| "CORS error" | Add CORS headers to API route |
| "Rate limit exceeded" | Implement request throttling |