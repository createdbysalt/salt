# /seo-audit — SEO & AEO Audit Skill

## Purpose

Comprehensive SEO and AEO (Answer Engine Optimization) audit for client websites. Based on "The Boring Marketer" methodology: technical fixes, on-page optimization, and LLM/AI visibility.

## When to Use

- Before launch to verify SEO readiness
- When client reports ranking issues
- After major content or structural changes
- Periodic health checks (quarterly recommended)
- When user says "audit seo", "check seo", "seo review"

## Usage

```
/seo-audit [url or scope]
```

**Examples:**

```
/seo-audit                     # Audit entire site
/seo-audit https://client.com  # Audit specific URL
/seo-audit homepage            # Audit home page only
/seo-audit --fix               # Audit and auto-fix issues
```

---

## Audit Categories

### 1. Technical SEO

| Check               | What It Does                                 | Auto-Fix? |
| ------------------- | -------------------------------------------- | --------- |
| **robots.txt**      | Verify exists, not blocking important pages  | Yes       |
| **sitemap.xml**     | Verify exists, all pages included, no errors | Yes       |
| **Canonical URLs**  | Check for missing/incorrect canonicals       | Yes       |
| **Meta robots**     | Check for accidental noindex tags            | Report    |
| **HTTPS**           | Verify SSL, no mixed content                 | Report    |
| **Mobile-friendly** | Check viewport meta, responsive              | Report    |
| **Page speed**      | Core Web Vitals indicators                   | Partial   |
| **Broken links**    | Internal 404s                                | Report    |

### 2. On-Page SEO

| Check                 | What It Does                     | Auto-Fix? |
| --------------------- | -------------------------------- | --------- |
| **Title tags**        | Present, unique, 50-60 chars     | Yes       |
| **Meta descriptions** | Present, unique, 150-160 chars   | Yes       |
| **H1 tags**           | One per page, descriptive        | Report    |
| **Image alt text**    | All images have alt              | Report    |
| **Internal linking**  | Orphan pages, link depth         | Report    |
| **Keyword usage**     | Target keywords in key positions | Report    |

### 3. Structured Data (Schema)

| Check              | What It Does               | Auto-Fix? |
| ------------------ | -------------------------- | --------- |
| **Organization**   | Present in root layout     | Yes       |
| **WebSite**        | Present with search action | Yes       |
| **BreadcrumbList** | On all interior pages      | Yes       |
| **LocalBusiness**  | On location pages          | Yes       |
| **FAQPage**        | On pages with FAQ content  | Yes       |
| **Service**        | On service pages           | Yes       |
| **Validation**     | No schema errors           | Report    |

### 4. LLM/AEO Optimization

| Check                      | What It Does                      | Auto-Fix? |
| -------------------------- | --------------------------------- | --------- |
| **llms.txt**               | Present, current, well-structured | Yes       |
| **Speakable markup**       | On key pages                      | Yes       |
| **FAQ coverage**           | Enough Q&A for AI to cite         | Report    |
| **Content clarity**        | Clear, quotable answers           | Report    |
| **robots.txt AI crawlers** | GPTBot, Claude-Web allowed        | Yes       |

---

## Workflow

### Step 1: Gather Scope

Determine what to audit:

- **Full site**: Read sitemap.xml, audit all pages
- **Specific URL**: Audit single page
- **Category**: Audit pages of a type (e.g., all location pages)

### Step 2: Run Technical Checks

```bash
# Check robots.txt
curl -s https://site.com/robots.txt

# Check sitemap
curl -s https://site.com/sitemap.xml

# Validate structured data (use browser or API)
```

**For this codebase, check:**

- `app/robots.ts` — robots.txt generation
- `app/sitemap.ts` — sitemap generation
- `lib/seo/structured-data.tsx` — schema components

### Step 3: Run On-Page Checks

For each page:

1. Fetch page HTML (use Playwright or fetch)
2. Parse for title, meta description, H1, images
3. Check against standards
4. Flag issues

**Key files to check:**

- `app/(personal)/layout.tsx` — site-wide meta
- Individual page files — page-specific meta
- `sanity/lib/queries.ts` — SEO fields in queries

### Step 4: Run Structured Data Checks

1. Extract all `<script type="application/ld+json">` tags
2. Parse and validate JSON-LD
3. Check for required schema types
4. Validate against Schema.org

**Key files:**

- `lib/seo/structured-data.tsx` — schema generators
- Page files — where schemas are rendered

### Step 5: Run AEO Checks

1. Check for `llms.txt` route
2. Check for speakable markup
3. Evaluate FAQ coverage
4. Check AI crawler access

**Key files:**

- `app/llms.txt/route.ts` — llms.txt route (create if missing)
- `app/robots.ts` — AI crawler rules

### Step 6: Generate Report

Output a structured report:

