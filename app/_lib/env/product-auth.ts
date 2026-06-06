import { getDeploymentEnvironment } from "./deployment";

/** Where unauthenticated users are sent when product sign-in is disabled. */
export const PRODUCT_AUTH_REDIRECT_PATH = "/waitlist";

/**
 * App route prefixes blocked when product auth is disabled (waitlist-only production).
 * Keep in sync with canonical surfaces in app/_features/shell/routes.ts.
 */
export const PRODUCT_APP_ROUTE_PREFIXES = [
  "/hq",
  "/people",
  "/plays",
  "/capture",
  "/connections",
  "/roundtables",
  "/conversations",
  "/meetings",
  "/billing",
  "/settings",
  "/orgs",
  "/files",
  "/teams",
  "/me",
  "/onboarding",
  "/studio",
  "/dashboard",
  "/clients",
  "/relationships",
  "/work",
  "/sales",
  "/strategy",
  "/serve",
  "/branding",
] as const;

export const PRODUCT_AUTH_PATHS = ["/signin", "/signout"] as const;

export const PRODUCT_AUTH_API_PATHS = ["/api/auth/callback"] as const;

function parseExplicitProductAuthFlag(
  value: string | undefined
): boolean | null {
  if (value === undefined || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

/**
 * Whether product sign-in and authenticated app surfaces are available.
 *
 * - `NEXT_PUBLIC_PRODUCT_AUTH_ENABLED=true` → always allow
 * - `NEXT_PUBLIC_PRODUCT_AUTH_ENABLED=false` → always block
 * - unset → allow on staging branch and local dev only (block production + Vercel previews)
 */
export function isProductAuthEnabled(): boolean {
  const explicit = parseExplicitProductAuthFlag(
    process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED
  );
  if (explicit !== null) return explicit;

  const deployEnv = getDeploymentEnvironment();
  if (deployEnv === "staging") return true;
  if (deployEnv === "development" && !process.env.VERCEL) return true;

  return false;
}

export function getProductAuthRedirectPath(): string {
  return PRODUCT_AUTH_REDIRECT_PATH;
}

export function isProductAppRoute(pathname: string): boolean {
  return PRODUCT_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isProductAuthPath(pathname: string): boolean {
  if (PRODUCT_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }

  return PRODUCT_AUTH_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function shouldBlockProductAccess(pathname: string): boolean {
  if (isProductAuthEnabled()) return false;
  return isProductAuthPath(pathname) || isProductAppRoute(pathname);
}
