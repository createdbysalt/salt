---
name: perplexity
description: "Quick web lookups via Perplexity AI. Real-time facts, API docs, current pricing."
---

# /perplexity - Quick Web Search

Fast, cited web lookups via Perplexity AI MCP server. For quick facts, current events, API documentation, and anything that changes frequently.

## Usage

```bash
# Quick lookup (default)
/perplexity "Stripe Connect fee structure 2026"

# With focus area
/perplexity "Next.js 15 breaking changes" --focus docs
/perplexity "Linear vs Asana market share" --focus business
/perplexity "WCAG 2.2 new success criteria" --focus technical

# Multiple questions
/perplexity "Supabase realtime pricing" "Supabase edge functions limits"
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `query` | The search question (required) | - |
| `--focus` | Focus area: `docs`, `technical`, `business`, `news`, `general` | `general` |
| `--citations` | Include source URLs | `true` |
| `--brief` | Return concise answer only | `false` |

## When to Use

**Use Perplexity:**
- Current pricing, limits, quotas
- Latest framework/library changes
- API documentation lookups
- "What's the latest on X?"
- Real-time competitive info
- Quick fact-checking

**Use `/research` instead for:**
- Deep feature research
- UX pattern analysis
- "Should we build X?" decisions
- Multi-dimensional analysis

## Setup

Requires `PERPLEXITY_API_KEY` in environment. Already configured in 1Password:

```bash
# Verify MCP server is available
claude mcp list  # Should show 'perplexity'

# If missing, add with 1Password
claude mcp add perplexity -- op run -- perplexity-mcp
```

## Examples

### API Documentation
```bash
/perplexity "Stripe Payment Intents API required fields"

# Output:
# Required fields for Payment Intents:
# - amount (integer, in smallest currency unit)
# - currency (3-letter ISO code)
# - payment_method_types (array, optional with automatic_payment_methods)
# Source: stripe.com/docs/api/payment_intents
```

### Current Pricing
```bash
/perplexity "Vercel Pro plan pricing May 2026"

# Output:
# Vercel Pro: $20/user/month
# Includes: 1TB bandwidth, 100GB-hours compute, unlimited projects
# Source: vercel.com/pricing (retrieved May 2026)
```

### Framework Changes
```bash
/perplexity "React 19 new hooks" --focus docs

# Output:
# New hooks in React 19:
# - useActionState (form actions)
# - useFormStatus (pending states)
# - useOptimistic (optimistic updates)
# Source: react.dev/blog/2024/04/25/react-19
```

## Integration

### With /research
```bash
# Quick fact during deep research
/perplexity "Supabase row-level security performance impact" --brief
# Then continue with /research for full analysis
```

### With /social
```bash
# Get current stats for content
/perplexity "SaaS churn rate benchmarks 2026" --brief
# Use in /social draft
```

## Troubleshooting

### "Perplexity MCP not available"
```bash
# Check if server is running
claude mcp list

# Re-add if missing
claude mcp add perplexity -- op run -- perplexity-mcp
```

### "PERPLEXITY_API_KEY not set"
Key is in 1Password at `salt-software-development/perplexity/credential`. Use `op run` or export manually.

## See Also

- `/research` - Deep research with Gemini (use for complex analysis)
- `/scout` - UX pattern research
- `/social trends` - Social media trend research
