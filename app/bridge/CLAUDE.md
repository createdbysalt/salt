# Client Portal Guide

**Context:** You are working within the external client portal.
**Architecture:** Token-based auth, limited access, clean UI without internal navigation.

## Purpose

The client bridge provides external clients with:
- Access to shared documents
- Ability to leave comments/feedback
- View invoices and billing
- Approval workflows

## Route Structure

```
bridge/
├── layout.tsx              # Clean portal layout
├── error.tsx               # Portal-specific errors
├── verify/                 # Magic link verification
├── [token]/                # Token-based access (future)
│   ├── page.tsx            # Portal home
│   ├── documents/          # Shared files
│   ├── comments/           # Feedback/messages
│   ├── invoices/           # Billing access
│   └── approvals/          # Approval workflows
└── files/                  # Document management
    └── actions.ts          # File operations
```

## Authentication

Client access uses **token-based authentication**, not session:

```typescript
// Token validation
import { verifyClientToken } from '@/app/_features/portal/magic-links'

export default async function PortalPage({ params }: { params: { token: string } }) {
  const client = await verifyClientToken(params.token)
  if (!client) redirect('/bridge/verify')
  // ...
}
```

## Magic Link Flow

1. Client receives magic link via email
2. Link contains short-lived token
3. Token validates and creates portal session
4. Client accesses scoped resources

```typescript
// _features/portal/magic-links.ts
export async function generateMagicLink(clientId: string, email: string) {
  const token = await createSignedToken({ clientId, email })
  const url = `${process.env.NEXT_PUBLIC_URL}/bridge/verify?token=${token}`
  await sendMagicLinkEmail(email, url)
}

export async function verifyMagicLink(token: string) {
  const payload = await verifySignedToken(token)
  if (!payload) return null
  return payload
}
```

## UI Patterns

Client portal has a **clean, minimal layout**:
- No internal navigation (no workspace selector)
- Limited menu options
- Focus on client-relevant features
- Professional, simple design

```typescript
// bridge/layout.tsx
export default function BridgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Logo />
        </div>
      </header>
      <main className="container py-8">
        {children}
      </main>
    </div>
  )
}
```

## Data Access

Clients only see data they're authorized for:

```typescript
// Always scope queries to the client's permissions
export async function getClientDocuments(clientId: string) {
  const supabase = await createServerClient()
  return supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .eq('shared_with_client', true)
}
```

## Security Rules

1. **Tokens expire** - Magic links have limited validity
2. **Scope to client** - Never expose data from other clients
3. **No session cookies** - Token-based only
4. **Audit access** - Log portal access for security
5. **Rate limit** - Protect against token guessing

## Do's and Don'ts

### Do:
- Validate token on every request
- Scope all queries to the client
- Use clean, professional UI
- Log access for audit trails

### Don't:
- Mix session auth with token auth
- Show internal navigation
- Expose workspace-level data
- Trust client-provided IDs without validation
