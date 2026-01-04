import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/src/features/shell/components/DashboardShell";
import { DashboardSidebar } from "@/src/features/shell/components/DashboardSidebar";
import { DashboardHeader } from "@/src/features/shell/components/DashboardHeader";
import { CommandPaletteProvider } from "@/src/features/shell/components/CommandPalette";
import { DashboardUserProvider } from "@/src/features/shell/contexts/DashboardUserContext";
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

  // Extract first name for greetings (prefer explicit profile/auth fields over email fallback)
  const metaFirstName = (user.user_metadata?.first_name as string | undefined)?.trim();
  const metaFullName = (
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    ""
  ).trim();
  const emailLocalPart = user.email?.split("@")[0] || "";
  const firstName =
    metaFirstName || metaFullName.split(/\s+/)[0] || emailLocalPart || "";
  const fullName = metaFullName;

  return (
    <CommandPaletteProvider>
      <DashboardUserProvider
        user={{
          firstName,
          fullName,
          email: user.email,
        }}
      >
        <DashboardShell
          sidebar={<DashboardSidebar key="sidebar" user={user} profile={profile} />}
          header={<DashboardHeader key="header" user={user} />}
        >
          {children}
        </DashboardShell>
      </DashboardUserProvider>
    </CommandPaletteProvider>
  );
}
