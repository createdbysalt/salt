---
allowed-tools: Bash, Read
description: "Restart dev server on :3000 with staging Supabase + 1Password; verify it serves."
---

# /devup-staging - Staging Dev Server Up, Verified

Same discipline as `/devup`, but uses **staging Supabase** via `.env.staging.1password` (salt-staging project — **not** production SALT).

**Cursor:** type `/devup-staging` or trigger `qrestart:staging`  
**Terminal:** `pnpm dev:staging:restart:op`

## Steps

1. **Kill port 3000**:
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1
   ```
2. **Start in background**:
   ```bash
   pnpm dev:staging:restart:op
   ```
3. **Poll until alive** — every 3s, up to 90s:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   ```
4. **On success**: report "staging dev server up on :3000".
5. **On failure**: read output; common causes: `op signin` needed, stale `.next`, missing vault keys → `/envkeys`.
6. **Optional smoke**: `curl -s localhost:3000/hq | head -5`.

## Rules

- Port **3000** only.
- Use `pnpm dev:staging:restart:op` — **not** `pnpm dev:op`.
- One restart per root cause.

## vs /devup

| Command | Secrets file | Supabase |
|---------|--------------|----------|
| `/devup` | `.env.1password` | Production |
| `/devup-staging` | `.env.staging.1password` | Staging |
