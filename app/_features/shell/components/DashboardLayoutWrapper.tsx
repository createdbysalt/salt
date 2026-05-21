import { ReactNode, cache, ComponentType } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@repo/ui";
import { AppSidebar } from "./AppSidebar";
import { ClientOnlySidebar } from "./ClientOnlySidebar";
import { CommandPaletteProvider } from "./CommandPalette";
import { DashboardContentShell } from "./DashboardContentShell";
import { DashboardUserProvider } from "../contexts/DashboardUserContext";
import { DashboardModeProvider } from "../contexts/DashboardModeContext";
import { ServeClientProvider } from "../contexts/ServeClientContext";
import { ClientCommandPalette } from "./ClientCommandPalette";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireStudioMember } from "@/app/_lib/tenancy/guards";
import { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileData = {
  saas_tier: string | null;
} | null;

export interface SidebarProps {
  user: User;
  profile: ProfileData;
  studioId: string;
}

/**
 * React cache for request deduplication (within same request)
 * These prevent duplicate queries if the same data is requested
 * multiple times during a single page render.
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
    .from("studios")
    .select("id, name")
    .eq("id", studioId)
    .single();
  return data;
});

// Removed: getClients was fetching ALL clients on every page load
// Clients are now lazy-loaded via ServeClientLoader only when needed

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
 * - User profile fetching
 * - Client data for Serve mode
 * - All dashboard providers (mode, sidebar, command palette, etc.)
 *
 * Performance:
 * - React cache() dedupes queries within same request
 * - All data fetched in parallel with Promise.all
 * - Layout queries are lightweight (3 simple selects)
 */
export async function DashboardLayoutWrapper({
  children,
  sidebar: SidebarComponent,
}: {
  children: ReactNode;
  /** Custom sidebar component. Defaults to AppSidebar if not provided. */
  sidebar?: ComponentType<SidebarProps>;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const isDev = process.env.NODE_ENV === "development";

  // DEBUG: Log all cookies
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  if (isDev) {
    console.log("[Auth Debug] ===== START =====");
    console.log("[Auth Debug] Total cookies:", allCookies.length);
    console.log("[Auth Debug] Auth cookies found:", authCookies.map((c) => c.name));
  }

  // Check if auth cookie exists (indicates user was previously logged in)
  const hasAuthCookie = authCookies.some((c) => c.name.includes("-auth-token"));

  if (isDev) {
    console.log("[Auth Debug] Has auth token cookie:", hasAuthCookie);
  }

  let user = null;
  let retryCount = 0;
  const maxRetries = isDev ? 3 : 1;

  while (!user && retryCount < maxRetries) {
    try {
      if (isDev) {
        console.log("[Auth Debug] Attempt", retryCount + 1, "- calling getSession()");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.log("[Auth Debug] getSession error:", error.message);
        }
        console.log("[Auth Debug] Session exists:", !!session);
        console.log("[Auth Debug] User exists:", !!session?.user);
        user = session?.user ?? null;
      } else {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.log("[Auth Debug] getUser error:", error.message);
        }
        user = data.user;
      }

      if (user) {
        console.log("[Auth Debug] Got user:", user.email);
        break;
      }

      if (isDev && hasAuthCookie && retryCount < maxRetries - 1) {
        retryCount++;
        console.log("[Auth Debug] Retrying in", 150 * retryCount, "ms...");
        await new Promise((r) => setTimeout(r, 150 * retryCount));
      } else {
        break;
      }
    } catch (error) {
      console.log("[Auth Debug] Exception:", error);
      if (isDev && hasAuthCookie && retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise((r) => setTimeout(r, 150 * retryCount));
      } else {
        break;
      }
    }
  }

  // Enforce authentication
  if (!user) {
    if (isDev) {
      console.log("[Auth Debug] REDIRECTING TO SIGNIN");
      console.log("[Auth Debug] hasAuthCookie:", hasAuthCookie);
      console.log("[Auth Debug] retryCount:", retryCount);
      console.log("[Auth Debug] ===== END =====");
    }
    redirect("/signin");
  }

  if (isDev) {
    console.log("[Auth Debug] SUCCESS - user authenticated");
    console.log("[Auth Debug] ===== END =====");
  }

  // Get studio context
  const { context } = await getTenantContext();
  const studioMembership = requireStudioMember(context);

  // Get sidebar state from cookie for SSR
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Fetch layout data in parallel (removed clients - now lazy-loaded)
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
          "--sidebar-width": "200px",
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
              <ClientOnlySidebar
                component={SidebarComponent ?? AppSidebar}
                props={{
                  user,
                  profile,
                  studioId: studioMembership.id,
                }}
              />
              <SidebarInset className="h-[100dvh] max-h-[100dvh] overflow-hidden md:h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-1rem)]">
                <DashboardContentShell>{children}</DashboardContentShell>
              </SidebarInset>
              <ClientCommandPalette />
            </DashboardUserProvider>
          </CommandPaletteProvider>
        </ServeClientProvider>
      </SidebarProvider>
    </DashboardModeProvider>
  );
}
