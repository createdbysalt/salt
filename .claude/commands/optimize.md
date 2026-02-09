---
name: optimize
description: "SEO and AEO optimization for Salt Core marketing site. Audits, fixes, and monitors search visibility."
---

# /optimize - Search Optimization Command

Audit and improve SEO (Search Engine Optimization) and AEO (Answer Engine Optimization) for Salt Core's marketing site.

## Purpose

Ensure Salt Core ranks well in both traditional search engines (Google, Bing) AND AI answer engines (Perplexity, ChatGPT, Claude). This command orchestrates the `search-optimizer` agent.

## When to Use

- After building new marketing pages
- Before launching marketing campaigns
- When search traffic drops
- Periodic health checks (monthly recommended)
- After content updates

## Usage

```bash
# Full audit of entire marketing site
/optimize audit

# Audit specific page
/optimize audit /pricing
/optimize audit /blog/why-freelancers-lose-money

# Fix all issues found in audit
/optimize fix

# Fix specific category of issues
/optimize fix --category technical
/optimize fix --category content
/optimize fix --category aeo

# Check specific aspects
/optimize check sitemap
/optimize check robots
/optimize check schemas
/optimize check meta
/optimize check llms

# Competitive analysis (uses Apify if available, WebSearch fallback)
/optimize analyze competitors
/optimize analyze serp "studio management software"

# Monitor mode
/optimize monitor --metrics lighthouse
/optimize monitor --metrics cwv
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `action` | Action to perform: `audit`, `fix`, `check`, `analyze`, `monitor` | `audit` |
| `target` | Page path or aspect to target | All marketing pages |
| `--category` | Issue category: `technical`, `content`, `aeo`, `all` | `all` |
| `--level` | Autonomy: `supervised`, `guided`, `advisory`, `autonomous` | `guided` |
| `--output` | Output format: `report`, `json`, `both` | `report` |

## Actions

### audit
Run comprehensive SEO/AEO audit on the marketing site.

**Output:** Prioritized list of issues with severity and fix recommendations.

```bash
/optimize audit              # Full site audit
/optimize audit /features    # Single page audit
```

### fix
Apply fixes for issues found in audit.

**Output:** Summary of changes made and validation results.

```bash
/optimize fix                    # Fix all issues
/optimize fix --category aeo     # Fix only AEO issues
```

### check
Quick check of specific SEO aspect.

**Output:** Pass/fail status with details.

```bash
/optimize check sitemap    # Verify sitemap.xml
/optimize check robots     # Verify robots.txt
/optimize check schemas    # Validate JSON-LD
/optimize check meta       # Check meta tags
/optimize check llms       # Verify llms.txt
```

### analyze
Competitive analysis using Apify MCP (with WebSearch fallback).

**Output:** Competitive intelligence report.

```bash
/optimize analyze competitors                    # Analyze known competitors
/optimize analyze serp "freelancer software"    # SERP analysis for keyword
```

### monitor
Check performance metrics over time.

**Output:** Performance dashboard with trends.

```bash
/optimize monitor --metrics lighthouse    # Lighthouse scores
/optimize monitor --metrics cwv           # Core Web Vitals
```

## Prerequisites

### Required
- Marketing site pages exist in `app/(public)/`
- `app/sitemap.ts` and `app/robots.ts` exist
- `public/llms.txt` exists

### Optional (for Enhanced Features)

**Apify MCP** - For advanced competitive analysis:

1. **Verify Configuration** - Check `.mcp.json` includes:
   ```json
   "apify": {
     "command": "npx",
     "args": ["-y", "@apify/actors-mcp-server@latest"],
     "env": {
       "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
     }
   }
   ```

2. **Set API Token** - Add to `.env.local`:
   ```
   APIFY_API_TOKEN=your_apify_token_here
   ```

3. **Restart Claude Code** - Required after adding the token

4. **Verify Working** - Check for `mcp__apify__*` tools in the tool list

**Fallback Behavior:**
If Apify is not configured, `/optimize analyze` will automatically use:
- `WebSearch` for keyword and competitor research
- `WebFetch` to analyze competitor pages directly

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    /optimize audit                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: TECHNICAL AUDIT                                    │
│  ─────────────────────────                                   │
│  • Check sitemap.ts coverage                                 │
│  • Check robots.ts rules                                     │
│  • Validate structured data (JSON-LD)                        │
│  • Run Lighthouse audit                                      │
│  • Check Core Web Vitals                                     │
│                                                              │
│  PHASE 2: ON-PAGE AUDIT                                      │
│  ─────────────────────────                                   │
│  • Scan meta tags (title, description, OG)                   │
│  • Check heading hierarchy                                   │
│  • Validate canonical URLs                                   │
│  • Check internal linking                                    │
│                                                              │
│  PHASE 3: AEO AUDIT                                          │
│  ─────────────────────────                                   │
│  • Verify llms.txt completeness                              │
│  • Check FAQ schema presence                                 │
│  • Analyze content structure for AI extraction               │
│                                                              │
│  PHASE 4: REPORT                                             │
│  ─────────────────────────                                   │
│  • Generate prioritized issue list                           │
│  • Calculate overall health score                            │
│  • Provide fix recommendations                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Example Output

```
═══════════════════════════════════════════════════════════════
SEO/AEO AUDIT REPORT: Salt Core Marketing Site
═══════════════════════════════════════════════════════════════

