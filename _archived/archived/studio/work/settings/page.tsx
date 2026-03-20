import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { Settings, Columns, Tags, Bell } from "lucide-react";

/**
 * Studio Mode - Work Section Settings
 *
 * Configure how the Work section behaves:
 * - Default views (Today, Projects, Clients, Pipeline)
 * - Pipeline stage configuration
 * - Tag management
 * - Notification preferences
 */
export default async function WorkSettingsPage() {
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
        title="Work Settings"
        description="Configure your workspace and operational preferences"
        noBorder
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pipeline Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Pipeline Stages
            </CardTitle>
            <CardDescription>
              Customize your client lifecycle stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure the stages clients move through from lead to completion.
              Add custom stages or rename existing ones.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
          </CardContent>
        </Card>

        {/* Tag Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Tags & Labels
            </CardTitle>
            <CardDescription>
              Organize projects and clients with tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create and manage tags for categorizing your work.
              Tags help you filter and find items quickly.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control when and how you get notified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set up notifications for project updates, client activity,
              and important deadlines.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
          </CardContent>
        </Card>

        {/* Default Views */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Default Views
            </CardTitle>
            <CardDescription>
              Set your preferred default views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Choose which view opens by default when you switch to Studio mode.
              Configure list vs grid preferences.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
