# Supabase Auth Email Templates

All authentication email templates for Salt Core. Configure in Supabase Dashboard → Authentication → Email Templates.

---

## Final Design Specs (Approved)

**Design Style**: Resend-inspired, clean modern aesthetic
- **Background**: Pure black (#000000)
- **Container padding**: 60px vertical, 24px horizontal
- **Heading**: 48px, font-weight 500 (medium), white (#ffffff)
- **Body text**: 16px, gray (#a3a3a3)
- **Links**: SALT Blue (#2A77E8) with underline
- **Button**: White pill-shaped (border-radius: 100px), black text
- **Logo**: 64x64px placeholder with dark border
- **Footer**: Gray links (#525252) separated by dots

**Available Template Variables:**
- `{{ .ConfirmationURL }}` - Complete confirmation URL with token
- `{{ .Token }}` - 6-digit OTP code
- `{{ .TokenHash }}` - Token hash for custom URLs
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Application site URL
- `{{ .RedirectTo }}` - Redirect destination
- `{{ .Provider }}` - Identity provider (for linked/unlinked notifications)
- `{{ .OldEmail }}` - Previous email (for email change notifications)
- `{{ .Phone }}` / `{{ .OldPhone }}` - Phone numbers (for phone change notifications)
- `{{ .FactorType }}` - MFA factor type

**Design Notes:**
- Logo placeholder can be replaced with actual logo URL later
- SALT Blue (#2A77E8) is used for all links - maintains brand consistency
- Button should always be white pill-shaped for consistency
- Footer links stay gray (not blue) for hierarchy

---

## 1. Magic Link

**Subject:** `Sign in to Salt Core`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Use this link to securely sign in to your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Sign in to Salt Core</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      Click the button below to sign in to your account. This link expires shortly and can only be used once.
    </p>
    <div style="margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 16px;">Continue</a>
    </div>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Or copy and paste this URL into your browser: <a href="{{ .ConfirmationURL }}" style="color: #2A77E8; text-decoration: underline;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      If this wasn't you, please contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a>
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 2. Confirm Sign Up

**Subject:** `Confirm your Salt Core account`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">One quick step to activate your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Welcome to Salt Core</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      Confirm your email to activate your account and start building.
    </p>
    <div style="margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 16px;">Confirm email</a>
    </div>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Or copy and paste this URL into your browser: <a href="{{ .ConfirmationURL }}" style="color: #2A77E8; text-decoration: underline;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      If you didn't create an account, you can safely ignore this.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 3. Invite User

**Subject:** `You've been invited to Salt Core`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Join a workspace and start collaborating</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">You've been invited</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      Someone invited you to join their workspace. Accept to get started.
    </p>
    <div style="margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 16px;">Accept invitation</a>
    </div>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Or copy and paste this URL into your browser: <a href="{{ .ConfirmationURL }}" style="color: #2A77E8; text-decoration: underline;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Don't want to join? You can safely ignore this.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 4. Change Email Address

**Subject:** `Confirm your new email address`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Confirm your new email address to complete the change</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Confirm email change</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      You requested to update your account email. Confirm your new address to complete the change.
    </p>
    <div style="margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 16px;">Confirm new email</a>
    </div>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Or copy and paste this URL into your browser: <a href="{{ .ConfirmationURL }}" style="color: #2A77E8; text-decoration: underline;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      If you didn't request this, contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 5. Reset Password

**Subject:** `Reset your Salt Core password`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Create a new password for your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Reset your password</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      You requested a password reset. Use the button below to create a new one.
    </p>
    <div style="margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 16px;">Reset password</a>
    </div>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      Or copy and paste this URL into your browser: <a href="{{ .ConfirmationURL }}" style="color: #2A77E8; text-decoration: underline;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      If you didn't request this, you can safely ignore it. Your password won't change.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 6. Reauthentication

**Subject:** `Confirm it's you`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Enter your verification code to continue</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Confirm your identity</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      You're about to perform a sensitive action. Enter this code to continue:
    </p>
    <div style="margin: 32px 0;">
      <div style="display: inline-block; padding: 20px 32px; background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px;">
        <span style="color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 0.1em; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; cursor: text;">{{ .Token }}</span>
      </div>
    </div>
    <p style="color: #737373; font-size: 13px; line-height: 20px; margin: 16px 0 0 0;">Click the code above to select it, then copy and paste into Salt Core.</p>
    <p style="color: #737373; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
      If you didn't initiate this, contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

# Security Notification Emails

These emails notify users about important security events on their account. Enable these in **Supabase Dashboard → Authentication → Email Templates → Security Notifications**.

## Available Variables for Security Notifications:
- `{{ .Email }}` - Current email address
- `{{ .OldEmail }}` - Previous email (for email change)
- `{{ .Phone }}` - Current phone number
- `{{ .OldPhone }}` - Previous phone (for phone change)
- `{{ .Provider }}` - OAuth provider name (e.g., "Google", "GitHub")
- `{{ .FactorType }}` - MFA factor type (e.g., "TOTP", "SMS")

---

## 7. Password Changed

**Subject:** `Your Salt Core password was changed`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Your account password has been updated</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Password changed</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      The password for your Salt Core account was recently changed.
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0;">
      If this was you, no action is needed.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 8. Email Address Changed

**Subject:** `Your Salt Core email was changed`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Your account email address has been updated</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Email changed</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Your Salt Core account email was changed from:
    </p>
    <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #737373; font-size: 14px; margin: 0 0 8px 0;">Previous email</p>
      <p style="color: #ffffff; font-size: 16px; margin: 0; word-break: break-all;">{{ .OldEmail }}</p>
    </div>
    <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #737373; font-size: 14px; margin: 0 0 8px 0;">New email</p>
      <p style="color: #ffffff; font-size: 16px; margin: 0; word-break: break-all;">{{ .Email }}</p>
    </div>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 24px 0 0 0;">
      If this was you, no action is needed.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 9. Phone Number Changed

**Subject:** `Your Salt Core phone number was changed`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">Your account phone number has been updated</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Phone number changed</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Your Salt Core account phone number was changed from:
    </p>
    <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #737373; font-size: 14px; margin: 0 0 8px 0;">Previous phone</p>
      <p style="color: #ffffff; font-size: 16px; margin: 0;">{{ .OldPhone }}</p>
    </div>
    <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #737373; font-size: 14px; margin: 0 0 8px 0;">New phone</p>
      <p style="color: #ffffff; font-size: 16px; margin: 0;">{{ .Phone }}</p>
    </div>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 24px 0 0 0;">
      If this was you, no action is needed.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 10. Identity Linked

**Subject:** `{{ .Provider }} was linked to your Salt Core account`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">A new sign-in method has been added to your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Sign-in method added</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      <span style="color: #ffffff; font-weight: 600;">{{ .Provider }}</span> was linked to your Salt Core account.
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0;">
      You can now sign in using this provider.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 11. Identity Unlinked

**Subject:** `{{ .Provider }} was removed from your Salt Core account`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">A sign-in method has been removed from your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Sign-in method removed</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      <span style="color: #ffffff; font-weight: 600;">{{ .Provider }}</span> was unlinked from your Salt Core account.
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0;">
      You can no longer sign in using this provider.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 12. MFA Method Added

**Subject:** `Two-factor authentication enabled on your Salt Core account`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">A new security method has been added to your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Security upgrade</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Two-factor authentication (<span style="color: #ffffff; font-weight: 600;">{{ .FactorType }}</span>) was added to your Salt Core account.
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0;">
      Your account is now more secure.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```

---

## 13. MFA Method Removed

**Subject:** `Two-factor authentication disabled on your Salt Core account`

```html
<div style="background-color: #000000; padding: 60px 12px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preview Text (hidden in email body, shows in inbox) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">A security method has been removed from your account</div>
  <div style="display: none; max-height: 0px; overflow: hidden;">‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</div>
  <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px; text-align: center;">
    <div style="margin-bottom: 48px;">
      <div style="width: 64px; height: 64px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #333333; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
        <!-- Add logo image src here -->
      </div>
    </div>
    <h1 style="color: #ffffff; font-size: 48px; font-weight: 500; margin: 0 0 24px 0; letter-spacing: -0.02em; line-height: 1.2;">Security downgrade</h1>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
      Two-factor authentication (<span style="color: #ffffff; font-weight: 600;">{{ .FactorType }}</span>) was removed from your Salt Core account.
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 0;">
      Your account security has been reduced. Consider re-enabling two-factor authentication.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 24px; margin: 32px 0 0 0; font-weight: 600;">
      Wasn't you?
    </p>
    <p style="color: #a3a3a3; font-size: 16px; line-height: 24px; margin: 8px 0 0 0;">
      Contact <a href="mailto:hello@saltcore.io" style="color: #2A77E8; text-decoration: underline;">hello@saltcore.io</a> immediately to secure your account.
    </p>
    <div style="margin-top: 64px; padding-top: 32px; border-top: 1px solid #262626;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="https://saltcore.io/privacy-policy" style="color: #525252; text-decoration: none;">Privacy</a> · 
        <a href="https://saltcore.io/tos" style="color: #525252; text-decoration: none;">Terms</a>
      </p>
    </div>
  </div>
</div>
```


