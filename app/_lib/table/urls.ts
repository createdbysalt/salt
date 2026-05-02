/**
 * Bridge URL Utilities
 *
 * On the Bridge subdomain (table.usesalt.io), URLs should be clean:
 * - /projects instead of /table/projects
 * - /messages instead of /table/messages
 *
 * The middleware handles rewriting:
 * - table.usesalt.io/projects → internally serves /table/projects
 *
 * These helpers ensure consistent URL generation across the codebase.
 */

/**
 * Bridge public URLs - what users see in the browser
 * On bridge subdomain, these are clean URLs without /table prefix.
 *
 * Usage in components:
 * - Use these for Link href and router.push()
 * - Middleware rewrites these to internal routes
 */
export const tableUrl = {
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
 * Strip /table prefix from a path if present.
 * Useful for converting internal paths to public URLs.
 */
export function toBridgePublicUrl(internalPath: string): string {
  if (internalPath.startsWith("/table")) {
    const cleanPath = internalPath.slice("/table".length);
    return cleanPath || "/";
  }
  return internalPath;
}

/**
 * Add /table prefix to a path if not already present.
 * Useful for server-side redirects.
 */
export function toBridgeInternalPath(publicUrl: string): string {
  if (publicUrl === "/") return "/table";
  if (publicUrl.startsWith("/table")) return publicUrl;
  return `/table${publicUrl}`;
}
