import "./table.css";
import { redirect } from "next/navigation";
import { SidebarProvider, TooltipProvider } from "@repo/ui";
import { getTenantContext } from "@/app/_lib/tenancy";
import { safeRedirectPath } from "@/app/_lib/security/safe-redirect";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";
import {
  generateBrandingCSSVariables,
  resolveBrandingConfig,
} from "@/app/_lib/table/branding-config";
import {
  getStudioBrandingById,
  getStudioIdFromClient,
} from "@/app/_lib/table/queries";

/**
 * Bridge Layout (Client Portal)
 *
 * Implements shadcn dashboard-01 block pattern with auth/tenancy support.
 *
 * Light mode is forced via:
 * - Blocking script in root layout (detects /table path)
 * - ThemeProvider is Bridge-aware (won't override)
 * - CSS isolation via data-surface="table" and table.css
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
        data-surface="table"
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
    redirect("/table/select");
  }

  // Resolve studio ID for branding
  let studioId: string | null = null;
  if (context.actorType === "studioMember" && context.studio) {
    studioId = context.studio.id;
  } else if (context.actorType === "clientUser" && context.client) {
    studioId = await getStudioIdFromClient(context.client.id);
  }

  // Fetch branding for the resolved studio
  const branding = studioId
    ? await getStudioBrandingById(studioId)
    : resolveBrandingConfig(null);

  // Generate CSS variables from branding
  const brandingCSSVars = generateBrandingCSSVariables({
    colors: {
      accent: branding.colors.accent,
      accentForeground: branding.colors.accentForeground,
      scale: branding.colors.scale,
    },
  });

  // Render authenticated shell with sidebar
  return (
    <div
      data-surface="table"
      className="bg-background text-foreground min-h-screen flex flex-col"
      style={brandingCSSVars as React.CSSProperties}
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
      {/* Powered by footer */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center py-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border-t z-50">
        Powered by{" "}
        <a
          href="https://usesalt.io"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-medium text-foreground hover:underline"
        >
          Salt
        </a>
      </div>
    </div>
  );
}
