# Settings Architecture Research: Multi-User SaaS Tools

**Date:** 2026-04-02
**Purpose:** Analyze settings patterns in leading B2B SaaS tools to inform Salt Core's settings architecture

---

## Executive Summary

This research examines how five leading B2B SaaS products structure their settings: **Linear**, **Notion**, **Slack**, **Figma**, and **Asana**. All products use a **3-level hierarchy** with clear permission inheritance patterns and role-based access controls.

**Key finding:** The dominant pattern is **Organization/Workspace > Team/App > Personal**, with settings inheritance flowing downward and permission restrictions flowing upward.

---

## Product-by-Product Analysis

### 1. Linear

**Settings Hierarchy:**
| Level | Name | Purpose |
|-------|------|---------|
| 1 | Workspace | Organization-wide container for all issues, teams, and interactions |
| 2 | Team | Functional groups (Engineering, Design, Marketing) with custom workflows |
| 3 | Personal | Individual user preferences and account settings |

**What Settings Live at Each Level:**

**Workspace Settings (Admin only):**
- Workspace name and URL
- Login preferences / SSO
- Third-party app review requirements (Enterprise)
- Project Updates configuration
- Initiatives feature toggle
- Member management (add/remove/suspend)
- Import/export issues
- Plan/billing information
- Audit log access
- Security settings

**Workspace Settings (All Members):**
- Workspace-level labels
- Custom project statuses
- Workspace-level templates (issues, projects, documents)
- SLA rules (paid)
- Asks templates (paid)
- Custom emojis
- Integration configurations (GitHub, GitLab, Slack, Figma, Sentry)

**Team Settings (Team Owners):**
- Team name, identifier, timezone
- Estimates configuration
- Issue creation by email
- Issue history detail level
- Team members management
- Team-level labels and label groups
- Team-level templates
- Recurring issues
- Slack notifications
- Issue statuses and workflow automations
- Git automations and branch naming
- Auto-close and auto-archive
- Triage configuration
- Cycles configuration

**Team Settings (Configurable per team):**
- Issue Label Management (team owners only OR all members)
- Template Management (team owners only OR all members)
- Team Settings Management (team owners only OR all members)
- Member Management (team owners only OR all members)

**Personal Settings:**
- Account preferences
- Notification settings
- Display preferences

**Permission Model:**
| Role | Workspace | Team | Notes |
|------|-----------|------|-------|
| Workspace Owner | Full admin | Auto team owner | Enterprise only, most sensitive settings |
| Admin | Admin section visible | Auto team owner | Routine workspace operations |
| Team Owner | N/A | Full team control | Delegated per-team control |
| Member | Limited to features | Standard access | Cannot access Administration pages |
| Guest | No workspace access | Team-specific only | Business/Enterprise only |

**UI Pattern:**
- Settings accessed via workspace name dropdown > "Settings"
- Administration section hidden from Members/Guests
- Team settings via hover on team name > "..." menu > "Team settings"
- Settings organized by tabs: General, Members, Issue labels, Templates, etc.

