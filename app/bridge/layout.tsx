import React from "react";
import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import { AuthTokenHandler } from "@/components/AuthTokenHandler";
import { BridgeHeader } from "@/components/bridge/bridge-header";
import { BridgeNav } from "@/components/bridge/bridge-nav";
import { BridgeMobileNav } from "@/components/bridge/bridge-mobile-nav";
import { HelpSystem } from "@/components/bridge/help-system";
import { createClient } from "@/libs/supabase/server";

export default async function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, allowed, redirectTo } = await getTenantContext();

  // Public pages (like invoice payment) - render without shell
  // These use token-based auth, not session auth
  if (context.actorType === "anonymous") {
    return <>{children}</>;
  }

  // If tenant context says we should redirect, do it immediately
  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);

  // If user is a studio member (not a client), redirect to dashboard
  if (context.actorType === "studioMember") {
    redirect("/dashboard");
  }

  // Only allow client users
  if (context.actorType !== "clientUser") {
    redirect("/bridge/login");
  }

  if (!allowed || !context.client) {
    redirect("/bridge/login");
  }

  // Get client and projects data for the shell
  const supabase = await createClient();
  
  const { data: client } = await supabase
    .from("clients")
    .select("name, settings")
    .eq("id", context.client.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("client_id", context.client.id)
    .order("name");

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
          <BridgeNav />
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BridgeMobileNav />
      
      {/* Floating Help Button */}
      <HelpSystem />
    </div>
  );
}

