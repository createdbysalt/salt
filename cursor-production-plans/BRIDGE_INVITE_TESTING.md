# Bridge Client Invite Testing Guide

> **✨ NEW:** Magic link support for re-invited users! See `BRIDGE_MAGIC_LINK_TESTING.md` for comprehensive magic link testing.

## What was fixed

Client invite emails were redirecting to the wrong domain (localhost root or app domain) instead of the Bridge portal. This has been fixed by:

1. Updating Supabase Auth URL configuration to allowlist Bridge callback URLs
2. Using environment-driven Bridge URL in invite and callback flows
3. Adding localhost Bridge at `/bridge` path for local testing
4. Ensuring client-only users always redirect to Bridge after auth

## Testing Instructions

### Step 1: Update Supabase Auth Configuration

**CRITICAL:** Must be done before testing!

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `https://app.saltcore.io`
3. Click **"Add URL"** under Redirect URLs and add:
   - `https://bridge.saltcore.io/api/auth/callback`
   - `https://app.saltcore.io/api/auth/callback`
   - `http://localhost:3000/api/auth/callback`
4. Click **"Save changes"**

### Step 2: Set Environment Variables

Add to your `.env.local`:

```bash
# For local development
NEXT_PUBLIC_BRIDGE_URL=http://localhost:3000/bridge

# For production (when deploying)
# NEXT_PUBLIC_BRIDGE_URL=https://bridge.saltcore.io
```

Restart your dev server after adding this!

### Step 3: Test Invite Flow (Local)

1. **Start dev server**: `npm run dev`

2. **Sign in as studio member**: 
   - Go to `http://localhost:3000/signin`
   - Sign in with your studio account

3. **Create a test client**:
   - Go to `http://localhost:3000/dashboard/clients/new`
   - Create a client (e.g., "Test Client")

4. **Invite a client user**:
   - Go to client detail page
   - Scroll to "Client Users" section
   - Enter an email you can access (use a different email from your studio account)
   - Click "Invite"

5. **Check the invite email**:
   - Open the email in the invited user's inbox
   - **Verify the link contains**: `redirect_to=http://localhost:3000/bridge/api/auth/callback`
   - If it still shows just `localhost:3000` without `/bridge`, restart your dev server

6. **Click "Accept invitation"**:
   - Should redirect to `http://localhost:3000/bridge`
   - Should see "Welcome, [email]!" and the client portal
   - Should see "Your Projects" section (might be empty if no projects)

7. **Verify session**:
   - Try navigating to `http://localhost:3000/dashboard`
   - Should be **blocked** (client users can't access studio dashboard)
   - Should redirect back to Bridge or show access denied

### Step 4: Test on Production

Once deployed:

1. Update `.env` in production with:
   ```bash
   NEXT_PUBLIC_BRIDGE_URL=https://bridge.saltcore.io
   ```

2. Repeat invite flow test

3. **Expected behavior**:
   - Invite link contains `redirect_to=https://bridge.saltcore.io/api/auth/callback`
   - After accepting, user lands on `https://bridge.saltcore.io/`
   - Client sees their projects
   - Cannot access `https://app.saltcore.io/dashboard`

## Troubleshooting

### Issue: "Invalid redirect URL" error

**Cause**: Supabase Auth URL Configuration not updated

**Fix**: Double-check Step 1. Make sure all 3 redirect URLs are added and saved.

### Issue: Still landing on localhost root

**Cause 1**: `.env.local` not loaded or dev server not restarted

**Fix**: 
```bash
# Stop dev server (Ctrl+C)
# Verify .env.local exists and has NEXT_PUBLIC_BRIDGE_URL
cat .env.local | grep BRIDGE
# Restart
npm run dev
```

**Cause 2**: Old invite link (generated before fix)

**Fix**: Send a new invite after making changes

### Issue: "Access Denied" on Bridge

**Cause**: User is not in `client_users` table

**Fix**: 
```sql
-- Check if user exists in client_users
SELECT * FROM client_users WHERE email = 'invited@email.com';

-- If missing, user wasn't added correctly during invite
-- Re-invite the user
```

### Issue: Client user can access studio dashboard

**Cause**: User exists in both `studio_members` and `client_users`

**Fix**: This is expected behavior. Users can have both roles. The callback redirects to dashboard for dual-role users. To test pure client flow, use an email that's not in `studio_members`.

## Success Criteria

- ✅ Invite email contains Bridge callback URL
- ✅ Client accepts invite and lands on Bridge
- ✅ Client sees their portal with projects
- ✅ Client-only users **cannot** access `/dashboard`
- ✅ Works on both localhost (at `/bridge`) and production (at Bridge domain)

## Files Changed

- `app/(user_dashboard)/dashboard/clients/[id]/actions.ts` - Uses `NEXT_PUBLIC_BRIDGE_URL`
- `app/api/auth/callback/route.ts` - Environment-driven Bridge redirect
- `app/bridge/page.tsx` - New Bridge home page
- `app/bridge/projects/[id]/page.tsx` - Bridge project detail
- `.env.example` - Documents Bridge URL variable
- `PREFLIGHT_CHECKLIST.md` - Added Supabase URL config instructions

## Next Steps

After successful testing:

1. Commit changes with message: `fix: client invite redirects to Bridge instead of main app`
2. Push to GitHub
3. Create PR with testing notes
4. Deploy to production
5. Update production Supabase Auth URL config
6. Test in production

---

**Need help?** Check `PREFLIGHT_CHECKLIST.md` or open a GitHub issue.

