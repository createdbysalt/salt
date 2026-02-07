import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { ServeHeader } from "./ServeHeader";
import { BridgeTabs } from "./components/BridgeTabs";
import {
  Users,
  Share2,
  Palette,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

/**
 * Serve Mode Home Page
 *
 * Client portal management dashboard:
 * - Active portals overview
 * - Client activity
 * - Pending requests
 * - Portal health
 */
export default async function ServePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch clients with portal access
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact_email, lifecycle_stage")
    .not("lifecycle_stage", "eq", "archived")
    .order("name")
    .limit(10);

  const activeClients = clients?.length || 0;

  return (
    <div className="space-y-8">
      {/* Page Header - Serve mode greeting */}
      <ServeHeader />

      {/* Bridge Section Tabs */}
      <BridgeTabs />

      {/* Portal Overview - Show real metrics only (RFC #8) */}
      <div className="flex items-start gap-4">
        <Card className="w-fit min-w-[180px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Portals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">Clients with access</p>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground pt-3">
          More metrics coming soon: pending requests, messages, shared assets.
        </p>
      </div>

      {/* Client Portals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Client Portals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeClients === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Add clients in Studio mode to give them portal access.
                Clients will be able to view shared intelligence, submit requests,
                and communicate with you.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients?.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.contact_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">
                      {client.lifecycle_stage?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portal Features */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Shared Intelligence - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Shared Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share strategic insights and reports with your clients.
              Control what they see and when.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>

        {/* Portal Branding - LIVE */}
        <Link href="/serve/branding" className="block group">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Portal Branding
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Customize the look and feel of your client portal
                with your brand colors and logo.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

