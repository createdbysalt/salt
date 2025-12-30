# Existing Auth Infrastructure Audit
**Generated:** 2025-12-29  
**Purpose:** Document what's already implemented to avoid duplicating work

---

## ✅ Authentication System (Supabase Auth)

### Current Implementation
- **Primary auth system:** Supabase Auth (NOT Auth.js v5)
- **Providers active:**
  - ✅ Google OAuth (implemented)
  - ❌ GitHub OAuth (NOT implemented yet)
  - ✅ Email magic link (implemented)

### Key Files
- `/app/signin/page.tsx` - Studio login page with Google OAuth + magic link
- `/app/api/auth/callback/route.ts` - OAuth/OTP token exchange + automatic redirect logic
- `/app/bridge/verify/page.tsx` - Magic link landing page for client users (token exchange client-side)
- `/components/ButtonSignin.tsx` - Reusable sign-in button component

### Current Flows
1. **Studio Owner Sign-In:**
   - Google OAuth OR email magic link
   - Redirects to `/api/auth/callback`
   - Auto-creates studio + studio_member via `handle_new_user()` trigger
   - Final redirect to `/dashboard`

2. **Client User Sign-In:**
   - Magic link sent by studio owner (invite)
   - Lands on `/bridge/verify` (client-side token exchange)
   - Updates `client_users.status` from 'pending' to 'active'
   - Redirects to Bridge

---

## ✅ Database Schema (Multi-Tenant)

### Existing Tables

#### Core Auth
- **`public.profiles`** (ShipFast/Stripe integration)
  - Fields: `id`, `email`, `customer_id`, `price_id`, `has_access`
  - ❌ Missing: `first_name`, `last_name`, `display_name`, `avatar_url`

#### Multi-Tenant (Salt Core)
- **`public.studios`** - Studio owner tenants
  - Fields: `id`, `name`, `slug`, `owner_id`, `stripe_*`, `subscription_status`, `settings`
  - Auto-created for each new user via trigger
  
- **`public.studio_members`** - Studio team membership
  - Fields: `id`, `studio_id`, `user_id`, `role`, `email`
  - Roles: `owner`, `admin`, `member`, `viewer`
  
- **`public.clients`** - Studio's customers
  - Fields: `id`, `studio_id`, `name`, `slug`, `contact_email`, `contact_phone`, `settings`
  - Unique constraint on `(studio_id, slug)`
  
- **`public.client_users`** - Client portal users
  - Fields: `id`, `client_id`, `user_id`, `role`, `email`, **`status`**
  - ✅ Status field added: `pending` | `active` (migration `20251228120000`)
  - Roles: `client`, `viewer`
  
- **`public.bridge_portals`** - Client portal configuration
  - Fields: `id`, `client_id`, `custom_domain`, `domain_verified`, `status`, `theme_config`
  - ❌ **Note:** Has `custom_domain` but NO verification workflow implemented yet
  
- **`public.projects`** - Projects for clients
  - Fields: `id`, `studio_id`, `client_id`, `name`, `slug`, `status`, `project_type`, `metadata`

#### Missing Tables
- ❌ **`studio_domains`** - NOT created yet (needed for BYOD custom domains)

### RLS Policies
- ✅ All tables have RLS enabled
- ✅ Studio members can view/manage their studio's data
- ✅ Client users can ONLY view their own client's data
- ✅ Policies prevent cross-tenant data leaks

---

## ✅ Tenancy Resolution

### Current Implementation
**File:** `/libs/tenancy/context.ts`

#### Actor Type Detection
```typescript
determineActorType(host, path):
  - host includes "app.saltcore" OR path starts with "/dashboard" → studioMember
  - host includes "bridge.saltcore" OR path starts with "/bridge" → clientUser
  - Public pages → anonymous
```

#### Multi-Client Support
- ✅ Supports users with 2+ client memberships
- ✅ Auto-selects if only 1 membership
- ✅ Redirects to `/bridge/select` if 2+ memberships (client picker)
- ✅ Uses cookie `bridge_active_client_id` to remember selection

