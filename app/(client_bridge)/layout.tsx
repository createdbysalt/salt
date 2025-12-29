import React from "react";
import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";

export default async function ClientBridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context, allowed } = await getTenantContext();
  
  // Only allow client users
  if (context.actorType !== "clientUser") {
    redirect("/signin");
  }
  
  if (!allowed || !context.client) {
    redirect("/signin");
  }
  
  return <>{children}</>;
}