**Sources:**
- [Linear Workspaces Docs](https://linear.app/docs/workspaces)
- [Linear Members and Roles Docs](https://linear.app/docs/members-roles)
- [Linear Teams Docs](https://linear.app/docs/teams)

---

### 2. Notion

**Settings Hierarchy:**
| Level | Name | Purpose |
|-------|------|---------|
| 1 | Workspace | Company/organization container |
| 2 | Teamspace | Department/team-specific areas ("workspace within workspace") |
| 3 | Personal | Private pages and user preferences |

**What Settings Live at Each Level:**

**Workspace Settings (Workspace Owners only):**
- Security settings (baseline for all teamspaces)
- Guest limits and allowed email domains
- Public sharing policies (can override teamspace)
- Export permissions
- SSO/SAML configuration
- Member management
- Billing and plan management
- Domain verification
- Audit logs (Enterprise)

**Workspace Settings (All Members):**
- Personal account settings
- Notification preferences
- Appearance settings

**Teamspace Settings (Teamspace Owners):**
- Teamspace name, description, icon
- Access type: Open, Closed, Private
- Member management (add/remove, set roles)
- Default teamspace toggle
- Permission levels for:
  - Teamspace owners
  - Teamspace members
  - Everyone else in workspace
- Who can invite members
- Who can edit teamspace sidebar
- Invite link toggle

**Teamspace Security (Enterprise - Teamspace Owners who are also Workspace Owners):**
- Disable publishing sites/forms/public links
- Disable guests
- Disable export
- *Note: Can only be MORE restrictive than workspace settings, not less*

**Page-Level Settings:**
- Share with specific people/groups
- Permission levels: Full access, Can edit, Can edit content, Can comment, Can view
- General access (only invited, workspace, anyone with link)
- Link expiration
- Page-level access rules based on person properties (Business/Enterprise)

**Permission Model:**
| Role | Workspace | Teamspace | Notes |
|------|-----------|-----------|-------|
| Workspace Owner | Full control | Can override teamspace security | Maximum privileges |
| Member | Standard access | Varies by teamspace | Access determined by teamspace settings |
| Teamspace Owner | N/A | Full teamspace control | Full access to all content |
| Teamspace Member | N/A | As configured | No access to teamspace settings |
| Guest | No workspace access | Page-specific only | Must be invited to specific pages |

**Key Insight - Inheritance:**
- Teamspace security settings **automatically inherit** from workspace settings
- Only Workspace Owners who are also Teamspace Owners can make settings MORE permissive
- Teamspace Owners can only make settings MORE restrictive, not less
- Permissions respect the **broadest level of access** given to a user

**UI Pattern:**
- Settings via sidebar "Settings" link
- Teamspace settings via hover > "..." menu > "Teamspace settings"
- Settings modal with tabs: General, Members, Permissions, Security
- Share menu on every page for page-level permissions

**Sources:**
- [Notion Intro to Teamspaces](https://www.notion.com/help/intro-to-teamspaces)
- [Notion Sharing and Permissions](https://www.notion.com/help/sharing-and-permissions)

---

### 3. Slack

**Settings Hierarchy:**
| Level | Name | Purpose |
|-------|------|---------|
| 1 | Organization | Enterprise-wide policies (Enterprise Grid only) |
| 2 | Workspace | Company/team communication hub |
| 3 | Channel | Topic/project-specific conversations |
| 4 | Personal | User preferences and notifications |

**What Settings Live at Each Level:**

**Organization Settings (Enterprise - Org Owners/Admins):**
- Display name guidelines
- Default do not disturb mode
- Custom message/file retention
- Channel posting permissions (org-wide)
- User group management
- Public file sharing policy
- Multi-workspace channel creation
- Mandatory 2FA
- SSO configuration
- Email/display name change policies
- Domain claiming
- Workspace creation policies
- Channel management tools
- App management policies

**Workspace Settings (Workspace Owners/Admins):**
- Workspace name and URL
- Login and discovery settings
- Member management
- Default channels for new members
- Language settings
- App approval toggle
- App settings and permissions
- Name display guidelines
- Password resets
- User group management
- Analytics access
- Channel management permissions
- Billing (Primary Owner/Admin only)

**Channel Settings (Channel Managers/Owners/Admins):**
- Channel name and purpose
- Posting permissions
- Who can notify channel
- Archive/unarchive
- Convert public to private
- Retention policies
- Channel email address

**Personal Settings:**
- Profile information
- Notification preferences
- Do not disturb schedule
- Display preferences
- Keyboard shortcuts

**Permission Model:**
| Role | Organization | Workspace | Channel |
|------|--------------|-----------|---------|
| Org Primary Owner | Full control | Inherits to all | Inherits |
| Org Owner/Admin | Near-full control | Overrides workspace | Overrides |
| Workspace Primary Owner | N/A | Full control | Full control |
| Workspace Owner | N/A | Near-full control | Full control |
| Workspace Admin | N/A | Admin tasks | Admin tasks |
| Channel Manager | N/A | N/A | Assigned channels only |
| Member | N/A | Standard | Standard |
| Guest | N/A | Limited | Invited channels only |

**System Roles (Enterprise):**
Slack offers granular system roles for specific administrative functions:
- Analytics Admin
- Audit Logs Admin
- Channels Admin
- Content Admin
- Customization Manager
- DLP Admin
- Export Admin
- Legal Holds Admin
- Message Activity Manager
- Roles Admin
- Security Admin
- Template Admin
- Users Admin
- Workflow Admin

**Key Insight - Override Hierarchy:**
- Organization policies **override** workspace settings
- Hierarchy: Organization > Workspace > Channel
- Role-specific UI: Slack hides advanced settings from regular users

**UI Pattern:**
- Settings via workspace name dropdown
- Separate "Administration" section for admins
- Channel settings via channel header
- Tiered settings visibility based on role

**Sources:**
- [Slack Permissions by Role](https://slack.com/help/articles/201314026-Permissions-by-role-in-Slack)
- [Slack Types of Roles](https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack)

---

### 4. Figma

**Settings Hierarchy:**
| Level | Name | Purpose |
|-------|------|---------|
| 1 | Organization | Company-wide (Org/Enterprise plans) |
| 2 | Workspace | Division/department (Enterprise only) |
| 3 | Team | Functional group with shared resources |
| 4 | Project | Collection of related files |
| 5 | File | Individual design document |

**What Settings Live at Each Level:**

**Organization Settings (Org Admins):**
- Billing management
- Member/guest management
- SSO/SAML configuration
- Domain management
- Public link sharing policies
- File discovery via search
- Viewer restrictions (copy/share/export)
- Organization-wide libraries
- Custom fonts management
- Organization plugins

**Team Settings (Team Admins/Owners):**
- Team name, icon, description
- Member management
- Access settings:
  - Who can access (Only invited, Workspace, Organization)
  - Permission level (View, Edit)
  - Visibility (Visible, Hidden)
- Default libraries
- Community profile
- Subscription management (Professional plan)
- Team fonts (Org/Enterprise)

**Project Settings (Project Admins):**
- Project name
- Team access level override
- Member permissions

**File Settings (File Owner/Editors):**
- Share settings
- Viewer restrictions
- Password protection
- Permission levels per collaborator

**Permission Model:**
| Role | Organization | Team | Project/File |
|------|--------------|------|--------------|
| Org Admin | Full control | Varies by membership | Varies |
| Team Owner | N/A | Full control | Inherits |
| Team Admin | N/A | Admin rights | Inherits |
| Can Edit | N/A | Create projects, move files | Edit |
| Can View | N/A | View only | View only |

**Key Insight - Permission Inheritance:**
- Project permissions **inherit from team permissions** by default
- Can override with explicit permissions at lower levels
- Explicit permissions can grant MORE access than inherited
- Seats (billing) are separate from permissions

**UI Pattern:**
- Organization settings via admin console
- Team settings via team dropdown > "View settings"
- File sharing via "Share" button
- Layered inheritance model

**Sources:**
- [Figma Team Permissions](https://help.figma.com/hc/en-us/articles/360039970673-Team-permissions)
- [Figma Organization Plan Overview](https://help.figma.com/hc/en-us/articles/13839486673559-Organization-plan-overview)

---

### 5. Asana

**Settings Hierarchy:**
| Level | Name | Purpose |
|-------|------|---------|
| 1 | Organization | Company domain-based container |
| 2 | Workspace | Alternative to organization (non-domain) |
| 3 | Team | Functional group |
| 4 | Project | Work container with tasks |
| 5 | Task | Individual work item |

**What Settings Live at Each Level:**

**Organization/Workspace Settings (Super Admin/Admin):**
- Member management
- Security settings
- SSO/SAML configuration
- Guest invitation policies
- Default sharing permissions
- Public link restrictions
- Data export controls
- Billing and plan management
- Audit logs (Enterprise)

**Team Settings (Team Admin):**
- Team name and description
- Member management
- Privacy settings (public/private)
- Guest access

**Project Settings (Project Admin):**
- Project name and description
- Access levels: Admin, Editor, Commenter, Viewer
- Default view settings
- Custom fields
- Rules and automations
- Forms

**Task Settings:**
- Assignee
- Followers
- Custom field values

**Permission Model:**
| Role | Organization | Team | Project |
|------|--------------|------|---------|
| Super Admin | Full control | Full control | Full control |
| Admin | Admin tasks | Admin tasks | Admin access |
| Member | Standard | Standard | As assigned |
| Guest | N/A | Invited only | Invited only |

**Project Access Levels:**
| Level | Capabilities |
|-------|--------------|
| Admin | Full control, settings, delete |
| Editor | Add content, manage tasks |
| Commenter | Comment only |
| Viewer | Read only |

**Key Insight:**
- Organization structure is **domain-based** (company email)
- Workspace is an alternative for non-domain teams
- Hierarchy: Organization/Workspace > Team > Project > Task > Subtask
- Editors cannot change project structure or settings

**UI Pattern:**
- Settings via profile dropdown
- Admin console for organization settings
- Project settings in project header
- Permission icons show access level

**Sources:**
- [Asana Permissions Overview](https://asana.com/guide/help/permissions/overview-permissions)
- [Asana Admin Permissions](https://asana.com/features/admin-security/permissions)
- [Asana Permissions Guide](https://ido-clarity.com/blog/asana-permissions-guide/)

---

## Comparison Table

| Aspect | Linear | Notion | Slack | Figma | Asana |
|--------|--------|--------|-------|-------|-------|
| **Top Level** | Workspace | Workspace | Organization/Workspace | Organization | Organization/Workspace |
| **Middle Level** | Team | Teamspace | Workspace/Channel | Team/Workspace | Team |
| **Bottom Level** | Personal | Page | Channel/Personal | Project/File | Project/Task |
| **Inheritance** | Top-down | Top-down (restrictive only) | Top-down (overrides) | Top-down (can override up) | Top-down |
| **Role Model** | Owner > Admin > Team Owner > Member > Guest | Workspace Owner > Member > Teamspace Owner > Teamspace Member > Guest | Org Owner > Workspace Owner > Admin > Member > Guest | Org Admin > Team Owner > Team Admin > Editor > Viewer | Super Admin > Admin > Member > Guest |
| **Settings Access** | Dropdown menu | Sidebar + Modal | Dropdown menu | Admin console + Dropdowns | Profile dropdown + Admin console |
| **Enterprise Additions** | Workspace Owner role, SCIM | Custom teamspace security | Org-level policies, System roles | Workspaces layer | Domain controls |

---

## Common Patterns Across Products

### 1. Three-Tier Hierarchy (Universal)
All products use a consistent 3-level pattern:
- **Organization/Workspace** - Company-wide settings
- **Team/App/Teamspace** - Department/function settings
- **Personal/Project** - Individual or item-specific settings

### 2. Role-Based Access Control (RBAC)
Common role progression:
```
Owner/Super Admin > Admin > Team Lead/Owner > Member > Guest
```

### 3. Settings Inheritance Patterns

| Pattern | Products | Behavior |
|---------|----------|----------|
| **Strict top-down** | Slack, Asana | Higher level overrides lower |
| **Restrictive inheritance** | Notion | Lower can only be MORE restrictive |
| **Flexible override** | Figma, Linear | Lower can override with explicit permissions |

### 4. Admin-Only Settings (Common)
- Billing and plan management
- SSO/authentication configuration
- Security policies
- Member management (add/remove)
- Data export/import
- Audit logs

### 5. Delegated Settings (Team Level)
- Team name/description
- Member roles within team
- Workflow customization
- Notification preferences
- Integrations (often)

### 6. Universal Personal Settings
- Profile information
- Notification preferences
- Display/theme preferences
- Account security (2FA)

### 7. UI Patterns
- **Progressive disclosure**: Hide admin settings from non-admins
- **Contextual access**: Settings available where relevant (team settings from team page)
- **Modal-based**: Settings often in modals rather than full pages
- **Tab organization**: Settings grouped by category in tabs

---

## Recommendation for Salt Core (Studio Management Tool)

### Proposed Settings Architecture

Given Salt Core's structure with apps (HQ, Clients, Work, Billing) and client-facing portal (Bridge), I recommend a **4-level hierarchy**:

```
Studio (Organization)
    |
    +-- Apps (HQ, Clients, Work, Billing)
    |       |
    |       +-- App-specific settings
    |
    +-- Bridge (Client Portal)
    |       |
    |       +-- Portal settings
    |       +-- Client-specific overrides
    |
    +-- Personal Settings
```

### Level 1: Studio Settings (Admin Only)

**Equivalent to:** Linear Workspace, Notion Workspace, Slack Organization

**Settings:**
- Studio name, branding, logo
- Billing and subscription
- Team members management
- SSO/authentication method
- Security policies (session timeout, 2FA requirements)
- Data retention policies
- API keys and webhooks
- Audit log access
- Global integrations (Stripe Connect, etc.)

**Who can access:** Studio Owner, Studio Admin

### Level 2: App Settings (App-Specific)

**Equivalent to:** Linear Team, Notion Teamspace, Figma Team

**Settings per App:**

| App | Settings |
|-----|----------|
| **HQ** | Dashboard widgets, overview preferences, announcement settings |
| **Clients** | Client fields customization, default views, client statuses, intake form |
| **Work** | Project statuses, task workflows, time tracking defaults, milestone templates |
| **Billing** | Invoice templates, payment terms, currency, tax settings, Stripe configuration |

**Who can access:** Studio Admin, or specific App Admins if role delegation is implemented

### Level 3: Bridge Portal Settings

**Equivalent to:** Notion Teamspace with security inheritance

**Settings:**
- Portal branding (can inherit from Studio or customize)
- Enabled features per client:
  - Messages/Chat
  - Files
  - Invoices
  - Project visibility
- Default permissions for new clients
- Guest access policies
- Notification templates

**Inheritance rule:** Portal security settings cannot be LESS restrictive than Studio settings

**Who can access:** Studio Admin, Portal Admin

### Level 4: Personal Settings

**Equivalent to:** Universal across all products

**Settings:**
- Profile (name, avatar, email)
- Notification preferences (email, in-app, per-event)
- Display preferences (theme, density, default views)
- Account security (password, 2FA)
- Keyboard shortcuts

**Who can access:** Individual user only

### Permission Model Recommendation

| Role | Studio | Apps | Bridge | Personal |
|------|--------|------|--------|----------|
| **Owner** | Full control | Full control | Full control | Own only |
| **Admin** | Most settings | Full control | Full control | Own only |
| **Member** | View only | Use features | Use features | Own only |
| **Client (Bridge)** | None | None | Assigned only | Own only |

### UI/UX Recommendations

1. **Centralized Settings Hub**
   - Single "Settings" entry point in sidebar
   - Tab-based organization: Studio | Apps | Bridge | Personal
   - Show/hide sections based on role

2. **Contextual Access Points**
   - App-specific settings accessible from app header
   - Bridge settings accessible from Bridge admin view
   - Personal settings in user menu

3. **Permission Indicators**
   - Lock icons for admin-only settings
   - Tooltips explaining why settings are restricted
   - Clear inheritance indicators ("Inherited from Studio")

4. **Settings Search**
   - Global search within settings
   - Common request: users often can't find settings

### Implementation Priority

**Phase 1 (MVP):**
- Studio settings (name, billing, members)
- Personal settings (profile, notifications)
- Basic role distinction (Owner/Admin vs Member)

**Phase 2:**
- App-specific settings
- Bridge portal settings
- Client-specific overrides

**Phase 3:**
- Granular role permissions
- Settings inheritance rules
- Audit log for settings changes

---

## Sources

### Linear
- [Workspaces Documentation](https://linear.app/docs/workspaces)
- [Members and Roles Documentation](https://linear.app/docs/members-roles)
- [Teams Documentation](https://linear.app/docs/teams)

### Notion
- [Intro to Teamspaces](https://www.notion.com/help/intro-to-teamspaces)
- [Sharing and Permissions](https://www.notion.com/help/sharing-and-permissions)
- [How Workspace Owners Set Up Teamspaces](https://www.notion.com/help/guides/how-workspace-owners-can-set-up-teamspaces-for-their-organization)

### Slack
- [Permissions by Role](https://slack.com/help/articles/201314026-Permissions-by-role-in-Slack)
- [Types of Roles](https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack)
- [Channel Management Permissions](https://slack.com/help/articles/360052445454-Manage-permissions-for-channel-management-tools)

### Figma
- [Team Permissions](https://help.figma.com/hc/en-us/articles/360039970673-Team-permissions)
- [Organization Plan Overview](https://help.figma.com/hc/en-us/articles/13839486673559-Organization-plan-overview)
- [Guide to Sharing and Permissions](https://help.figma.com/hc/en-us/articles/1500007609322-Guide-to-sharing-and-permissions)

### Asana
- [Permissions Overview](https://asana.com/guide/help/permissions/overview-permissions)
- [Admin Permissions](https://asana.com/features/admin-security/permissions)
- [Asana Permissions Guide](https://ido-clarity.com/blog/asana-permissions-guide/)

### General SaaS Architecture
- [Designing Layout Structure for SaaS Products](https://medium.com/design-bootcamp/designing-a-layout-structure-for-saas-products-best-practices-d370211fb0d1)
