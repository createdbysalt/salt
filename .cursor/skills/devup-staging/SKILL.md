---
name: devup-staging
description: Restart dev server on :3000 with staging Supabase + 1Password and verify it serves. Use for qrestart:staging or /devup-staging.
---

# devup-staging

Restart Next.js on **port 3000** with **staging Supabase** and **1Password** (`.env.staging.1password`). Verify the server responds before reporting success.

## Invoke when

- User says `qrestart:staging`, `/devup-staging`, or wants staging app dev with 1Password
- Product work on `staging` branch against salt-staging Supabase

## Do not use when

- Marketing/waitlist on `main` → use `/devup` or `pnpm dev:op` (production Supabase)
- User only needs env keys → `/envkeys`

## Steps

1. Kill port 3000: `lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1`
2. Start background: `pnpm dev:staging:restart:op`
3. Poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` every 3s (max 90s)
4. On success: confirm staging dev up on :3000
5. On failure: read terminal output; fix root cause (op signin, `.next` cache, vault keys)

## Canonical references

- Command: `.cursor/commands/devup-staging.md` (Cursor `/devup-staging`)
- Claude mirror: `.claude/commands/devup-staging.md`
- Script: `scripts/dev-staging-restart.sh`
- Env: `.env.staging.1password`
