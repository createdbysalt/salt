import { ReactNode } from "react";
import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { BridgeHeaderModern } from "./bridge-header-modern";

interface BridgeLayoutWrapperProps {
  children: ReactNode;
}

export async function BridgeLayoutWrapper({ children }: BridgeLayoutWrapperProps) {
  const { context } = await getTenantContext();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", context.client?.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <BridgeHeaderModern 
        clientName={client?.name || "Client"}
        userEmail={user?.email}
        userAvatar={user?.user_metadata?.avatar_url}
      />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

