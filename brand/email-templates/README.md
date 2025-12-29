# Email Templates

Canonical copy blocks for Salt Core emails. Follow `bible/salt_core_voice_bible.md` for voice and `bible/salt_core_identity.md` for brand positioning.

## Brand Context

**Salt Core** is the studio operating system product. Emails should feel confident, clear, and systems-focused — speaking to developers and designers building studios.

(This is distinct from **SALT Studio**, which is Gabriella's client-facing creative studio with a warm, mission-driven voice.)

## Structure

- **Auth emails** (magic links, password reset): configured in **Supabase Auth → Email Templates**.
- **Transactional emails** (welcome, notifications, billing): sent via **Resend** from the app (see `libs/resend.ts`).
- **The Bridge emails** (client-facing, white-labelable): sent from the user's studio brand, not Salt Core.

## Sender Patterns

- **Magic links**: `Salt Core <noreply@saltcore.io>`
- **Transactional/support**: `Salt Core <hello@saltcore.io>`
- **The Bridge** (client portal emails): Uses the studio owner's branding (white-labeled).


