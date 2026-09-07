# Security Model

**Context:** Salt implements defense-in-depth security with RLS as the final guarantee.

## Security Layers

```mermaid
graph TD
    Client["Client Request"]
    Client --> MW["Middleware Layer"]
    MW --> AC["Application Code"]
    AC --> PL["Permission Library"]
    PL --> DB["Database"]
    DB --> RLS["Row Level Security"]

    MW -.- MWD["Rate limiting, CORS"]
    AC -.- ACD["Auth checks, validation"]
    PL -.- PLD["Role verification"]
    RLS -.- RLSD["Final data filter"]
```

## Authentication Flow

### 1. Initial Authentication

```typescript
// Handled by Supabase Auth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
  },
});
```

### 2. Session Verification

```typescript
// Every protected route must verify
export default async function ProtectedRoute() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/signin");
  }

  // Continue with authenticated user
}
```

### 3. Tenant Authorization

```typescript
// After auth, check what user can access.
// ActorType = "workspaceMember" | "studioMember" (legacy alias) | "anonymous"
// — the Bridge-era client actor no longer exists.
const context = await getTenantContext(user.id);

switch (context.actorType) {
  case "workspaceMember":
    // Workspace member - full app access
    break;
  case "anonymous":
    // No tenant access
    redirect("/");
}
```

## Row Level Security (RLS)

### Core Principle

**Every table has RLS enabled.** No exceptions.

```sql
-- Enable RLS on creation
CREATE TABLE sensitive_data (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  data TEXT
);

ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- Without policies, table is inaccessible
-- Even with valid Supabase connection!
```

### Policy Patterns

#### 1. Workspace Isolation

```sql
-- Workspaces table: Only members can see
CREATE POLICY "workspace_members_read_workspace"
ON workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Workspaces table: Only owner can update
CREATE POLICY "workspace_owner_update"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid()); -- Prevent ownership transfer
```

#### 2. Hierarchical Access

> **Retired 2026-07-02:** the "client user path" (Bridge portal logins via `client_users`) no longer exists — the `clientUser` actor type was removed from tenancy resolution and app code has zero `client_users` references. Workspace membership is the only access path.

```sql
-- Projects: workspace members only
CREATE POLICY "project_access"
ON projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members sm
    WHERE sm.workspace_id = projects.workspace_id
    AND sm.user_id = auth.uid()
  )
);
```

#### 3. Role-Based Operations

```sql
-- People: Only admins can delete
CREATE POLICY "workspace_admin_delete_person"
ON people FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = people.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);
```

## Permission Checks

### Permission Library

```typescript
// app/_lib/tenancy/guards.ts

export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRole?: WorkspaceMemberRole[]
): Promise<boolean> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!data) return false;

  if (requiredRole && !requiredRole.includes(data.role)) {
    return false;
  }

  return true;
}

export async function hasPersonAccess(
  userId: string,
  personId: string
): Promise<boolean> {
  // Record access is always via workspace membership (the only access path
  // since the Bridge client-portal retirement, 2026-07).
  const { data: person } = await supabase
    .from("people")
    .select("workspace_id")
    .eq("id", personId)
    .single();

  if (person) {
    return hasWorkspaceAccess(userId, person.workspace_id);
  }

  return false;
}
```

### Usage in API Routes

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the record's workspace
  const { data: person } = await supabase
    .from("people")
    .select("workspace_id")
    .eq("id", personId)
    .single();

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check permissions
  const canDelete = await hasWorkspaceAccess(
    user.id,
    person.workspace_id,
    ["owner", "admin"]
  );

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Proceed with deletion
  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", personId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

## Input Validation

### Zod Schemas

```typescript
import { z } from "zod";

// Define schemas for all inputs
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  personId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  // Note: workspaceId comes from context, not input!
});

// Use in API route
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate input
  const validated = CreateProjectSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, personId, organizationId } = validated.data;

  // Get workspaceId from context, not user input!
  const context = await getTenantContext(user.id);

  if (context.type !== "workspace") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create with validated data + secure context
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      description,
      person_id: personId ?? null,
      organization_id: organizationId ?? null,
      workspace_id: context.workspaceId, // From context, not input
    });
}
```

## Security Headers

### Middleware Configuration

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline';"
  );

  return response;
}
```

## API Security

### Rate Limiting

```typescript
// app/_lib/rate-limit.ts
const limiter = new Map();

export async function rateLimit(
  identifier: string,
  limit = 10,
  window = 60000 // 1 minute
) {
  const now = Date.now();
  const userLimits = limiter.get(identifier) || [];

  // Clean old entries
  const recentRequests = userLimits.filter(
    (timestamp: number) => now - timestamp < window
  );

  if (recentRequests.length >= limit) {
    throw new Error("Rate limit exceeded");
  }

  recentRequests.push(now);
  limiter.set(identifier, recentRequests);
}

// Use in API route
export async function POST(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();

  try {
    await rateLimit(user.id, 5, 60000); // 5 requests per minute
  } catch (error) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // Continue with request
}
```

### CORS Configuration

```typescript
// For API routes that need CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL!,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
```

## Data Sanitization

### Output Encoding

```typescript
// Always sanitize user-generated content
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// Usage example:
// When rendering user content, always sanitize first
// For React, consider using libraries that handle sanitization automatically
```

### SQL Injection Prevention

Supabase client automatically parameterizes queries:

```typescript
// Safe - parameterized
const { data } = await supabase
  .from("projects")
  .select("*")
  .eq("name", userInput); // Automatically escaped

