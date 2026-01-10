# Bridge Magic Link Setup Instructions

## ⚠️ CRITICAL: Configure Supabase Redirect URLs

The Bridge uses magic links for client authentication. For this to work, you **MUST** add the redirect URL to your Supabase project.

### Steps to Configure:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration

2. **Add Redirect URLs**
   
   Add these URLs to the "Redirect URLs" section:
   
   **For Development:**
   ```
   http://localhost:3000/bridge/verify
   http://localhost:3000/api/auth/callback
   ```
   
   **For Production:**
   ```
   https://yourdomain.com/bridge/verify
   https://yourdomain.com/api/auth/callback
   https://bridge.saltcore.io/verify
   https://bridge.saltcore.io/api/auth/callback
   ```

3. **Save Changes**

### How It Works:

1. **Client invite flow:**
   - Studio owner invites client → `inviteClientUser` server action
   - Supabase sends email with magic link
   - Link redirects to `/bridge/verify` with token in URL hash
   - Verify page exchanges token for session
   - Redirects to `/bridge` (client portal)

2. **Magic link format:**
   ```
   http://localhost:3000/bridge/verify#access_token=xxx&refresh_token=yyy&type=magiclink
   ```

3. **Troubleshooting:**
   - If users are sent to signin page: Check Supabase redirect URL configuration
   - If "Invalid login link" error: Link expired (1 hour timeout)
   - Check browser console for verification logs (🔑, ✅, ❌ emojis)

### Testing the Flow:

```bash
# 1. Start your dev server
npm run dev

# 2. Sign in as studio owner
# Navigate to /dashboard/clients/[CLIENT_ID]

# 3. Invite a client user
# Use a real email you can access

# 4. Check your email
# Click the magic link

# 5. You should be redirected through:
#    Email → /bridge/verify → /bridge (client portal)
```

### Environment Variables:

Make sure these are set in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Common Issues:

**Issue:** "Email link is invalid or has expired"
- **Fix:** Links expire after 1 hour. Request a new one via "Resend Invite"

**Issue:** Redirected to signin page instead of bridge
- **Fix:** Add `http://localhost:3000/bridge/verify` to Supabase Redirect URLs

**Issue:** "Access denied" after clicking link
- **Fix:** User's `client_users` status might be revoked. Check database.

### Verification Checklist:

- [ ] Redirect URLs added to Supabase dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` matches your domain
- [ ] Email provider (Resend) is configured
- [ ] Client user exists in `client_users` table
- [ ] Client user status is `pending` (before first login) or `active` (after)
- [ ] Browser console shows verification logs

---

**Need Help?** Check the logs in:
- Browser console (client-side verification)
- Terminal (server-side invite/auth logs)
- Supabase Auth Logs (supabase.com/dashboard → Authentication → Logs)

