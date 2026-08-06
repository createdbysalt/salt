# Cookie Compliance Guide

## Before adding any third-party script or SDK

Ask these questions:

1. **Does it set cookies or track users?**
   - If yes → it MUST be consent-gated
   - If no → can load freely (rare)

2. **Which consent category?**
   - `analytics` — measurement, product analytics (PostHog)
   - `marketing` — ads, chat, conversion tracking (GTM, Meta, Gleap)
   - `functional` — preferences only (theme)

3. **Update the cookie policy?**
   - Add to `/subprocessors` page
   - Add to cookie policy (Sanity: `legal-cookie-policy`)

## How to consent-gate a new service

```tsx
// In your component or provider:
import { useCookieConsent } from "@/app/_features/marketing/components/CookieConsentProvider";

function MyNewService() {
  const { analytics, marketing } = useCookieConsent();
  
  useEffect(() => {
    // Only initialize after consent
    if (!marketing) return;  // or !analytics for analytics tools
    
    initializeService();
  }, [marketing]);
  
  return null;
}
```

Then add it inside `<CookieConsentProvider>` in `LayoutClient.tsx`.

## Current consent-gated services

| Service | Category | File |
|---------|----------|------|
| PostHog | `analytics` | `PostHogProvider.tsx` |
| GTM | `marketing` | `MarketingTagManager.tsx` |
| Meta Pixel | `marketing` | via GTM |
| Gleap | `marketing` | `LayoutClient.tsx` |

## Quick audit

Run this to find potential violations:

```bash
# Find scripts that might load without consent
grep -r "useEffect.*init\|\.init(\|\.configure(" app/_components --include="*.tsx" | grep -v "useCookieConsent"
```

## When updating services

1. Update code (consent-gate the service)
2. Update `/subprocessors` (Sanity + markdown fallback)
3. Update cookie policy (Sanity + markdown fallback)
4. Test: reject all cookies → verify service doesn't load (check Network tab)