```json
{
  "auditDate": "2026-04-18",
  "url": "https://client.com",
  "score": 85,
  "categories": {
    "technical": {
      "score": 90,
      "issues": [
        {
          "severity": "warning",
          "check": "Page Speed",
          "message": "LCP is 3.2s, target is <2.5s",
          "fix": "Optimize hero image, add priority loading"
        }
      ]
    },
    "onPage": {
      "score": 80,
      "issues": [...]
    },
    "schema": {
      "score": 95,
      "issues": [...]
    },
    "aeo": {
      "score": 75,
      "issues": [...]
    }
  },
  "recommendations": [
    {
      "priority": "high",
      "action": "Add FAQ schema to solution pages",
      "impact": "Can trigger rich results"
    }
  ]
}
```

### Step 7: Auto-Fix (if --fix flag)

For issues marked as auto-fixable:

1. Generate the fix
2. Apply to codebase
3. Run `npm run typegen` if schemas changed
4. Verify fix with re-check

---

## PageSpeed Integration

From the video: copy PageSpeed Insights errors directly into Claude to fix.

**Workflow:**

1. User runs PageSpeed Insights on their URL
2. User copies diagnostic output
3. User pastes into Claude Code
4. Agent parses issues, prioritizes
5. Agent generates fixes or applies directly

**Common fixes:**

- Image optimization (use `next/image`, add `priority`)
- Font loading (use `next/font`, preload)
- JavaScript (defer non-critical, code split)
- CSS (inline critical, defer rest)
- Server response (edge functions, caching)

---

## Output Format

### Console Summary

```
SEO Audit: https://client.com
════════════════════════════════════════

Overall Score: 85/100

Technical SEO:     ████████░░ 90/100
  ✓ robots.txt present and valid
  ✓ sitemap.xml present (24 URLs)
  ⚠ Page speed: LCP 3.2s (target <2.5s)

On-Page SEO:       ████████░░ 80/100
  ✓ All pages have title tags
  ⚠ 3 pages missing meta descriptions
  ✗ /about has no H1 tag

Structured Data:   █████████░ 95/100
  ✓ Organization schema present
  ✓ WebSite schema present
  ⚠ FAQ schema missing on /solutions/truck-broke-down

AEO Optimization:  ███████░░░ 75/100
  ✗ llms.txt not found
  ⚠ No speakable markup on key pages
  ✓ AI crawlers allowed in robots.txt

Top Priorities:
1. [HIGH] Create llms.txt route
2. [HIGH] Add H1 to /about page
3. [MEDIUM] Add meta descriptions to 3 pages
4. [MEDIUM] Add FAQ schema to solution pages
5. [LOW] Optimize hero image for LCP

Run with --fix to auto-fix issues marked with ✓
```

### JSON Report

Saved to `docs/audits/seo-audit-YYYY-MM-DD.json`

---

## Codebase-Specific Checks

### This Template's SEO Files

| File                          | Purpose               | Common Issues              |
| ----------------------------- | --------------------- | -------------------------- |
| `app/robots.ts`               | Robots.txt generation | Missing AI crawlers        |
| `app/sitemap.ts`              | Sitemap generation    | Missing new content types  |
| `lib/seo/config.ts`           | SEO configuration     | Env vars not set           |
| `lib/seo/structured-data.tsx` | Schema generators     | Missing on new pages       |
| `app/(personal)/layout.tsx`   | Site-wide meta        | Missing SiteStructuredData |

### Schema Checklist by Page Type

| Page Type     | Required Schemas                                     |
| ------------- | ---------------------------------------------------- |
| Home          | Organization, WebSite                                |
| About         | Organization, Breadcrumb                             |
| Services      | Service, Breadcrumb                                  |
| Location      | LocalBusiness, Breadcrumb, FAQ (if content)          |
| Solution      | HowTo (if process), Breadcrumb, FAQ (if content)     |
| Local Service | Service, LocalBusiness, Breadcrumb, FAQ (if content) |
| Project       | CreativeWork, Breadcrumb                             |
| Blog Post     | Article, Breadcrumb                                  |

---

## Integration with /discover

When `/discover` runs SEO research in parallel, this skill can:

1. Validate suggested pages exist in schema
2. Check if target keywords appear in content
3. Verify internal linking structure
4. Confirm structured data for page types

---

## Example Session

**User:** `/seo-audit`

**Agent:**

```
Running SEO audit on localhost:4000...

Checking technical SEO...
✓ robots.txt: Valid
✓ sitemap.xml: 24 URLs found
⚠ Missing: /locations/austin (new page not in sitemap?)

Checking on-page SEO...
Fetching pages... [████████████████████] 24/24

Found 3 issues:
- /about: Missing meta description
- /solutions/truck-broke-down: Title too long (72 chars)
- /services/web-design/austin: Missing H1

Checking structured data...
✓ Organization: Present
✓ WebSite: Present
⚠ /locations/austin: LocalBusiness schema missing phone

Checking AEO...
✗ llms.txt: Not found
⚠ No speakable markup detected

═══════════════════════════════════════
Overall Score: 78/100

Would you like me to:
1. Auto-fix the issues I can fix (--fix)
2. Generate detailed recommendations
3. Create the missing llms.txt route
```

**User:** `3`

**Agent:** Creates `app/llms.txt/route.ts` with dynamic content from Sanity.
