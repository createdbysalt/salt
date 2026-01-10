# 🚀 Ready to Start Building? Pre-Flight Checklist

Before starting Phase 1, 2, or 3, make sure everything from Phase 0 is working correctly.

---

## ✅ Environment Setup

- [ ] Node.js 18+ installed
- [ ] Supabase project created
- [ ] **Supabase Auth URL Configuration (CRITICAL for invites)**:
  - Go to Supabase Dashboard → Authentication → URL Configuration
  - Set **Site URL** to: `https://app.saltcore.io` (or your primary domain)
  - Add **Redirect URLs** (allowlist):
    - `https://bridge.saltcore.io/api/auth/callback`
    - `https://app.saltcore.io/api/auth/callback`
    - `http://localhost:3000/api/auth/callback`
  - Without these, client invites will redirect to wrong domain!
- [ ] Stripe account set up
- [ ] `.env.local` file configured with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_BRIDGE_URL` (prod: `https://bridge.saltcore.io`, dev: `http://localhost:3000/bridge`)
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`

---

## ✅ Database Setup

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Project linked (`supabase link`)
- [ ] Migration applied (`supabase db push` or `supabase db reset`)
- [ ] Tables created (studios, studio_members, clients, client_users, projects, bridge_portals, portal_domains)
- [ ] RLS enabled on all tables
- [ ] Test user signed up successfully
- [ ] Studio auto-created for test user

### Quick Verification
Run this SQL in Supabase dashboard:
```sql
-- Should return 7 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'studios', 'studio_members', 'clients', 'client_users', 
  'projects', 'bridge_portals', 'portal_domains'
);

-- Should all have rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'studios', 'studio_members', 'clients', 'client_users', 
  'projects', 'bridge_portals', 'portal_domains'
);
```

---

## ✅ Code Setup

- [ ] `npm install` completed
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no ESLint errors)
- [ ] Dev server starts (`npm run dev`)
- [ ] Can access `http://localhost:3000`
- [ ] Can sign in/sign up

---

## ✅ Tenant Resolution Test

- [ ] Create test page at `app/(user_dashboard)/test/page.tsx`:
```typescript
import { getTenantContext } from "@/libs/tenancy";

export default async function TestPage() {
  const { context } = await getTenantContext();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Tenant Context Test</h1>
      <pre className="bg-base-200 p-4 rounded">
        {JSON.stringify(context, null, 2)}
      </pre>
    </div>
  );
}
```
- [ ] Visit `/test` while signed in
- [ ] Verify `actorType` is `"studioMember"`
- [ ] Verify `studio` object has `id` and `role`

---

## ✅ RLS Test (Multi-Tenant Isolation)

- [ ] Sign up two different users
- [ ] Verify each got their own studio
- [ ] Try to query the other user's studio (should fail):
```sql
-- As User A, try to access User B's studio
SELECT * FROM studios WHERE id = 'user-b-studio-id';
-- Should return 0 rows (blocked by RLS)
```

---

## ✅ GitHub/Linear Setup

- [ ] GitHub repo created
- [ ] Issue templates visible in "New Issue" dropdown
- [ ] PR template loads when creating PR
- [ ] Linear project created (if using Linear)
- [ ] Linear labels configured:
  - `type:bug`, `type:feature`, `type:improvement`, `type:security`
  - `layer:Infrastructure`, `layer:Operations`, etc.
  - `area:marketing`, `area:studio`, `area:bridge`
- [ ] Read `.github/LINEAR_GITHUB_WORKFLOW.md`

---

## ✅ Documentation Review

- [ ] Read `README.md` (updated architecture overview)
- [ ] Read `PHASE_0_COMPLETE.md` (detailed technical docs)
- [ ] Read `PHASE_0_SUMMARY.md` (what's next)
- [ ] Read `DATABASE_MIGRATION_GUIDE.md` (migration help)
- [ ] Read `brand/bible/salt_core_identity.md` (product positioning)

---

## ✅ Safety Checklist Understanding

Before starting any new feature, you should know:
- [ ] How to use `getTenantContext()` in server components
- [ ] How to use `requireStudioMember()` guards
- [ ] How to use `withTenantScope()` for database queries
- [ ] How to check permissions with `can()` or `hasMinRole()`
- [ ] How to create a branch: `SC-{issue}-{description}`
- [ ] How to write commits: `feat:`, `fix:`, `refactor:`, etc.
- [ ] How to fill out the PR template checklist

---

## ✅ Ready to Choose Next Phase

Which phase will you start with?

### Option 1: Phase 1 (Core Marketing Site)
**Best for:** Public launch, lead generation, validation
- [ ] Landing page wireframe ready
- [ ] Copy written (use brand voice guidelines)
- [ ] Pricing tiers defined

### Option 2: Phase 2 (User Dashboard)
**Best for:** Core product, dogfooding, immediate value
- [ ] Client onboarding flow defined
- [ ] Project creation flow defined
- [ ] Billing logic planned

### Option 3: Phase 3 (Client Bridge MVP)
**Best for:** Differentiation, client-facing features
- [ ] Client user experience flow defined
- [ ] Request workflow defined
- [ ] Deliverable structure planned

**Recommendation:** Start with **Phase 2** (User Dashboard) so you can use Salt Core to run SALT Studio immediately.

---

## 🚨 Before You Start Building

### Create a Linear Project (or GitHub Project)
1. Create project: "Phase X - [Name]"
2. Break down into issues (5-10 small tasks)
3. Move first issue to "Todo"

### Create Your First Branch
```bash
git checkout -b SC-1-studio-client-crud
# or whatever your first feature is
```

### Start Small
- Keep first PR under 200 lines
- Test tenant isolation immediately
- Ship something end-to-end

---

## 🆘 Troubleshooting

### "RLS policy error" when querying
**Fix:** Make sure you're using `getTenantContext()` and `withTenantScope()`.

### "Actor type is anonymous" when signed in
**Fix:** Check middleware is running. Visit `/test` to debug context resolution.

### "Studio not found" after signup
**Fix:** Check `handle_new_user()` trigger is working. Query `studios` table directly.

### TypeScript errors in `libs/tenancy` or `libs/permissions`
**Fix:** Run `npm run build` to see exact error. Check imports are correct.

---

## ✅ Final Check

- [ ] All above checkboxes are checked
- [ ] Test user can sign in
- [ ] Tenant context resolves correctly
- [ ] RLS blocks cross-tenant queries
- [ ] TypeScript builds
- [ ] Ready to ship first feature

---

# You're ready. Let's build. 🚀

**Next Step:** Choose Phase 1, 2, or 3 and create your first Linear issue.

**Remember:**
- Small PRs (< 400 lines)
- Use the safety rails (`libs/tenancy`, `libs/permissions`)
- Test with multiple users/studios
- Ship daily

---

**Questions?** Open a GitHub issue or check the docs.

