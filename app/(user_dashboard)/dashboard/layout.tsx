import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/src/features/shell/components/DashboardShell";
import { DashboardSidebar } from "@/src/features/shell/components/DashboardSidebar";
import { DashboardHeader } from "@/src/features/shell/components/DashboardHeader";
import { CommandPaletteProvider } from "@/src/features/shell/components/CommandPalette";
import { createClient } from "@/libs/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Enforce authentication
  if (!user) {
    redirect("/signin");
  }

  // Get user profile for subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("saas_tier")
    .eq("id", user.id)
    .single();

  return (
    <CommandPaletteProvider>
      <DashboardShell
        sidebar={<DashboardSidebar key="sidebar" user={user} profile={profile} />}
        header={<DashboardHeader key="header" user={user} />}
      >
        {children}
      </DashboardShell>
    </CommandPaletteProvider>
  );
}
