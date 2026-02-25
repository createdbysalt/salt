import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { Palette, Globe, Lock, Bell, ChevronRight } from "lucide-react";

/**
 * Serve Mode - Bridge Section Settings
 *
 * Configure The Bridge client portal:
 * - Branding (logo, colors) - LIVE
 * - Custom domain - LIVE
 * - Access controls - Coming Soon
 * - Notification settings - Coming Soon
 */
export default async function BridgeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bridge Settings"
        description="Configure your client portal appearance and behavior"
        noBorder
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Branding - LIVE */}
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
              <CardDescription>
                Customize the look and feel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload your logo, set brand colors, and customize
                the appearance of your client portals.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Custom Domain - LIVE */}
        <Link href="/serve/branding?tab=domain" className="block group">
          <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Custom Domain
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardTitle>
              <CardDescription>
                Use your own domain for client portals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect a custom domain like portal.yourstudio.com
                for a fully branded experience.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Access Controls - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Controls
            </CardTitle>
            <CardDescription>
              Manage who can access what
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure default access levels, password requirements,
              and session settings for client portals.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>

        {/* Notifications - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Client Notifications
            </CardTitle>
            <CardDescription>
              Configure client notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up email notifications for clients when new
              content is shared or messages are received.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

