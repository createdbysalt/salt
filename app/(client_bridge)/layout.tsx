import React from "react";
import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import { AuthTokenHandler } from "@/components/AuthTokenHandler";

export default async function ClientBridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, allowed, redirectTo } = await getTenantContext();
  
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
  
  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}

