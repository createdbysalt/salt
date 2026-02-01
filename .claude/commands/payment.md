---
name: payment
description: "Stripe payment operations: audit, monitoring, sandbox testing, and draft-only refunds. Read-only by default."
---

# /payment - Payment Operations Command

Secure payment observation, Stripe auditing, sandbox testing, and draft-only operations. Orchestrates the `payment-keeper` agent.

## Philosophy

**"Read-only by default, draft-only for writes, never auto-execute money-moving operations."**

This command follows the same security philosophy as `/database` - the agent can observe and draft, but never execute financial transactions.

## Usage

```bash
# Tier 1: Read-Only Operations (Always Safe)
/payment audit                    # Full security audit (SaaS + Connect)
/payment monitor                  # Real-time health check
/payment sandbox                  # Verify test environment
/payment analyze "pi_xxx"         # Investigate a payment
/payment analyze "cus_xxx"        # Investigate a customer
/payment connect                  # Check all Connect accounts (The Bridge)
/payment connect acct_xxx         # Check specific Connect account
/payment bridge                   # Bridge analytics (client billing)
/payment bridge [studio_id]       # Bridge analytics for specific studio
/payment test checkout            # Guide through test scenario
/payment help "refunds"           # Search Stripe documentation

# Tier 2: Draft Operations (Human Approval Required)
/payment refund "pi_xxx" [amount] # Draft refund for review
/payment radar                    # Analyze fraud, propose rules
/payment dispute "dp_xxx"         # Draft dispute response
```

## Commands

### Tier 1: Read-Only

| Command | Purpose |
|---------|---------|
| `audit` | Comprehensive security audit (SaaS + Connect) |
| `monitor` | Real-time health check of webhooks, payments, subscriptions |
| `sandbox` | Verify test mode keys, webhook forwarding, test products |
| `analyze "..."` | Investigate specific payment, customer, or subscription |
| `connect` | Check all Express Connect accounts (The Bridge) |
| `connect [id]` | Check specific Connect account verification and health |
| `bridge` | Bridge analytics - client billing summary across studios |
| `bridge [studio_id]` | Bridge analytics for specific studio |
| `test [scenario]` | Guide through test scenarios (checkout, decline, 3ds, webhook) |
| `help "..."` | Search Stripe documentation |

### Tier 2: Draft Operations

| Command | Purpose |
|---------|---------|
| `refund "pi_xxx" [amount]` | Draft refund with impact analysis (human executes) |
| `radar` | Analyze fraud patterns, recommend Radar rules |
| `dispute "dp_xxx"` | Draft dispute response evidence |

## Examples

### Security Audit

```bash
/payment audit
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Payment Security Audit Report                                   │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Test mode keys configured                                    │
│ ✅ Webhook signature verification present                       │
│ ⚠️  Missing timestamp validation in webhooks                    │
│ ✅ Idempotency handling implemented                             │
│ ✅ PCI compliance patterns followed                             │
│                                                                 │
│ Recommendations:                                                │
│ 1. Add 5-minute timestamp tolerance to prevent replay attacks   │
└─────────────────────────────────────────────────────────────────┘
```

### Sandbox Verification

```bash
/payment sandbox
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Sandbox Environment Check                                       │
├─────────────────────────────────────────────────────────────────┤
│ ✅ STRIPE_SECRET_KEY: sk_test_... (test mode)                   │
│ ✅ Webhook secrets configured                                   │
│ ⚠️  Stripe CLI not detected - run: pnpm stripe:webhooks         │
│ ✅ Test products configured                                     │
│                                                                 │
│ Test Cards:                                                     │
│ • Success: 4242 4242 4242 4242                                  │
│ • Decline: 4000 0000 0000 0002                                  │
│ • 3DS:     4000 0000 0000 3220                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Payment Analysis

```bash
/payment analyze "pi_3Oxyz..."
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Payment Analysis: pi_3Oxyz...                                   │
├─────────────────────────────────────────────────────────────────┤
│ Status: succeeded                                               │
│ Amount: $99.00 USD                                              │
│ Customer: cus_xxx (john@example.com)                            │
│ Created: 2026-01-30 14:32:00 UTC                                │
│                                                                 │
│ Risk Analysis:                                                  │
│ • Risk Score: 12 (low)                                          │
│ • 3DS: Authenticated (liability shift: YES)                     │
│ • Card: Visa ending 4242                                        │
│                                                                 │
│ Related:                                                        │
│ • Invoice: in_xxx                                               │
│ • Subscription: sub_xxx (Professional Monthly)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Draft Refund (Tier 2)