#### Current Limitations
- ❌ Does NOT look up custom domains from `bridge_portals.custom_domain`
- ❌ Does NOT support path-based portal routing (e.g., `/bridge/<portal-slug>`)
- ❌ Does NOT resolve `studio_domains` table (doesn't exist yet)

---

## ✅ Invite Flow

### Current Implementation
**File:** `/app/(user_dashboard)/dashboard/clients/[id]/actions.ts`

#### What Works
1. Studio owner invites client user → sends magic link
2. Client clicks link → lands on `/bridge/verify`
3. Token exchange happens client-side
4. `updateClientUserStatusToActive()` called in `/api/auth/callback`
5. `client_users.status` changes from `pending` to `active`
6. User redirected to Bridge

#### What's Missing
- ❌ **Resend invite** action (UI exists but may need better magic link generation)
- ❌ **Invite email branding** (currently uses Supabase default templates)
- ❌ **shouldCreateUser: false** NOT enforced for Bridge login (anyone can sign up with magic link)

---

## ✅ Email Infrastructure

### Studio Auth Emails (Supabase)
**Files:**
- `/brand/email-templates/README.md` - Strategy overview
- `/brand/email-templates/supabase-auth-templates.md` - Studio-facing templates (already styled)

**Current State:**
- ✅ Templates exist and are configured in Supabase dashboard
- ✅ Branded for Salt Core (studio owner experience)
- ✅ Covers: sign-in magic links, confirm signup, security notifications

### Bridge Client Emails
**Current State:**
- ❌ **NOT implemented yet**
- ❌ No Resend integration for white-labelable client emails
- ❌ No studio-owned branding system for invite emails

**Required (per plan):**
- Resend for transactional emails
- Studio name/logo/colors as sender identity
- `reply-to` set to studio's support email
- Optional Salt Core attribution (default OFF)

---

## ✅ Middleware & Routing

### Current Middleware
**File:** `/middleware.ts`

#### What It Does
- Session refresh for Supabase Auth
- Protected route checks
- Tenancy resolution for `/dashboard` and `/bridge` routes

#### What It Does NOT Do
- ❌ Host-based rewrites for Bridge domains
- ❌ Custom domain lookup/verification
- ❌ Path-based portal routing (e.g., `bridge.saltcore.io/<portal>`)

---

## 🔄 Gaps to Fill (From Plan)

### 1. GitHub OAuth
- **Status:** NOT implemented
- **Needs:** Provider config, UI button, Supabase dashboard config

### 2. Profile Name Fields
- **Status:** NOT in schema
- **Needs:** New migration to add `first_name`, `last_name`, `display_name`, `avatar_url`

### 3. Custom Domain System (BYOD)
- **Status:** Partial (`bridge_portals.custom_domain` exists but NO verification workflow)
- **Needs:** 
  - New `studio_domains` table (or use `bridge_portals` better)
  - Verification flow (DNS check)
  - Tenancy resolver update to look up domains

### 4. Bridge Domain Routing
- **Status:** NOT implemented
- **Needs:** 
  - Middleware rewrite for `bridge.*` hosts
  - Path-based routing decision (start with `bridge.saltcore.io/<portal>` or just `bridge.saltcore.io`)

### 5. Bridge Client Email System
- **Status:** NOT implemented
- **Needs:** 
  - Resend integration
  - White-label email templates (studio-owned feel)
  - Invite/access emails for clients

### 6. Invite-Only Enforcement
- **Status:** Partial (RLS works, but UX messaging weak)
- **Needs:** 
  - `shouldCreateUser: false` for Bridge OTP requests
  - Better "no access" error page
  - Clearer invite acceptance UX

### 7. Account Linking (OAuth)
- **Status:** NOT configured
- **Needs:** Supabase Auth identity linking enabled (same email → same user)

---

## Summary: What We're Extending vs. Adding

### ✅ Extending (already exists)
1. `/app/signin/page.tsx` - Add GitHub button + Bridge-aware UX
2. `/app/api/auth/callback/route.ts` - Improve redirect logic for custom domains
3. `/libs/tenancy/context.ts` - Add custom domain lookup + path-based routing
4. `/middleware.ts` - Add host-based rewrites for Bridge
5. `public.profiles` - Add name fields via migration
6. `public.bridge_portals` OR new `studio_domains` - Add verification logic

### 🆕 Adding (net new)
1. GitHub OAuth provider (Supabase config + UI)
2. Custom domain verification flow
3. Bridge email system (Resend + white-label templates)
4. Invite-only enforcement (shouldCreateUser + UX)
5. Account linking config (Supabase setting)
6. MFA hooks/checklist (later phase)

---

## Key Takeaway
**The foundation is solid.** We're NOT rebuilding auth—we're adding:
- GitHub OAuth
- Profile fields
- Custom domain verification
- White-label Bridge emails
- Better invite-only UX

Everything else is already working.

