# Bridge Redirect Configuration Guide

## Issue Resolved ✅
Client users were clicking placeholder links in branded emails instead of the real Supabase magic links.

**Solution:** We now only send Supabase's native emails for invites/magic links. Studio owners should customize those templates in the Supabase dashboard instead.

## The Real Problem

When inviting client users, we were sending **two emails**:
1. ✅ Supabase's email with the real magic link (correct redirect)
2. ❌ Our branded email with a placeholder link (wrong redirect)

Users naturally clicked the prettier branded email, but its link was a placeholder that didn't work.

## The Fix

We've removed the branded emails for invites and magic links. Now:
- **Invites:** Only Supabase's `inviteUserByEmail` email is sent
- **Magic links:** Only Supabase's `signInWithOtp` email is sent
- **Access revoked:** Still sends our branded notification email (no link needed)

Studio owners should **customize the Supabase email templates** in the dashboard to match their branding.

---

## How to Customize Supabase Email Templates

### Step 1: Access Email Templates
1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. You'll see templates for:
   - Confirm signup
   - Invite user
   - **Magic Link** ← For client sign-ins
   - Reset password
   - Change email

### Step 2: Customize the Magic Link Template

This is what clients will see when they're invited or request a sign-in link.

**Default template variables:**
- `{{ .ConfirmationURL }}` - The actual magic link (keep this!)
- `{{ .Token }}` - The verification token
- `{{ .SiteURL }}` - Your site URL

**Recommended customization:**
```html
<h2>Access the bridge</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to the bridge</a></p>
<p>This link expires in 1 hour.</p>
```

**Important:** Always use `{{ .ConfirmationURL }}` - this contains the correct redirect to `/bridge/verify`.

### Step 3: Customize the Invite User Template

This is for new client users being invited for the first time.

**Recommended customization:**
```html
<h2>You've been invited</h2>
<p>You've been invited to access the bridge for [Client Name].</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
<p>This invitation expires in 7 days.</p>
```

### Step 4: Add Branding (Optional)

Supabase email templates support HTML and inline CSS:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; padding: 20px;">
    <img src="YOUR_LOGO_URL" alt="Studio Logo" style="max-width: 150px;">
  </div>
  <div style="background: #fff; padding: 30px; border-radius: 8px;">
    <h2>You've been invited to the bridge</h2>
    <p>Click below to get started:</p>
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
      Access the Bridge
    </a>
  </div>
</div>
```

---

## Configuration Steps (If Issues Persist)

### 1. Missing Environment Variable
If `NEXT_PUBLIC_SITE_URL` is not set, the system defaults to `http://localhost:3000` in development.

**Fix:**
```env
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For production:
NEXT_PUBLIC_SITE_URL=https://app.saltcore.io
```

### 2. Supabase Dashboard Configuration

#### Redirect URLs Whitelist
Go to **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**

Add these URLs:
- `http://localhost:3000/bridge/verify` (development)
- `http://localhost:3000/api/auth/callback` (development)
- `https://bridge.saltcore.io/bridge/verify` (production)
- `https://bridge.saltcore.io/api/auth/callback` (production)
- `https://app.saltcore.io/api/auth/callback` (production)

#### Site URL
Go to **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Site URL**

Set to:
- Development: `http://localhost:3000`
- Production: `https://app.saltcore.io` (or your main domain)

### 3. Email Template Redirect

Supabase's magic link emails use the `emailRedirectTo` parameter we provide in the code, BUT they also respect the Site URL configuration in the dashboard.

**Check:** Go to **Supabase Dashboard** → **Authentication** → **Email Templates** → **Magic Link**

The template should use: `{{ .ConfirmationURL }}`

This variable automatically includes the `emailRedirectTo` parameter we set in the code.

## Verification Steps

### Step 1: Check Current Configuration

Run this in your app to see what redirect URL is being generated:

```typescript
console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
```

### Step 2: Test Magic Link Flow

1. Invite a client user
2. Check the email that arrives
3. Copy the magic link URL
4. Verify it contains `/bridge/verify`

**Expected URL format:**
```
http://localhost:3000/bridge/verify#access_token=...&refresh_token=...
```

or

```
https://bridge.saltcore.io/bridge/verify#access_token=...&refresh_token=...
```

### Step 3: Check Supabase Logs

Go to **Supabase Dashboard** → **Authentication** → **Logs**

Look for `signInWithOtp` events and check the `emailRedirectTo` parameter.

## Current Code Flow

### For Existing Users (Re-invite)
```typescript
// app/(user_dashboard)/dashboard/clients/[id]/actions.ts
const redirectUrl = `${siteUrl}/bridge/verify`;

await supabaseAdmin.auth.signInWithOtp({
  email: validatedData.email,
  options: {
    emailRedirectTo: redirectUrl,  // Should be /bridge/verify
  },
});
```

### For New Users (First Invite)
```typescript
await supabaseAdmin.auth.admin.inviteUserByEmail(
  validatedData.email,
  {
    redirectTo: `${siteUrl}/api/auth/callback`,  // This is correct
  }
);
```

**Note:** New user invites go to `/api/auth/callback` (not `/bridge/verify`) because they use a code-based flow, not a token fragment flow.

## Quick Fix for Testing

If you want to test immediately without configuring everything:

### Option 1: Manual Redirect Check
After clicking the magic link, check your browser's address bar. If it goes to `/signin`, manually change it to `/bridge/verify` and see if the token is still in the URL fragment (`#access_token=...`).

### Option 2: Update .env.local
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then restart your dev server:
```bash
pnpm dev
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_SITE_URL` environment variable in Vercel/hosting platform
- [ ] Whitelist all Bridge redirect URLs in Supabase dashboard
- [ ] Set production Site URL in Supabase dashboard
- [ ] Test magic link flow in production
- [ ] Verify emails arrive with correct Bridge domain

## Debugging

If magic links still go to the wrong place:

1. **Check the actual email:**
   - Look at the link in the email body
   - Copy it and inspect the URL structure
   
2. **Check Supabase configuration:**
   - Dashboard → Authentication → URL Configuration
   - Ensure redirect URLs are whitelisted
   
3. **Check browser console:**
   - Open `/bridge/verify` in dev tools
   - Look for token exchange errors
   
4. **Check server logs:**
   - Look for the console.log in `actions.ts` that shows the redirectUrl
   - Verify it's generating `/bridge/verify`

## Expected Behavior

### Studio Owner Flow
- Sign in at `/signin` → redirects to `/dashboard`

### Client User Flow
- Click magic link → goes to `/bridge/verify` → exchanges token → redirects to `/bridge`
- If no access → redirects to `/no-access`

## Contact

If issues persist after following this guide, check:
- Supabase Auth logs
- Browser network tab for redirect chain
- Server console for generated redirect URLs

