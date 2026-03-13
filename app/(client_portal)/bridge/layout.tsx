import "./bridge.css";
import { redirect } from "next/navigation";
import { SidebarProvider, TooltipProvider } from "@repo/ui";
import { getTenantContext } from "@/app/_lib/tenancy";
import { safeRedirectPath } from "@/app/_lib/security/safe-redirect";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";

/**
 * Bridge Layout (Client Portal)
 *
 * Implements shadcn dashboard-01 block pattern with auth/tenancy support.
 *
 * Light mode is forced via:
 * - Blocking script in root layout (detects /bridge path)
 * - ThemeProvider is Bridge-aware (won't override)
 * - CSS isolation via data-surface="bridge" and bridge.css
 *
 * Auth flow:
 * - Unauthenticated: Render minimal wrapper (page handles login form)
 * - Authenticated: Render full sidebar shell with client context
 *
 * This layout does NOT affect the user dashboard.
 */
export default async function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, redirectTo } = await getTenantContext();

  // If user is NOT authenticated, render minimal wrapper
  // The page component will show login form inline
  if (!context.userId) {
    return (
      <div
        data-surface="bridge"
        className="bg-background text-foreground min-h-screen"
      >
        <AuthTokenHandler />
        {children}
      </div>
    );
  }

  // From here on, user IS authenticated

  // If tenant context says we should redirect, do it immediately
  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);

  // Allow both client users and studio members to access bridge
  if (context.actorType !== "clientUser" && context.actorType !== "studioMember") {
    // Authenticated but wrong actor type - redirect to main app
    redirect("/");
  }

  // For client users without client context, redirect to client selector
  if (context.actorType === "clientUser" && !context.client) {
    redirect("/bridge/select");
  }

  // Render authenticated shell with sidebar
  return (
    <div
      data-surface="bridge"
      className="bg-background text-foreground min-h-screen"
    >
      <AuthTokenHandler />
      <TooltipProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          {children}
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
