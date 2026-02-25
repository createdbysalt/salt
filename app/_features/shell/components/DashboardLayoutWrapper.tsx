import { ReactNode, cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@repo/ui";
import { SaltCoreSidebar } from "./SaltCoreSidebar";
import { SiteHeader } from "./SiteHeader";
import { CommandPaletteProvider } from "./CommandPalette";
import { DashboardUserProvider } from "../contexts/DashboardUserContext";
import { DashboardModeProvider } from "../contexts/DashboardModeContext";
import { ServeClientProvider } from "../contexts/ServeClientContext";
import { ServeClientLoader } from "./sidebar/serve/ServeClientLoader";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { SupabaseClient } from "@supabase/supabase-js";

// React cache for request deduplication (within same request)
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
    .from("studios")
    .select("id, name")
    .eq("id", studioId)
    .single();
  return data;
});

const getClients = cache(async (supabase: SupabaseClient, studioId: string) => {
  const { data } = await supabase
    .from("clients")
    .select("id, name, contact_email")
    .eq("studio_id", studioId)
    .not("lifecycle_stage", "eq", "archived")
    .order("name");
  return data;
});

/**
 * DashboardLayoutWrapper - Shared layout component for all S-mode routes
 *
 * Used by:
 * - /studio/* (Studio mode)
 * - /strategy/* (Strategy mode)
 * - /serve/* (Serve mode)
 *
 * Handles:
 * - Authentication enforcement
 * - Studio context loading
 * - User profile fetching (cached)
 * - Client data for Serve mode (cached)
 * - All dashboard providers (mode, sidebar, command palette, etc.)
 */
export async function DashboardLayoutWrapper({
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

  // Get data in parallel (React cache dedupes within same request)
  const [profile, studioDetails, clients] = await Promise.all([
    getProfile(supabase, user.id),
    getStudioDetails(supabase, studioMembership.id),
    getClients(supabase, studioMembership.id),
  ]);

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

  const serveClients = (clients || []).map((c) => ({
    id: c.id,
    name: c.name,
    contactEmail: c.contact_email,
  }));

  // Get sidebar state from cookie for SSR
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <DashboardModeProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <ServeClientProvider>
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
              <ServeClientLoader clients={serveClients} />
              <SaltCoreSidebar
                user={user}
                profile={profile}
                studioId={studioMembership.id}
              />
              <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                  <div className="@container/main flex flex-1 flex-col gap-2">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </DashboardUserProvider>
          </CommandPaletteProvider>
        </ServeClientProvider>
      </SidebarProvider>
    </DashboardModeProvider>
  );
}
