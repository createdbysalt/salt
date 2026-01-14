# Existing Routes Inventory

**Total Routes Found:** 77

## Route Groups

### 1. (user_dashboard) - Studio Dashboard (31 routes)
```
/dashboard                              # Main dashboard
/dashboard/clients                      # Client management
/dashboard/clients/[id]                 # Client detail
/dashboard/clients/[id]/bridge          # Bridge access
/dashboard/clients/new                  # New client form
/dashboard/insights                     # Analytics/insights
/dashboard/intelligence/library         # Intelligence resources
/dashboard/intelligence/strategic-reports
/dashboard/intelligence/stream
/dashboard/intelligence/technical-audits
/dashboard/meetings                     # Meeting management
/dashboard/meetings/[meetingId]
/dashboard/messages                     # Messaging center
/dashboard/messages/[conversationId]
/dashboard/projects                     # Project management
/dashboard/projects/[id]
/dashboard/projects/[id]/activity
/dashboard/projects/[id]/files
/dashboard/projects/[id]/intelligence
/dashboard/projects/[id]/seo
/dashboard/projects/[id]/settings
/dashboard/projects/new
/dashboard/seo                          # SEO tools
/dashboard/settings                     # Settings
/dashboard/settings/billing             # Billing settings
/dashboard/support                      # Support
```

### 2. Bridge - Client Portal (18 routes)
```
/bridge                                 # Bridge home
/bridge/billing                         # Client billing
/bridge/files                           # File access
/bridge/intelligence                    # Client intelligence
/bridge/invoices/[token]                # Invoice viewing
/bridge/invoices/[token]/expired
/bridge/invoices/[token]/success
/bridge/login                           # Client login
/bridge/messages                        # Client messages
/bridge/messages/[conversationId]       # Conversation detail
/bridge/progress                        # Project progress
/bridge/projects                        # Client projects
/bridge/projects/[id]
/bridge/projects/[id]/seo
/bridge/requests                        # Client requests
/bridge/retainer/success                # Payment success
/bridge/select                          # Client selector
/bridge/settings                        # Client settings
/bridge/test                            # Test page
/bridge/verify                          # Magic link verify
```

### 3. API Routes (12 routes)
```
External/Webhook (KEEP):
/api/auth/callback                      # Supabase auth callback
/api/calendar/google/callback           # Google OAuth callback
/api/webhook/stripe                     # Stripe webhook
/api/webhook/stripe-connect             # Stripe Connect webhook

Internal (CONVERT TO SERVER ACTIONS):
/api/auth/dev-login                     # Development login
/api/calendar/google/start              # Calendar auth start
/api/lead                               # Lead capture
/api/stripe/create-checkout             # Checkout session
/api/stripe/create-portal               # Customer portal
/api/user/settings                      # User settings

Cron Jobs (EVALUATE):
/api/cron/seo-audits                    # SEO audit cron job
```

### 4. Public/Marketing Routes (9 routes)
```
/                                       # Landing page
/blog                                   # Blog listing
/blog/[articleId]                       # Article detail
/blog/author/[authorId]                 # Author posts
/blog/category/[categoryId]             # Category posts
/pricing                                # Pricing page
/signin                                 # Sign in page
/privacy-policy                         # Privacy policy
/tos                                    # Terms of service
```

### 5. Development/Utility Routes (4 routes)
```
/dev-login                              # Development login
/design-system                          # Component showcase
/playground                             # Development playground
/playground/swirl                       # Swirl animation test
```

### 6. Legacy Routes (8 routes) - TO BE REMOVED
```
/legacy/dashboard
/legacy/dashboard/clients
/legacy/dashboard/clients/[id]
/legacy/dashboard/clients/new
/legacy/dashboard/projects
/legacy/dashboard/projects/new
/legacy/dashboard/settings/billing
/legacy/dashboard/style-guide
```

## Migration Impact Analysis

### High Priority Routes (Critical Path)
1. **Authentication Flow**
   - /signin
   - /bridge/login
   - /api/auth/callback
   - /bridge/verify

2. **Core Dashboard**
   - /dashboard
   - /dashboard/projects
   - /dashboard/clients
   - /dashboard/messages

3. **Client Portal**
   - /bridge
   - /bridge/projects
   - /bridge/messages
   - /bridge/select

4. **Billing/Payments**
   - /api/webhook/stripe
   - /api/stripe/create-checkout
   - /bridge/billing
   - /dashboard/settings/billing

### Routes Requiring Special Attention
1. **Dynamic Routes** - All [id] and [token] routes need careful testing
2. **API Routes** - Need conversion to Server Actions (except webhooks)
3. **Legacy Routes** - Can be deleted after migration
4. **Magic Link Flow** - /bridge/verify is critical for client auth

### Proposed Route Reorganization

```
app/
├── (public)/
│   ├── page.tsx (landing)
│   ├── signin/
│   ├── pricing/
│   ├── blog/
│   ├── privacy-policy/
│   └── tos/
├── (user_dashboard)/  [KEEP AS IS]
│   └── dashboard/
├── (client_bridge)/   [KEEP AS IS]
│   └── bridge/
├── (dev)/
│   ├── design-system/
│   ├── playground/
│   └── dev-login/
└── api/
    └── webhook/       [KEEP ONLY WEBHOOKS]
```