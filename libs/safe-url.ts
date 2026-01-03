/**
 * Safe URL utilities.
 *
 * These are used to reduce open-redirect/phishing risk and to satisfy CodeQL
 * when handling URLs that originate from user-controlled input.
 */

export function safeSameOriginAbsoluteUrl(
  candidate: string | null | undefined,
  expectedOrigin: string
): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== expectedOrigin) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validate Stripe-hosted redirect URLs (Checkout/Portal/Connect onboarding).
 * Stripe uses multiple subdomains (checkout/billing/connect), so we allow any
 * `*.stripe.com` host over HTTPS.
 */
export function safeStripeHostedUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase();
    // Strict allowlist: stripe.com or any subdomain of stripe.com.
    // NOTE: `endsWith("stripe.com")` is insufficient because it matches `evilstripe.com`.
    if (hostname !== "stripe.com" && !hostname.endsWith(".stripe.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}


