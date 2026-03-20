import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { Zap, Clock, Filter, Bell } from "lucide-react";

export const metadata = {
  title: "Intelligence Settings | Salt",
  description: "Configure intelligence generation and delivery",
};

/**
 * Strategy Mode - Intelligence Section Settings
 *
 * Configure intelligence generation:
 * - Automation rules
 * - Scheduling
 * - Filtering preferences
 * - Notification settings
 */
export default async function IntelligenceSettingsPage() {
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
        title="Intelligence Settings"
        description="Configure how intelligence is generated and delivered"
        noBorder
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Automation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Automation Rules
            </CardTitle>
            <CardDescription>
              Set up automatic intelligence generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure triggers for automatic report generation.
              Run competitive scans, SEO audits, and more on schedule.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduling
            </CardTitle>
            <CardDescription>
              Set up recurring intelligence reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Schedule weekly, monthly, or quarterly reports.
              Get consistent intelligence without manual effort.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>

        {/* Filtering */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Feed Filters
            </CardTitle>
            <CardDescription>
              Customize what appears in your feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Filter intelligence by type, priority, or source.
              Focus on what matters most to your practice.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control intelligence alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get notified when important intelligence is generated
              or when scheduled reports are ready.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming Q2 2026</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