Overall Health Score: 78/100

CRITICAL ISSUES (2)
─────────────────────────────────────────────────────────────────
❌ Missing FAQ schema on /pricing page
   Impact: HIGH | Effort: LOW
   Fix: Add FAQPage JSON-LD with common pricing questions

❌ Blog posts missing Article schema
   Impact: HIGH | Effort: MEDIUM
   Fix: Add generateMetadata and Article JSON-LD to blog template

WARNINGS (3)
─────────────────────────────────────────────────────────────────
⚠️ /features page description too short (89 chars, target: 150-160)
⚠️ No BreadcrumbList schema on blog posts
⚠️ llms.txt missing recent feature additions

OPPORTUNITIES (2)
─────────────────────────────────────────────────────────────────
💡 Consider adding comparison pages (vs Queue, vs HoneyBook)
💡 Add HowTo schema for onboarding guide

METRICS
─────────────────────────────────────────────────────────────────
│ Metric                 │ Current │ Target │ Status │
│────────────────────────│─────────│────────│────────│
│ Lighthouse Performance │ 87      │ 90+    │ ⚠️     │
│ Lighthouse SEO         │ 100     │ 100    │ ✅     │
│ Lighthouse Accessibility│ 95     │ 95+    │ ✅     │
│ Core Web Vitals        │ 2/3     │ 3/3    │ ⚠️     │

═══════════════════════════════════════════════════════════════

Run `/optimize fix` to apply recommended fixes.
```

## Issue Categories

### Technical SEO
- Sitemap coverage and accuracy
- Robots.txt rules
- Canonical URLs
- Structured data validity
- Core Web Vitals
- Mobile responsiveness

### Content SEO
- Meta titles and descriptions
- Heading hierarchy (H1-H6)
- Internal linking
- Image alt text
- Keyword presence

### AEO (Answer Engine Optimization)
- llms.txt completeness
- FAQ schema presence
- Content structure for AI
- Concise answer formatting
- Source citation patterns

## Integration with Other Commands

| Command | Integration |
|---------|-------------|
| `/copy` | Generate SEO-optimized copy |
| `/build-page` | Build pages with proper meta tags |
| `/write` | Create blog posts with article schema |
| `/scout` | Research competitor SEO patterns |

## Output Locations

```
brand-identity/research/
├── seo-audit-YYYY-MM-DD.md       # Full audit reports
├── seo-audit-YYYY-MM-DD.json     # Machine-readable audit data

app/(public)/
├── Various page files with SEO fixes applied
```

## Troubleshooting

### "Lighthouse audit failed"
- Ensure dev server is running on port 3000
- Check network connectivity

### "Schema validation errors"
- Use Google's Rich Results Test to debug
- Check JSON-LD syntax carefully

### "Apify analysis unavailable"
1. Check if `APIFY_API_TOKEN` is set in `.env.local`
2. Verify `.mcp.json` has the apify server configuration
3. Restart Claude Code to reload MCP servers
4. Check for `mcp__apify__*` tools in the available tools list

**Using WebSearch Fallback:**
If Apify is unavailable, the agent will automatically use WebSearch and WebFetch for competitive analysis. Results will be clearly marked as using the fallback method.

## See Also

- `search-optimizer` agent (core implementation)
- `brand-identity/research/general/2026-02-06-search-optimizer-agent.md` (research basis)
- `app/_lib/seo/` (SEO utilities)
- `app/(public)/CLAUDE.md` (marketing page patterns)