```bash
/payment refund "pi_3Oxyz..." 50.00
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Refund Draft (PENDING HUMAN REVIEW)                             │
├─────────────────────────────────────────────────────────────────┤
│ Payment: pi_3Oxyz...                                            │
│ Original: $99.00 | Refund: $50.00 (partial)                     │
│                                                                 │
│ Impact:                                                         │
│ • 3DS Liability Shift: Will be LOST on refund                   │
│ • Stripe Fee: $2.88 + $0.30 (non-refundable)                    │
│ • Customer can still dispute remaining $49.00                   │
│                                                                 │
│ Next Steps:                                                     │
│ 1. Review this analysis                                         │
│ 2. Go to Stripe Dashboard → Payments → pi_3Oxyz...              │
│ 3. Click "Refund" → Enter $50.00                                │
│ 4. Confirm                                                      │
│                                                                 │
│ Draft saved: .claude/ralph/payments/refund-pi_3Oxyz.json        │
└─────────────────────────────────────────────────────────────────┘
```

### Connect Account Check (The Bridge)

```bash
/payment connect
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Connect Account Health (The Bridge)                             │
│ Account: acct_xxx | Studio: Acme Design Co                      │
├─────────────────────────────────────────────────────────────────┤
│ Type: Express | Country: US                                     │
│ Charges Enabled: ✅ | Payouts Enabled: ✅                       │
│ Details Submitted: ✅                                           │
│                                                                 │
│ Requirements: None pending                                      │
│                                                                 │
│ Bridge Activity (Last 30 Days):                                 │
│ • Invoices: 5 paid ($2,450), 1 pending ($500)                   │
│ • Retainers: 2 active ($800/mo)                                 │
│ • Payouts: 3 completed ($2,100)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Bridge Analytics (Client Billing)

```bash
/payment bridge
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Bridge Analytics (Client Billing) - All Studios                 │
│ Period: Last 30 Days                                            │
├─────────────────────────────────────────────────────────────────┤
│ Invoices: 15 sent, 12 paid ($11,200), 2 pending, 1 overdue ⚠️  │
│ Retainers: 6 active ($4,800/mo)                                 │
│ Total Revenue: $16,000                                          │
│                                                                 │
│ Action Items:                                                   │
│ ⚠️ Invoice INV-xxx overdue by 5 days (client: John Doe)        │
│ ℹ️ 2 subscriptions renew in next 3 days                        │
└─────────────────────────────────────────────────────────────────┘
```

### Test Scenarios

```bash
/payment test checkout    # Guide through subscription checkout
/payment test decline     # Test declined card handling
/payment test 3ds         # Test 3D Secure authentication
/payment test webhook checkout.session.completed  # Trigger webhook
```

## Tiered Permission Model

```
TIER 3: Execution [HUMAN ONLY]
  └── Refunds, payouts, cancellations → Stripe Dashboard
        ▲
TIER 2: Draft [Explicit Command]
  └── /payment refund, /payment radar → Proposals for review
        ▲
TIER 1: Observe [DEFAULT]
  └── /payment audit, monitor, analyze → Always safe
```

## MCP Integration

This command uses the Stripe MCP server configured in `.mcp.json`:

```json
{
  "stripe": {
    "command": "npx",
    "args": ["-y", "@stripe/mcp", "--tools=customers.read,products.read,..."],
    "env": { "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}" }
  }
}
```

The MCP server is restricted to read-only tools for safety.

## Security Guarantees

| Guarantee | Enforcement |
|-----------|-------------|
| No live keys in dev | Agent halts if detected |
| No auto-refunds | Tier 3 is human-only |
| No card data access | PCI compliance enforced |
| Full audit trail | All operations logged |
| Test mode isolation | Strict environment checks |

## Prerequisites

- `STRIPE_SECRET_KEY` - Must be test key (`sk_test_*`) in development
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `STRIPE_CONNECT_WEBHOOK_SECRET` - For Connect webhooks

## See Also

- `payment-keeper` agent (core implementation)
- `/database` command (similar pattern for database)
- `docs/guides/stripe-integration.md` - Stripe integration guide
- `docs/architecture/billing-security.md` - Security model
