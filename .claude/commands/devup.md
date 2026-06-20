---
allowed-tools: Bash, Read
description: "Restart the dev server AND verify it actually serves. Replaces the qrestart → 'its not loading' → debug loop."
---

# /devup - Dev Server Up, Verified

`qrestart` kills and restarts blind. This command doesn't stop until localhost:3000 answers or the failure cause is identified. It exists because "qrestart" + "its not loading" was a repeated June 2026 loop (8+ prompts).

## Steps

1. **Kill port 3000** (hard requirement — DB + E2E configs are pinned to it):
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1
   ```
2. **Start in background** (1Password secrets — the default; fall back to `pnpm dev` only if `op` is unavailable):
   ```bash
   pnpm dev:op
   ```
   Run as a background task and capture output.
3. **Poll until alive** — every 3s, up to 90s:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   ```
   Success = any HTTP response (200/3xx/404 all mean the server is up).
4. **On success**: report "dev server up on :3000" + how long it took. Done.
5. **On timeout or crash**: do NOT just restart again. Read the captured dev-server output, find the actual error (compile error, missing env var, port conflict, 1Password auth prompt), report root cause and fix it. Common causes seen this month:
   - `op` not signed in → tell the user to run `! op signin` in this session
   - Stale `.next` cache after dependency changes → `rm -rf .next` and restart once
   - Env var missing → route to `/envkeys`
6. **Optional smoke check** (if the user was debugging a specific page): curl that route and confirm it returns HTML, e.g. `curl -s localhost:3000/connections | head -5`.

## Rules

- Never start the server on any port other than 3000.
- One restart attempt per identified cause — no blind restart loops.
- If the server is already up and healthy, say so and don't restart unless asked.
