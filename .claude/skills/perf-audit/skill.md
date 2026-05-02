# Performance Audit Skill

Audits image optimization, video loading, and overall page performance. Identifies issues and optionally auto-fixes common problems.

## Trigger Phrases

- "check performance"
- "page speed"
- "slow images"
- "audit images"
- "performance audit"
- `/perf-audit`

## What This Skill Does

1. **Image Audit** — Scans for `<Image>` components to verify:
   - `role` prop is set (hero/card/thumbnail/gallery/lightbox)
   - `priority` prop is set on above-fold images
   - `sizes` prop is specified for responsive images
   - Using `SanityImage` instead of raw `ImageBox` or `next/image`

2. **Video Audit** — Checks video embeds:
   - YouTube/Vimeo URLs use `VideoFacade` (lazy loading)
   - No direct `<iframe>` embeds on page load
   - Poster images are configured

3. **LQIP Check** — Verifies blur placeholders:
   - Hero images have LQIP blur-up effect
   - `blurDataURL` is populated from Sanity

4. **Sanity Query Audit** — Reviews GROQ queries:
   - No `*` projections pulling entire documents
   - Image assets project only needed fields
   - Dereferenced content is filtered

5. **Lighthouse Run** (optional) — Uses Playwright to:
   - Open the page in headless Chrome
   - Run Lighthouse performance audit
   - Report LCP, CLS, TBT scores
   - Identify specific bottlenecks

## Output

Generates a report with:

- **Issues Found** — categorized by severity (critical/warning/info)
- **Specific Fixes** — file paths and line numbers
- **Auto-Fix Available** — which issues can be fixed automatically

## Usage

```
/perf-audit                    # Audit entire site
/perf-audit /projects          # Audit specific route
/perf-audit --fix              # Auto-fix common issues
/perf-audit --lighthouse       # Include Lighthouse scores
```

## Implementation Steps

<step index="1">
## Scan Components for Image Issues

Search all `.tsx` files for image components:

```bash
# Find all Image/SanityImage/ImageBox usage
grep -rn "from 'next/image'" components/ app/
grep -rn "from '@/components/SanityImage'" components/ app/
grep -rn "from '@/components/ImageBox'" components/ app/
```

For each usage, check:

1. Is `role` prop set? (SanityImage only)
2. Is `priority` set on hero/above-fold images?
3. Is `sizes` prop specified?

Report any missing props with file:line references.
</step>

<step index="2">
## Scan for Direct Video Embeds

Search for iframe and video elements:

```bash
grep -rn "<iframe" components/ app/
grep -rn "<video" components/ app/
grep -rn "youtube.com/embed" components/ app/
grep -rn "player.vimeo.com" components/ app/
```

Flag any direct embeds that don't use VideoFacade.
</step>

<step index="3">
## Audit GROQ Queries

Read `sanity/lib/queries.ts` and check:

1. **No unfiltered projections** — `*[_type == "project"]` should have `{ specific, fields }`
2. **Image optimization** — Image fields should project only `asset._ref` not full asset
3. **Pagination** — Large collections should use `[0..N]` limits

Example issue:

```groq
// BAD: pulls entire image object
coverImage

// GOOD: projects only what's needed
coverImage { asset }
```

</step>

<step index="4">
## Check LQIP Configuration

Verify SanityImage component is configured for blur:

1. Read `components/SanityImage.tsx`
2. Confirm `blurDataURL` is populated from `lqipUrl()`
3. Check `placeholder="blur"` is set

If ImageBox is still in use, flag it for migration to SanityImage.
</step>

<step index="5">
## Run Lighthouse (Optional)

If `--lighthouse` flag is set:

1. Start dev server if not running
2. Use Playwright to navigate to target page
3. Run Lighthouse via `mcp__playwright__browser_evaluate`
4. Extract Performance score, LCP, CLS, TBT
5. Report specific recommendations
   </step>

<step index="6">
## Generate Report

Output format:

```markdown
# Performance Audit Report

## Summary

- **Issues Found:** 12
- **Critical:** 3
- **Warnings:** 7
- **Info:** 2

## Critical Issues

### 1. Missing priority on hero image

**File:** `app/(personal)/page.tsx:45`
**Issue:** Hero SanityImage missing `priority` prop
**Fix:** Add `priority` to above-fold hero image

### 2. Direct iframe embed

**File:** `components/ProjectDetail.tsx:78`
**Issue:** YouTube iframe loaded on page load
**Fix:** Replace with VideoFacade component

## Auto-Fixable Issues

Run `/perf-audit --fix` to automatically fix:

- Add missing `role="card"` to 4 SanityImage components
- Add `sizes` prop to 3 images
```

</step>

<step index="7">
## Auto-Fix (Optional)

If `--fix` flag is set:

1. Add missing `role` props (default to "card")
2. Add missing `sizes` props (default to responsive pattern)
3. Replace ImageBox with SanityImage
4. Wrap direct iframes with VideoFacade

Show diff of changes before applying.
</step>

## Reference: Role-Based Image Sizes

| Role      | Width  | Quality | Priority |
| --------- | ------ | ------- | -------- |
| hero      | 2400px | 85      | true     |
| card      | 800px  | 75      | false    |
| thumbnail | 192px  | 90      | false    |
| gallery   | 1200px | 80      | false    |
| lightbox  | 2400px | 85      | false    |

## Reference: Performance Targets

| Metric    | Target  | Description              |
| --------- | ------- | ------------------------ |
| LCP       | < 2.5s  | Largest Contentful Paint |
| CLS       | < 0.1   | Cumulative Layout Shift  |
| TBT       | < 200ms | Total Blocking Time      |
| PageSpeed | > 90    | Overall score            |

## Common Issues Checklist

- [ ] Hero images use `role="hero"` and `priority`
- [ ] Card images use `role="card"` and `sizes` prop
- [ ] Videos use VideoFacade, not direct iframes
- [ ] Queries project specific fields, not `*`
- [ ] Images have alt text
- [ ] LQIP blur is enabled for visible images
