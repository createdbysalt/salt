# 🌉 The Bridge - Quick Start Guide

## 🚀 What is The Bridge?

The Bridge is your **luxury client portal** that makes solo developers look like agencies. It gives clients a professional, branded experience to:
- View project progress and updates
- Submit requests and feedback
- Access files and deliverables
- Track retainer hours
- Pay invoices (coming soon)

---

## ✅ Setup Checklist (5 minutes)

### 1. Configure Supabase Redirect URLs ⚠️ REQUIRED

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/url-configuration

Add these URLs:
```
http://localhost:3000/bridge/verify
http://localhost:3000/api/auth/callback
```

### 2. Run Database Migrations ✅ DONE

The following tables were created:
- `project_files` - File management
- `project_retainers` - Retainer configuration  
- `retainer_time_entries` - Time tracking

### 3. Test Your Setup

Visit: `http://localhost:3000/bridge/test`

This diagnostic page will show you:
- ✅ If you're authenticated
- ✅ Your client memberships
- ✅ Quick navigation links

---

## 👥 User Flows

### For Studio Owners:

1. **Create a client:**
   - Go to `/dashboard/clients`
   - Click "New Client"
   - Fill in details

2. **Invite client users:**
   - Open client detail page
   - Click "Invite Client User"
   - Enter their email
   - They'll receive a magic link

3. **Manage projects:**
   - Add projects to clients
   - Set up retainers (optional)
   - Upload deliverables

### For Clients:

1. **Receive invite email:**
   - Check inbox for magic link
   - Click the link

2. **Access the Bridge:**
   - Redirected to `/bridge`
   - View all your projects
   - Submit requests
   - Download files

---

## 🔗 Important URLs

### Development:
- **Bridge Login:** `http://localhost:3000/bridge/login`
- **Bridge Portal:** `http://localhost:3000/bridge`
- **Bridge Test:** `http://localhost:3000/bridge/test`
- **Studio Dashboard:** `http://localhost:3000/dashboard`

### Production:
- **Bridge:** `https://bridge.saltcore.io`
- **Studio Dashboard:** `https://app.saltcore.io/dashboard`

---

## 🐛 Troubleshooting

### Issue: Magic link redirects to signin

**Fix:** Add redirect URLs to Supabase (see Setup step 1)

```bash
# Run diagnostic:
node scripts/check-bridge-auth.js
```

### Issue: "Access denied" after clicking link

**Causes:**
1. Client user status is not `active`
2. No client_users row exists for this email
3. Session expired

**Fix:**
```sql
-- Check status
SELECT id, email, status FROM client_users WHERE email = 'user@example.com';

-- Set to active if needed
UPDATE client_users SET status = 'active' WHERE email = 'user@example.com';
```

### Issue: Can't see any projects

**Causes:**
1. No projects assigned to this client
2. Client membership not active

**Fix:**
- Studio owner needs to create projects for this client
- Check `projects` table has `client_id` matching user's client

---

## 🎨 UI Components

### Bridge Shell (Auto-included on all Bridge pages):
- **BridgeHeader** - Top navigation with client switcher
- **BridgeNav** - Sidebar navigation (Overview, Requests, Files, Settings)

### Custom Components:
- **RetainerSummary** - Shows hours used/remaining
- **FileUpload** - Drag-and-drop file upload
- **FileList** - Display and manage files
- **RequestsPageClient** - Submit and track requests

---

## 📊 Database Tables

### Multi-Tenancy:
- `studios` - Agency/studio accounts
- `clients` - Client companies
- `client_users` - Client portal users
- `projects` - Projects per client

### Bridge Features:
- `project_files` - File storage metadata
- `project_retainers` - Retainer hour allocations
- `retainer_time_entries` - Time logging
- `tasks` - Requests and todos (source: `client_request` or `internal`)

---

## 🔒 Security

### Row Level Security (RLS):
- ✅ Studio members see all their studio's data
- ✅ Client users see only their client's data
- ✅ Files are private with signed URLs
- ✅ Magic links expire after 1 hour

### Authentication:
- Magic links (passwordless)
- Supabase Auth with email verification
- Session management via cookies

---

## 📦 What's Included in MVP:

✅ **File Management** - Upload/download with categories
✅ **Retainer Tracking** - Manual hour logging
✅ **Request System** - Client can submit requests
✅ **Project Overview** - View all projects
✅ **Multi-Client Support** - One user, multiple clients
✅ **White-Label Shell** - Header and navigation

## 🚧 Phase 2 (Not Yet Implemented):

- ⏳ AI request triage
- ⏳ Real analytics integrations
- ⏳ Email notifications
- ⏳ Custom branding per studio
- ⏳ Request conversation threads
- ⏳ Team access (multiple logins per client)
- ⏳ Invoice payments

---

## 🧪 Testing

### Manual Testing:
1. Visit `/bridge/test` for diagnostics
2. Invite yourself as a client user
3. Check email for magic link
4. Click link and verify redirect to Bridge

### E2E Tests (Playwright):
```bash
npm run test:e2e -- bridge-client-portal.spec.ts
```

---

## 📞 Support

- **Setup Issues:** Run `node scripts/check-bridge-auth.js`
- **Auth Issues:** Check browser console for 🔑, ✅, ❌ emojis
- **Database Issues:** Check Supabase logs
- **Email Issues:** Verify Resend API key

---

## 🎉 You're Ready!

The Bridge is now fully operational. Your next steps:

1. ✅ Add Supabase redirect URLs (if not done)
2. 🧪 Test with `/bridge/test`
3. 👥 Invite a pilot client
4. 📊 Monitor usage and feedback
5. 🚀 Ship to production!

**Happy Building!** 🌉

