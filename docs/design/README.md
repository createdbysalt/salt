# Email Design System

Canonical copy blocks and design patterns for Salt emails. For voice guidelines, see `brand-identity/foundation/voice-principles.md`. For brand positioning, see `brand-identity/positioning/value-proposition.md`.

## Brand Context

**Salt** is the strategic intelligence system product. Emails should feel confident, clear, and systems-focused — speaking to developers and designers building studios.

(This is distinct from **Salt Studio**, which is Gabriella's client-facing creative studio with a warm, mission-driven voice.)

## Structure

- **Auth emails** (magic links, invites, password reset): configured in **Supabase Auth → Email Templates** (see `supabase-auth-templates.md`)
- **Transactional emails** (welcome, notifications, billing): sent via **Resend** from the app (see `app/_lib/email/resend.ts`)
- **Bridge notification emails** (access revoked, etc.): sent via **Resend** with studio branding (see `app/_lib/email/bridge-emails.ts`)

## Files in This Folder

- **`README.md`** (this file) - Overview of email strategy
- **`supabase-auth-templates.md`** - Templates for Supabase dashboard (studio owner auth)
- **`bridge-redirect-setup.md`** - How to configure Bridge redirects and customize Supabase templates for client users

## Sender Patterns

- **Magic links**: `Salt <noreply@usesalt.io>`
- **Transactional/support**: `Salt <hello@usesalt.io>`
- **The Bridge** (client portal emails): Uses the studio owner's branding (white-labeled).

---

## Bridge Client Emails (Important Update)

### Current Implementation

**For invites and magic links:** We use **Supabase's native email templates** (not custom Resend emails).

**Why?** 
- Supabase generates the actual magic link with secure tokens
- We can't replicate these links
- Sending two emails (Supabase + ours) confused users
- Studio owners should customize Supabase templates instead

**What we DO send via Resend:**
- ✅ **Access Revoked** - Notification only (no link needed)
- 🔜 Future: Welcome emails, project updates, notifications (after user is onboarded)

### How Studio Owners Brand Client Emails

Studio owners should customize the **Supabase email templates** in the Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Edit **"Invite user"** template (for new client invites)
3. Edit **"Magic Link"** template (for returning client sign-ins)
4. Add studio logo, colors, and custom copy
5. Always keep `{{ .ConfirmationURL }}` variable (the real magic link!)

**See `bridge-redirect-setup.md` for detailed customization guide with examples.**

### Bridge Notification Emails (via Resend)

These are sent from `app/_lib/email/bridge-emails.ts` with studio branding:

#### Access Revoked
- **Subject:** "Access removed: the bridge for [ClientName]"
- **When:** Studio owner removes a client user
- **No link** — informational only
- **Branding:** Studio logo, colors, support email

#### Branding Rules for Resend Emails
1. **From name:** `<StudioName>`
2. **From address:** `notifications@usesalt.io`
3. **Reply-to:** Studio's support email
4. **Visual branding:** Studio logo + colors
5. **Salt attribution:** Optional footer (default OFF)

### Voice Guidelines
All Bridge emails follow the voice bible:
- Use **"the bridge"** (lowercase, never possessive)
- Speak as the studio, not as Salt
- Professional but approachable tone
- Avoid marketing language

---

