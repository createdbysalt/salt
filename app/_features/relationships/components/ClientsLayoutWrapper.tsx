import { ReactNode, cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@repo/ui";
import { ClientsSidebar } from "./ClientsSidebar";
import { SiteHeader } from "@/app/_features/shell/components/SiteHeader";
import { CommandPaletteProvider } from "@/app/_features/shell/components/CommandPalette";
import { DashboardUserProvider } from "@/app/_features/shell/contexts/DashboardUserContext";
import { DashboardModeProvider } from "@/app/_features/shell/contexts/DashboardModeContext";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * React cache for request deduplication
 */
const getProfile = cache(async (supabase: SupabaseClient, userId: string) => {
  const { data } = await supabase
    .from("profiles")
    .select("saas_tier")
    .eq("id", userId)
    .single();
  return data;
});

const getStudioDetails = cache(async (supabase: SupabaseClient, studioId: string) => {
  const { data } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", studioId)
    .single();
  return data;
});

/**
 * ClientsLayoutWrapper - Layout wrapper for the Clients app
 *
 * Similar to DashboardLayoutWrapper but uses ClientsSidebar
 * for Clients-specific navigation.
 */
export async function ClientsLayoutWrapper({
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
  const studioMembership = requireStudioMember(context);

  // Get sidebar state from cookie for SSR
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Fetch layout data in parallel
  const [profile, studioDetails] = await Promise.all([
    getProfile(supabase, user.id),
    getStudioDetails(supabase, studioMembership.id),
  ]);

  // Extract first name for greetings
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
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <CommandPaletteProvider>
          <DashboardUserProvider
            user={{
              firstName,
              fullName,
              email: user.email,
              studioName: studioDetails?.name,
              studioId: studioMembership.id,
            }}
          >
            <ClientsSidebar
              user={user}
              profile={profile}
              studioId={studioMembership.id}
            />
            <SidebarInset className="overflow-hidden">
              <SiteHeader />
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="@container/main flex flex-1 flex-col min-h-0 overflow-hidden">
                  {children}
                </div>
              </div>
            </SidebarInset>
          </DashboardUserProvider>
        </CommandPaletteProvider>
      </SidebarProvider>
    </DashboardModeProvider>
  );
}
