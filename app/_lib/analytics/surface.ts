/** App surfaces — product analytics (PostHog) load on these paths when not on marketing host. */
const APP_PATH_PREFIXES = [
  "/hq",
  "/people",
  "/roundtables",
  "/plays",
  "/capture",
  "/memory",
  "/conversations",
  "/meetings",
  "/billing",
  "/settings",
  "/branding",
  "/websites",
  "/dashboard",
  "/studio",
  "/clients",
  "/relationships",
  "/work",
] as const;

export function isAppHost(host: string): boolean {
  return (
    host.includes("app.usesalt") ||
    host.includes("app.localhost") ||
    host.includes("app.lvh.me")
  );
}

export function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isLocalDevHost(host: string): boolean {
  return host.includes("localhost") || host.includes("127.0.0.1") || host.includes("lvh.me");
}

/** GTM on usesalt.io (marketing). Not on app subdomain or app paths on localhost. */
export function shouldLoadMarketingAnalytics(host: string, pathname: string): boolean {
  if (isAppHost(host)) return false;
  if (isLocalDevHost(host)) return !isAppPath(pathname);
  return true;
}

/** PostHog on app.usesalt.io (product). App paths on localhost when analytics enabled. */
export function shouldLoadProductAnalytics(host: string, pathname: string): boolean {
  if (isAppHost(host)) return true;
  if (isLocalDevHost(host)) return isAppPath(pathname);
  return isAppPath(pathname);
}
