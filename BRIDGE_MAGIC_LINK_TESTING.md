# Bridge Magic Link Testing Guide

This guide helps you test the complete client invite flow, including the new magic link feature for re-invited users.

---

## 🎯 What Changed

When you re-invite a previously revoked client user, the system now:
1. ✅ Detects they already have a Supabase Auth account
2. ✅ Generates a **magic link** (one-click login)
3. ✅ Sends a "Welcome back" email with the magic link
4. ✅ Shows you a clear success message

---

## 🧪 Test Scenarios

### Scenario 1: Inviting a NEW Client User (First Time)

**Goal:** Verify new users receive the standard invite email.

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Sign in as a Studio Member:**
   - Go to `http://localhost:3000/dashboard`

3. **Go to a Client's detail page:**
   - Navigate to `/dashboard/clients`
   - Click on any client

4. **Invite a NEW email address:**
   - Scroll to "Client Users" section
   - Enter an email that **has never been used** in your Supabase project
   - Select role (Client/Viewer)
   - Click "Invite"

5. **Expected Result:**
   - ✅ Success message: "Invite sent successfully!"
   - ✅ Email received with "Accept invitation" link
   - ✅ User appears in "Client Users" list

6. **Accept the invite:**
   - Open the email
   - Click "Accept invitation"
   - Set a password
   - Should redirect to `http://localhost:3000/bridge`
   - Should see welcome message with client's projects

---

### Scenario 2: Re-inviting a PREVIOUSLY REVOKED Client User (Magic Link)

**Goal:** Verify existing users receive a magic link email.

1. **Revoke an existing client user:**
   - Go to a client's detail page
   - Find an invited user in the "Client Users" list
   - Click "Revoke"
   - Confirm the action
   - ✅ User should disappear from the list

2. **Re-invite the same email:**
   - In the "Client Users" section, enter the **same email** you just revoked
   - Click "Invite"

3. **Expected Result:**
   - ✅ No error! (Previously this would fail)
   - ✅ Success message: "User re-added! A magic link has been sent to their email."
   - ✅ User reappears in "Client Users" list

4. **Check the magic link email:**
   - Open the email client for the re-invited user
   - **Email Subject:** "Welcome back to your Salt Core Bridge Portal"
   - **Email should include:**
     - Welcome message
     - Big blue "Access Your Portal →" button
     - Fallback link for copy/paste

5. **Click the magic link:**
   - Click "Access Your Portal →" in the email
   - **Expected:** Automatically signed in and redirected to `http://localhost:3000/bridge`
   - **Expected:** See the Bridge home page with projects
   - **No password prompt** (magic link = instant access)

---

### Scenario 3: Re-inviting when Email Send Fails (Fallback)

**Goal:** Verify the system handles email failures gracefully.

1. **Temporarily break email sending:**
   - Open `.env.local`
   - Comment out or change `RESEND_API_KEY` to an invalid value:
     ```
     # RESEND_API_KEY=re_...
     RESEND_API_KEY=invalid_key
     ```
   - **Restart your dev server** (`npm run dev`)

2. **Revoke and re-invite a user:**
   - Revoke a client user (same as Scenario 2)
   - Re-invite them

3. **Expected Result:**
   - ✅ No error! The invite still succeeds
   - ✅ Success message: "User re-added successfully! They can sign in at bridge.saltcore.io"
   - ✅ User is back in the database (can log in manually)
   - ⚠️ No email sent (but operation completes)

4. **Manual login test:**
   - Go to `http://localhost:3000/bridge`
   - Click "Sign In"
   - Enter the user's email and password
   - **Expected:** Successfully logs in to Bridge

5. **Restore email:**
   - Uncomment `RESEND_API_KEY` in `.env.local`
   - Restart dev server

---

## 📧 Magic Link Email Preview

When a user is re-invited, they receive this email:

**Subject:** Welcome back to your Salt Core Bridge Portal

**Body:**
```
Welcome back! 👋

You've been re-added to access [Client Name]'s project portal.

[Access Your Portal →]  <-- Big blue button (magic link)

Or copy this link:
https://[long-magic-link-url]

---
Powered by Salt Core | bridge.saltcore.io
```

---

## 🔍 Debugging Checklist

If magic links aren't working:

### 1. Check Environment Variables
```bash
cd /Users/gabriellamartins/Documents/GitHub/SALT/salt-core
cat .env.local | grep -E "RESEND_API_KEY|NEXT_PUBLIC_BRIDGE_URL|SUPABASE_SERVICE_ROLE_KEY"
```

**Expected:**
- `RESEND_API_KEY=re_...` (valid Resend key)
- `NEXT_PUBLIC_BRIDGE_URL=http://localhost:3000/bridge` (for local dev)
- `SUPABASE_SERVICE_ROLE_KEY=eyJ...` (valid service role key)

### 2. Check Supabase Auth Settings
- Go to Supabase Dashboard → Authentication → URL Configuration
- **Redirect URLs** should include:
  - `http://localhost:3000/bridge/api/auth/callback`
  - `https://bridge.saltcore.io/api/auth/callback` (for production)

### 3. Check Terminal Logs
Look for these in your terminal:
- ✅ "Re-adding existing user [email] to client [id]"
- ❌ "Error generating magic link:" (indicates Supabase admin issue)
- ❌ "Error sending welcome-back email:" (indicates Resend issue)

### 4. Check Email Logs
- Go to Resend Dashboard → Logs
- Find the "Welcome back" email
- Check if it was delivered or bounced

---

## ✅ Success Criteria

All scenarios pass if:
1. ✅ New users receive standard invite emails
2. ✅ Re-invited users receive magic link emails
3. ✅ Magic links log users in instantly (no password prompt)
4. ✅ Email failures don't crash the invite process
5. ✅ Clear success messages for all scenarios
6. ✅ Users appear in the "Client Users" list after re-invite

---

## 🚀 Ready for Production

Before deploying to production:

1. **Update `.env` on Vercel:**
   - `NEXT_PUBLIC_BRIDGE_URL=https://bridge.saltcore.io`

2. **Update Supabase URL Configuration:**
   - Add production redirect URL: `https://bridge.saltcore.io/api/auth/callback`

3. **Test in production:**
   - Repeat all scenarios above on your production domain

---

## 📝 Notes

- Magic links expire after **24 hours** (Supabase default)
- Magic links are **single-use** (after clicking, the link is invalidated)
- If a user loses their magic link email, they can still sign in manually at `bridge.saltcore.io`
- The system never deletes Supabase Auth users, only `client_users` entries (for clean re-invites)

