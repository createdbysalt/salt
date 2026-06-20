---
allowed-tools: Read, Grep, Glob, Bash
description: "Guided env var / API key setup across 1Password, .env.1password, and Vercel staging+production. Encodes every trap hit in June 2026."
---

# /envkeys - Environment Key Setup, End to End

Setting up Stripe/Composio/analytics keys across local + staging + production consumed 10+ back-and-forth prompts this month ("what permissions for the restricted key?", "what should the production URL be?", "how do I set up the webhook secret?"). This command produces ONE complete checklist per service, then verifies.

## Arguments

Invoked with: `$ARGUMENTS` — a service name (`stripe`, `composio`, `resend`, `posthog`, …) or a specific var name.

## Required context (read first)

- `docs/reference/environment-variables.md` — canonical var names and where each is consumed
- `.env.1password` — the local 1Password reference mapping (NEVER print secret values; references like `op://vault/item/field` are fine)
- `rg "process.env.<VAR>"` — confirm where the code actually reads it

## The four destinations (every key needs an explicit decision for each)

| Destination | How | Notes |
|-------------|-----|-------|
| Local dev | 1Password item + reference in `.env.1password` | `pnpm dev:op` injects it |
| Vercel **staging** | `vercel env add <VAR> preview` (or dashboard) | Separate keys from production — never share |
| Vercel **production** | `vercel env add <VAR> production` | |
| Docs | row in `docs/reference/environment-variables.md` | keep canon current |

## Known traps (hit in June 2026 — do not re-learn these)

1. **Vercel "Sensitive" type always reads back EMPTY** from `vercel env pull` / the API. Never diagnose a "missing" var from pull output — check the dashboard or runtime behavior.
2. **`NEXT_PUBLIC_*` vars must NOT be Sensitive type** (they're inlined at build time) — use plain/encrypted.
3. **Redeploy required**: env changes don't apply to existing deployments. After setting, trigger a redeploy and say so explicitly.
4. **Staging vs production Stripe**: staging uses the new account's **test-mode** keys; production uses live-mode. Webhook secrets differ per endpoint — one secret per Vercel environment, generated when the endpoint is created in the Stripe dashboard.
5. **Stripe restricted keys**: grant only what `app/_lib/stripe/` actually calls — read the code, list the exact resource permissions (e.g., Customers: Write, Subscriptions: Write, Checkout Sessions: Write, Webhook Endpoints: Read), don't say "give it everything".
6. **`NEXT_PUBLIC_APP_URL`**: local = `http://localhost:3000`, staging = the staging deployment URL, production = `https://app.usesalt.io`.

## Output format

Produce a single checklist the user can execute top-to-bottom:

```
## <SERVICE> key setup
1. Create/locate key in <service dashboard> — exact permissions: …
2. 1Password: vault item "<name>", field "<field>" → add line to .env.1password: <VAR>=op://…
3. Vercel staging:  vercel env add <VAR> preview   (type: encrypted — NOT sensitive if NEXT_PUBLIC)
4. Vercel production: vercel env add <VAR> production
5. Redeploy staging + production
6. Verify: <concrete check — endpoint to hit, log line to look for>
```

Then, after the user says it's done, **verify**: `vercel env ls` for presence (not values), restart dev via `/devup`, and hit the relevant route/health check.
