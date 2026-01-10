# Testing Checklist for Client Magic Link Auth

## 🔧 Setup
- [ ] Run local dev server: `npm run dev`
- [ ] Ensure Supabase is connected
- [ ] Check you have at least one studio and one client in your database

## ✅ Test 1: New Client Invite

**Steps:**
1. Go to dashboard → Clients → Select a client
2. Click "Invite User" button
3. Enter email address of someone who has NEVER signed up before
4. Submit the invite

**Expected Results:**
- [ ] User receives ONE email (from Supabase, not two emails)
- [ ] Email subject: "You have been invited" (or your Supabase template subject)
- [ ] Email contains a link that looks like: `https://[your-project].supabase.co/auth/v1/verify?...`
- [ ] Click the link
- [ ] Redirects to: `http://localhost:3000/bridge/verify` (or your dev URL)
- [ ] Token exchanges successfully
- [ ] Redirects to: `/bridge` (Bridge homepage)
- [ ] User is logged in and can see their project(s)

**❌ Old Broken Behavior:**
- User got redirected to `/signin` instead of `/bridge`
- Or user got TWO emails (one from Supabase, one branded from Resend with placeholder link)

---

## ✅ Test 2: Existing Client User (Magic Link)

**Steps:**
1. Use a client user who was already invited/activated
2. Log them out from the Bridge
3. Go to Bridge login page: `http://localhost:3000/bridge` or `bridge.saltcore.io`
4. Enter their email
5. Click "Send Magic Link"

**Expected Results:**
- [ ] User receives ONE email (Supabase magic link)
- [ ] Email subject: "Magic Link to sign in" (or your template)
- [ ] Click the link
- [ ] Redirects to: `/bridge/verify`
- [ ] Token exchanges
- [ ] Redirects to: `/bridge`
- [ ] User is logged in

---

## ✅ Test 3: Re-invite Existing User

**Steps:**
1. Go to dashboard → Clients → Client detail page
2. Find a user with status "pending" or "inactive"
3. Click "Resend Invite"

**Expected Results:**
- [ ] User receives ONE email (Supabase magic link)
- [ ] Link works and redirects correctly to `/bridge/verify` → `/bridge`

---

## ✅ Test 4: Studio Owner Login (Regression Test)

**Steps:**
1. Log out from dashboard
2. Go to `/signin`
3. Sign in with Google OAuth OR email magic link

**Expected Results:**
- [ ] Login works normally
- [ ] Redirects to `/dashboard`
- [ ] NO issues with existing auth flow

---

## ✅ Test 5: Multi-Client Access

**Steps:**
1. Create a client user who has access to 2+ clients
2. Log in to Bridge
3. Check if they see project picker

**Expected Results:**
- [ ] User can select which client's projects to view
- [ ] Switching works correctly
- [ ] URLs reflect current client context

---

## 🚨 Edge Cases to Test

### Test 6: Revoked Access
- [ ] Studio owner revokes a client user's access
- [ ] User receives "Access Revoked" email (this one IS from Resend, branded)
- [ ] User cannot log in to that client's Bridge anymore

### Test 7: Invalid Magic Link
- [ ] Try using an expired magic link (wait 1+ hour)
- [ ] Should show appropriate error message

### Test 8: Wrong Host
- [ ] Try accessing `/bridge` from `app.saltcore.io` (studio domain)
- [ ] Should redirect to appropriate page or show access denied

---

## ✅ Success Criteria

**All tests pass if:**
1. ✅ Only ONE email per action (no duplicate emails)
2. ✅ Magic links work and redirect to `/bridge/verify` → `/bridge`
3. ✅ No redirects to `/signin` for Bridge users
4. ✅ Studio owner login still works normally
5. ✅ Access revoked emails are branded (from studio, not Salt Core)

---

## 🐛 If Tests Fail

**Check these files:**
- `app/api/auth/callback/route.ts` - OAuth callback handling
- `app/bridge/verify/page.tsx` - Magic link token exchange
- `middleware.ts` - Host-based routing and rewrites
- `libs/tenancy/context.ts` - Tenant context resolution
- Supabase Dashboard → Auth → URL Configuration

**Logs to check:**
- Browser console for errors
- Supabase Dashboard → Logs → Auth logs
- Terminal/server logs

---

## 📝 Notes
- **Date tested:** _____________
- **Tester:** _____________
- **Environment:** □ Local Dev  □ Staging  □ Production
- **Issues found:** _____________

