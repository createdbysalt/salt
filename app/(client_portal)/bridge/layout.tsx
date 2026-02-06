import React from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import { safeRedirectPath } from "@/app/_lib/security/safe-redirect";
import { redirect } from "next/navigation";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";
import { BridgeHeader } from "@/app/_features/portal/components/bridge-header";
import { BridgeNav } from "@/app/_features/portal/components/bridge-nav";
import { BridgeMobileNav } from "@/app/_features/portal/components/bridge-mobile-nav";
import { HelpSystem } from "@/app/_features/portal/components/help-system";
import { ProjectContextProvider } from "@/app/_features/portal/context/project-context";
import { BridgeSurfaceProvider } from "@/app/_features/portal/components/bridge-surface-provider";
import { createClient } from "@/app/_lib/supabase/server";

export default async function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, allowed, redirectTo } = await getTenantContext();

  // If user is NOT authenticated, render minimal wrapper
  // The page component will show login form inline
  if (!context.userId) {
    return (
      <BridgeSurfaceProvider>
        <AuthTokenHandler />
        {children}
      </BridgeSurfaceProvider>
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
    redirect("/select");
  }

  // Get client and projects data for the shell (if user has client access)
  const supabase = await createClient();

  let client = null;
  let projects: Array<{ id: string; name: string; status: string; progress?: number }> = [];

  // Only query client data if user has client context
  if (context.client) {
    // Run queries in parallel for better performance
    const [clientResult, projectsResult] = await Promise.all([
      supabase
        .from("clients")
        .select("name, settings")
        .eq("id", context.client.id)
        .single(),

      supabase
        .from("projects")
        .select("id, name, status, progress")
        .eq("client_id", context.client.id)
        .order("name")
    ]);

    client = clientResult.data;
    projects = (projectsResult.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress ?? undefined,
    }));
  }

  const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;

  // Extract white-label branding from client settings
  const bridgeBranding = client?.settings?.bridge?.branding;
  const customLogoUrl = bridgeBranding?.logoUrl;

  return (
    <BridgeSurfaceProvider>
      <ProjectContextProvider projects={projects}>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          {/* Handle magic link tokens in URL fragments */}
          <AuthTokenHandler />

          {/* Bridge Header */}
          <BridgeHeader
            clientName={client?.name || "Client Portal"}
            hasMultipleClients={hasMultipleClients}
            customLogoUrl={customLogoUrl}
          />

          {/* Bridge Shell with left sidebar navigation */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Desktop Only */}
            <aside className="w-64 shrink-0 hidden md:block">
              <BridgeNav clientId={context.client?.id || null} />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <BridgeMobileNav clientId={context.client?.id || null} />

          {/* Floating Help Button */}
          <HelpSystem />
        </div>
      </ProjectContextProvider>
    </BridgeSurfaceProvider>
  );
}
