# GitHub OAuth Setup Guide

This guide walks through enabling GitHub OAuth for Salt Core studio owners.

---

## Prerequisites
- Supabase project with Auth enabled
- GitHub account (for creating OAuth app)

---

## Step 1: Create GitHub OAuth App

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
   - URL: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the application details:
   - **Application name:** `Salt Core` (or your preferred name)
   - **Homepage URL:** `https://saltcore.io` (or your production domain)
   - **Authorization callback URL:** 
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference ID.
     
     Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

4. Click **"Register application"**

5. **Save the credentials:**
   - **Client ID:** (copy this)
   - Click **"Generate a new client secret"** and copy the secret immediately (you won't see it again)

---

## Step 2: Configure Supabase Auth

1. Go to your **Supabase Dashboard** → **Authentication** → **Providers**

2. Find **GitHub** in the list of providers

3. Enable GitHub and enter your credentials:
   - **Client ID:** (from Step 1)
   - **Client Secret:** (from Step 1)

4. **Enable automatic account linking** (recommended):
   - In Supabase Dashboard → **Authentication** → **Providers** → **GitHub**
   - Check **"Allow automatic account linking"** or similar setting
   - This ensures users who sign in with Google and GitHub using the same email get the same account

5. Click **Save**

---

## Step 3: Add Redirect URLs (Production)

When deploying to production, you'll need to add additional redirect URLs:

### For Studio Owners (app.saltcore.io)
Add this redirect URL in your GitHub OAuth app:
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

### For Bridge Users (if allowing OAuth for clients)
If you want to allow client users to sign in with GitHub on the Bridge:
```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

**Note:** Supabase uses a single callback URL for all OAuth providers. The redirect happens server-side, then Supabase redirects to your app's callback URL (configured in your app).

---

## Step 4: Environment Variables (Optional)

No additional environment variables are needed! Supabase handles GitHub OAuth entirely through the dashboard configuration.

However, if you want to reference the provider in your code:
```typescript
// Already supported in app/signin/page.tsx
await supabase.auth.signInWithOAuth({
  provider: "github",
  options: {
    redirectTo: window.location.origin + "/api/auth/callback",
  },
});
```

---

## Step 5: Test the Integration

### Local Testing
1. Start your dev server: `npm run dev`
2. Navigate to `/signin`
3. Click **"Sign-up with GitHub"**
4. Authorize the app on GitHub
5. You should be redirected back to `/dashboard`

### Production Testing
1. Deploy your app
2. Update the GitHub OAuth app's **Authorization callback URL** to use your production Supabase URL
3. Test the same flow on your production domain

---

## Account Linking Behavior

### Same Email, Different Providers
- **Automatic linking enabled:** User signs in with Google → later signs in with GitHub (same email) → **same account**
- **Automatic linking disabled:** User signs in with Google → later signs in with GitHub (same email) → **two separate accounts** (NOT recommended)

### Manual Linking (Future Enhancement)
You can add a "Link GitHub" button in user settings:
```typescript
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'github'
});
```

---

## Security Considerations

1. **Verified Emails Only:** 
   - Supabase only links accounts if the email is verified on both providers
   - GitHub OAuth automatically provides verified emails

2. **Redirect URL Validation:**
   - Supabase validates all redirect URLs against your configured allowlist
   - Never allow open redirects

3. **Rate Limiting:**
   - Supabase automatically rate-limits auth endpoints
   - Consider adding additional rate limiting for your `/signin` page if needed

---

## Troubleshooting

### "Invalid redirect URI" Error
- Double-check the callback URL in your GitHub OAuth app matches your Supabase project URL exactly
- Format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### "Email already registered" Error
- This means a user with that email already exists
- If you want automatic linking, ensure it's enabled in Supabase Dashboard
- Otherwise, the user should sign in with their original provider

### GitHub Authorization Fails
- Check that your Client ID and Client Secret are correct in Supabase Dashboard
- Ensure the GitHub OAuth app is not suspended or deleted
- Verify the callback URL is correct

---

## Next Steps

- ✅ GitHub OAuth is now enabled for studio owners
- ✅ Users can sign in with Google OR GitHub
- ✅ Automatic account linking prevents duplicate accounts
- 🔜 Add "Link GitHub" button in user settings (optional)
- 🔜 Add GitHub profile picture to user profiles (optional)

---

## References

- [Supabase Auth - GitHub Provider](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