// Never use raw SQL with user input!
```

## Security Monitoring

### Audit Logging

```typescript
// Log security-relevant events
export async function logSecurityEvent(
  userId: string,
  action: string,
  resource: string,
  result: "success" | "denied",
  metadata?: Record<string, any>
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    resource,
    result,
    metadata,
    ip_address: headers().get("x-forwarded-for"),
    user_agent: headers().get("user-agent"),
    timestamp: new Date().toISOString(),
  });
}

// Use in sensitive operations
await logSecurityEvent(
  user.id,
  "DELETE_PERSON",
  personId,
  "success",
  { workspaceId: context.workspaceId }
);
```

## June 2026 security remediation

Shipped in migration `supabase/migrations/20260610120000_security_remediation_batch.sql` and app hardening (PR #208 → staging, release #209 → `main`).

### Database

| Change | Purpose |
|--------|---------|
| `waitlist_leads_sheet` recreated with `security_invoker = true` | View runs as caller; `service_role` SELECT only |
| RPC grants revoked from `anon` / `authenticated` on credit + agent audit functions | `add_purchased_credits`, `deduct_ai_credits`, `reset_monthly_ai_credits`, `log_agent_operation` — **service_role** only |
| `handle_new_user()` not callable via PostgREST | Trigger-only auth hook |
| `is_workspace_member` / `is_studio_member` — no `anon` execute | Membership helpers for RLS, not public RPCs |
| Tighter RLS on intake, Gmail sync logs, marketing pipeline tables (when present) | Reduce anonymous write surfaces |
| Storage bucket listing restrictions | Public buckets no longer enumerable by anonymous clients |

Apply on **staging and production** before relying on new webhook checks in deployed app code.

### Webhook verification

| Route | Verification | Module |
|-------|--------------|--------|
| `app/api/webhooks/recall-calendar/route.ts` | Svix (`svix-id`, `svix-timestamp`, `svix-signature`) | `app/_lib/security/webhook-verify.ts` |
| `app/api/webhooks/gmail/route.ts` | Google Pub/Sub push OIDC JWT | Same module |

**Required env (staging + production):** `RECALL_CALENDAR_WEBHOOK_SECRET`, `GMAIL_PUBSUB_PUSH_AUDIENCE` (full push URL). Optional: `GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL`. **Never** set `GMAIL_PUBSUB_SKIP_VERIFICATION` outside local dev.

### Stripe checkout allowlist

Clients must not supply arbitrary Stripe Price IDs. Checkout resolves **server-known plan keys** only:

- `app/_lib/stripe/checkout-allowlist.ts` — legacy `starter` / `advanced` keys → configured price IDs
- `app/_lib/stripe/saas-price-ids.ts` — SaaS billing price registry
- `app/api/stripe/create-checkout/route.ts` and billing redirect actions use allowlisted IDs

### Composio agent boundary

- `app/_lib/composio/actions.ts` — **the single execution gate** (`executeComposioAction`): DB classification lookup (`tool_classifications`) with heuristic fallback — approved rows take precedence, unclassified tools are classified by slug pattern (new Composio tools work immediately), and `disabled`/`rejected` rows are a **hard deny** (drift detection's off-switch; no heuristic fallback), workspace-disabled tools, trust ladder for mutating tools, unattended = read-only, per-action human approval, argument validation (hand-written Zod for the pinned set, synced JSON schema for the long tail), audit log. Ask Salt, plays, backfills, and background jobs all execute through it — no separate chat path (`single-gate.test.ts` enforces this)
- `app/_lib/composio/tool-policy.ts` — per-tool risk class (`read` vs `mutating`); mutating tools require human confirmation
- `app/_lib/composio/require-composio-user.ts` — ties Composio entity ID to authenticated workspace context
- `app/_lib/composio/ask-salt-tools.ts` — the Composio session provides tool schemas only; execution delegates to the gate

### Provider token custody (connector-platform Phases 1 + 4, 2026-07)

**Salt holds ZERO provider OAuth tokens.** The native Gmail pipeline (encrypted token custody), native Google Calendar OAuth, and native Cal.com OAuth are retired; **Composio is the sole token custodian** for every user-facing connector. API-key connectors (e.g. the user's own Stripe account) pass the key straight to Composio at connect — it is never written to Salt's DB or logs. Google sign-in requests identity-only scopes; connector access is granted per-toolkit through Composio auth configs, with least-privilege scopes reviewed at provisioning. See `docs/architecture/connector-platform.md` for the full ingestion/retention canon.

### LLM untrusted content

- `app/_lib/ai/safety.ts` — shared system prompt section + wrappers for emails, files, transcripts
- Used by file summarizer, intake extraction, AI insights, transcription summary paths

### Edge functions

- *(Retired 2026-07)* `supabase/functions/purge-deleted-clients` was removed with the `clients` table drop (`20260703170000`); no Supabase Edge Functions remain in the repo.

---

## Security Checklist

### Development
- [ ] All tables have RLS enabled
- [ ] RLS policies cover all CRUD operations
- [ ] Input validation on all endpoints
- [ ] No sensitive data in client-side code
- [ ] Environment variables properly scoped
- [ ] Error messages don't leak information

### Deployment
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Audit logging active
- [ ] Regular security updates applied

### Code Review
- [ ] No hardcoded secrets
- [ ] All user inputs validated
- [ ] SQL injection prevention verified
- [ ] XSS prevention in place
- [ ] CSRF protection enabled
- [ ] Authentication checks on all routes
- [ ] Authorization verified for operations
- [ ] Sensitive operations logged