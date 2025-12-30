import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/libs/supabase/middleware";
import { resolveTenantContext } from "@/libs/tenancy/context";

/**
 * Salt Core Middleware
 * 
 * Responsibilities:
 * 1. Refresh Supabase auth session
 * 2. Resolve tenant context (studio vs client vs anonymous)
 * 3. Enforce access control for protected routes
 * 4. Add tenant metadata to request headers for downstream use
 */
export async function middleware(request: NextRequest) {
  // Step 1: Update Supabase session
  const supabaseResponse = await updateSession(request);
  
  // Step 2: Extract request metadata
  const host = request.headers.get("host") || "localhost:3000";
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent");
  
  // Step 3: Resolve tenant context
  const { context, allowed, redirectTo, error } = await resolveTenantContext(
    host,
    pathname,
    userAgent
  );
  
  // Step 4: If not allowed, redirect or block
  if (!allowed && redirectTo) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectTo;
    return NextResponse.redirect(redirectUrl);
  }
  
  // Step 5: Add tenant context to headers for server components to use
  // This allows server components to access context without re-resolving
  const response = supabaseResponse;
  response.headers.set("x-tenant-actor-type", context.actorType);
  response.headers.set("x-tenant-user-id", context.userId || "");
  response.headers.set("x-pathname", pathname);
  
  if (context.studio) {
    response.headers.set("x-tenant-studio-id", context.studio.id);
    response.headers.set("x-tenant-studio-role", context.studio.role);
  }
  
  if (context.client) {
    response.headers.set("x-tenant-client-id", context.client.id);
    response.headers.set("x-tenant-client-role", context.client.role);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
