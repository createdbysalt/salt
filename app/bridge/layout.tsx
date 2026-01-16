import React from "react";
import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";
import { BridgeHeader } from "@/app/_features/portal/components/bridge-header";
import { BridgeNav } from "@/app/_features/portal/components/bridge-nav";
import { BridgeMobileNav } from "@/app/_features/portal/components/bridge-mobile-nav";
import { HelpSystem } from "@/app/_features/portal/components/help-system";
import { createClient } from "@/libs/supabase/server";

export default async function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, allowed, redirectTo } = await getTenantContext();

  // Check if we're on a verification page (login/verify) - if so, render without auth checks
  const isLoginPage = context.metadata?.path === "/bridge/login" || context.metadata?.path === "/bridge/verify";

  if (isLoginPage) {
    // For login pages, just render the children with basic auth handler
    return (
      <>
        <AuthTokenHandler />
        {children}
      </>
    );
  }

  // If tenant context says we should redirect, do it immediately
  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);

  // Allow both client users and studio members to access bridge
  if (context.actorType !== "clientUser" && context.actorType !== "studioMember") {
    redirect("/bridge/login");
  }

  // For studio members without client access, allow but show limited interface
  // For client users, require client context
  if (!allowed || (context.actorType === "clientUser" && !context.client)) {
    redirect("/bridge/login");
  }

  // Get client and projects data for the shell (if user has client access)
  const supabase = await createClient();

  let client = null;
  let projects = null;

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
        .select("id, name, status")
        .eq("client_id", context.client.id)
        .order("name")
    ]);

    client = clientResult.data;
    projects = projectsResult.data;
  }

  const hasMultipleClients = (context.clientMemberships?.length || 0) > 1;
  
  // Extract white-label branding from client settings
  const bridgeBranding = client?.settings?.bridge?.branding;
  const customLogoUrl = bridgeBranding?.logoUrl;
  const customSupportEmail = bridgeBranding?.supportEmail;
  const customSupportName = bridgeBranding?.supportName;
  
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      
      {/* Bridge Header */}
      <BridgeHeader
        clientName={client?.name || "Client Portal"}
        projects={projects || []}
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
  );
}

