import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/_features/shell/components/DashboardShell";
import { DashboardSidebar } from "@/app/_features/shell/components/DashboardSidebar";
import { CommandPaletteProvider } from "@/app/_features/shell/components/CommandPalette";
import { DashboardUserProvider } from "@/app/_features/shell/contexts/DashboardUserContext";
import { DashboardModeProvider } from "@/app/_features/shell/contexts/DashboardModeContext";
import { SidebarProvider } from "@/app/_features/shell/contexts/SidebarContext";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";

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

  // Get studio context
  const { context } = await getTenantContext();
  const studio = requireStudioMember(context);

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
    <DashboardModeProvider>
      <SidebarProvider>
        <CommandPaletteProvider>
          <DashboardUserProvider
            user={{
              firstName,
              fullName,
              email: user.email,
            }}
          >
            <DashboardShell
              sidebar={
                <DashboardSidebar
                  key="sidebar"
                  user={user}
                  profile={profile}
                  studioId={studio.id}
                />
              }
            >
              {children}
            </DashboardShell>
          </DashboardUserProvider>
        </CommandPaletteProvider>
      </SidebarProvider>
    </DashboardModeProvider>
  );
}
