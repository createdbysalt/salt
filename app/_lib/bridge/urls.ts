/**
 * Bridge URL Utilities
 *
 * On the Bridge subdomain (bridge.saltcore.io), URLs should be clean:
 * - /projects instead of /bridge/projects
 * - /messages instead of /bridge/messages
 *
 * The middleware handles rewriting:
 * - bridge.saltcore.io/projects → internally serves /bridge/projects
 *
 * These helpers ensure consistent URL generation across the codebase.
 */

/**
 * Bridge public URLs - what users see in the browser
 * On bridge subdomain, these are clean URLs without /bridge prefix.
 *
 * Usage in components:
 * - Use these for Link href and router.push()
 * - Middleware rewrites these to internal routes
 */
export const bridgeUrl = {
  home: "/",
  login: "/login",
  verify: "/verify",
  select: "/select",
  projects: "/projects",
  project: (id: string) => `/projects/${id}`,
  projectSeo: (id: string) => `/projects/${id}/seo`,
  messages: "/messages",
  conversation: (id: string) => `/messages/${id}`,
  files: "/files",
  billing: "/billing",
  invoices: "/invoices",
  invoice: (token: string) => `/invoices/${token}`,
  invoiceSuccess: (token: string) => `/invoices/${token}/success`,
  invoiceExpired: (token: string) => `/invoices/${token}/expired`,
  invoicePay: (id: string) => `/invoices/${id}/pay`,
  requests: "/requests",
  knowledge: "/knowledge",
  intelligence: "/intelligence",
  settings: "/settings",
  progress: "/progress",
  retainerSuccess: "/retainer/success",
} as const;

/**
 * Strip /bridge prefix from a path if present.
 * Useful for converting internal paths to public URLs.
 */
export function toBridgePublicUrl(internalPath: string): string {
  if (internalPath.startsWith("/bridge")) {
    const cleanPath = internalPath.slice("/bridge".length);
    return cleanPath || "/";
  }
  return internalPath;
}

/**
 * Add /bridge prefix to a path if not already present.
 * Useful for server-side redirects.
 */
export function toBridgeInternalPath(publicUrl: string): string {
  if (publicUrl === "/") return "/bridge";
  if (publicUrl.startsWith("/bridge")) return publicUrl;
  return `/bridge${publicUrl}`;
}
