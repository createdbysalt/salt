/**
 * Utilities for safely handling redirects derived from computed values.
 *
 * CodeQL often flags dynamic redirects as potential open-redirect vectors.
 * This helper enforces "internal-only" redirects (same-site paths).
 */
export function safeRedirectPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  if (!value) return null;

  // Must be an absolute path on this origin (no protocol, no protocol-relative URLs).
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;

  // Disallow schemes anywhere (defense-in-depth).
  if (value.includes("://")) return null;

  // Prevent header injection / response splitting if ever used in headers.
  if (value.includes("\r") || value.includes("\n")) return null;

  return value;
}
