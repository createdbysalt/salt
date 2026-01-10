import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Project Activity</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Timeline of all project events and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No activity yet</p>
            <p className="text-sm max-w-md mx-auto">
              Activity tracking will show intelligence generation, file uploads, task updates,
              and other project events
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
