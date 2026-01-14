# Bridge Quick Start

**Context:** Get the Bridge client portal running in 5 minutes.

## What is The Bridge?

The Bridge is a white-label client portal that provides:
- Project progress visibility
- File management
- Request submission
- Retainer tracking
- Professional client experience

## 5-Minute Setup

### 1. Configure Supabase (Required)

Add redirect URLs in Supabase Dashboard:
```
http://localhost:3000/bridge/verify
http://localhost:3000/api/auth/callback
```

See [bridge-setup.md](./bridge-setup.md) for detailed instructions.

### 2. Verify Database

Required tables (created by migrations):
- `client_users` - Portal users
- `project_files` - File management
- `project_retainers` - Hour tracking
- `retainer_time_entries` - Time logs

### 3. Test Your Setup

Visit: `http://localhost:3000/bridge/test`

This shows:
- ✅ Authentication status
- ✅ Client memberships
- ✅ Quick navigation links

## User Workflows

### Studio Owner Flow

1. **Create Client**
   - Navigate to `/dashboard/clients`
   - Click "New Client"
   - Enter client details

2. **Invite Users**
   - Open client detail page
   - Click "Invite Client User"
   - Enter email address
   - User receives magic link

3. **Setup Projects**
   - Add projects to client
   - Configure retainers
   - Upload deliverables

### Client User Flow

1. **Receive Invitation**
   - Check email for magic link
   - Click to authenticate

2. **Access Portal**
   - Auto-redirect to `/bridge`
   - View assigned projects
   - Submit requests
   - Download files

## Key URLs

### Development
- Bridge Login: `http://localhost:3000/bridge/login`
- Bridge Portal: `http://localhost:3000/bridge`
- Test Page: `http://localhost:3000/bridge/test`
- Studio Dashboard: `http://localhost:3000/dashboard`

### Production
- Configure your custom domain
- Update redirect URLs in Supabase

## Quick Troubleshooting

### Magic Link Issues

```sql
-- Check if user exists
SELECT * FROM client_users WHERE email = 'user@example.com';

-- Verify user is active
UPDATE client_users
SET status = 'active'
WHERE email = 'user@example.com';
```

### Access Issues

```bash
# Run diagnostic script
node scripts/check-bridge-auth.js
```

### No Projects Visible

Ensure:
1. Projects exist for the client
2. Client membership is active
3. Projects have correct `client_id`

## Core Features

### ✅ Included in MVP

- **File Management** - Upload/download with categories
- **Retainer Tracking** - Manual hour logging
- **Request System** - Client request submission
- **Project Overview** - View all projects
- **Multi-Client Support** - Switch between clients
- **White-Label UI** - Branded experience

### 🚧 Planned Features

- AI request triage
- Analytics integrations
- Email notifications
- Custom branding per studio
- Conversation threads
- Team access
- Invoice payments

## Testing

### Manual Testing

1. Visit `/bridge/test` for diagnostics
2. Invite yourself as test client
3. Check email for magic link
4. Verify portal access

### Automated Tests

```bash
pnpm test:e2e -- bridge-client-portal.spec.ts
```

## Security Features

- **Row Level Security**: Enforced data isolation
- **Magic Links**: Passwordless authentication
- **Signed URLs**: Secure file access
- **Session Management**: Cookie-based sessions

## Next Steps

1. ✅ Complete Supabase configuration
2. 🧪 Test with `/bridge/test`
3. 👥 Invite pilot client
4. 📊 Monitor usage
5. 🚀 Deploy to production

## Related Documentation

- [Bridge Setup](./bridge-setup.md) - Detailed configuration
- [Multi-Tenancy](../architecture/multi-tenancy.md) - Architecture details
- [Security Model](../architecture/security-model.md) - Security implementation