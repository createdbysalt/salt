# Bridge Setup Guide

**Context:** Configuration and setup instructions for the SALT Bridge client portal.

## Overview

The Bridge is a white-label client portal that provides:
- Project progress tracking
- File management
- Request submission
- Retainer hour tracking
- Professional client experience

## Supabase Configuration

### Critical: Configure Redirect URLs

The Bridge uses magic links for authentication. You **MUST** add redirect URLs to your Supabase project.

#### Steps:

1. **Navigate to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration
   ```

2. **Add Development URLs**
   ```
   http://localhost:3000/bridge/verify
   http://localhost:3000/api/auth/callback
   ```

3. **Add Production URLs**
   ```
   https://yourdomain.com/bridge/verify
   https://yourdomain.com/api/auth/callback
   ```

4. **Save Changes**

### Email Configuration

1. **Go to Authentication Settings**
   ```
   Dashboard → Authentication → Email Templates
   ```

2. **Customize Magic Link Email**
   - Update subject line
   - Customize email body
   - Add your branding

## Database Setup

The Bridge requires these tables (created by migrations):
- `client_users` - Portal user accounts
- `project_files` - File storage metadata
- `project_retainers` - Retainer configurations
- `retainer_time_entries` - Time tracking

## Environment Variables

Add to `.env.local`:

```bash
# Required for Bridge
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxx

# Optional branding
NEXT_PUBLIC_BRIDGE_NAME="Client Portal"
NEXT_PUBLIC_BRIDGE_LOGO="/logo.png"
```

## Testing Setup

### Diagnostic Page

Visit `/bridge/test` to verify:
- Authentication status
- Client memberships
- Configuration issues

### Test Flow

1. Create a test client in dashboard
2. Invite yourself with a different email
3. Check for magic link email
4. Click link and verify redirect
5. Confirm access to Bridge portal

## Security Configuration

### Row Level Security

All Bridge tables have RLS policies ensuring:
- Studio members see all studio data
- Client users see only their client's data
- No cross-tenant data access

### Magic Link Settings

- Default expiry: 1 hour
- One-time use only
- Secure redirect validation

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Magic link redirects to signin | Missing redirect URLs | Add URLs in Supabase |
| "Access denied" after link | User not active | Check `client_users.status` |
| Can't see projects | No projects assigned | Create projects for client |
| Email not received | Email config issue | Verify Resend API key |

### Debug Commands

```sql
-- Check client user status
SELECT id, email, status, client_id
FROM client_users
WHERE email = 'user@example.com';

-- Verify project assignment
SELECT p.name, c.name as client_name
FROM projects p
JOIN clients c ON p.client_id = c.id
WHERE c.id = 'CLIENT_ID';

-- Check active sessions
SELECT * FROM auth.sessions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

## Multi-Client Support

### Setup

Users can belong to multiple clients:

1. Same email can be invited to different clients
2. User selects active client after login
3. `/bridge/select` handles client switching

### Implementation

```typescript
// Get user's clients
const { data: clientUsers } = await supabase
  .from('client_users')
  .select('*, client:clients(*)')
  .eq('user_id', user.id)
  .eq('status', 'active');

// Set active client
await setActiveClient(clientId);
```

## Production Checklist

- [ ] Configure production redirect URLs
- [ ] Set up custom domain
- [ ] Configure email templates
- [ ] Test magic link flow
- [ ] Verify RLS policies
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Test client switching

## Related Documentation

- [Multi-Tenancy Architecture](../architecture/multi-tenancy.md)
- [Security Model](../architecture/security-model.md)
- [Database Migrations](./database-migrations.md)