import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Share2, FileBarChart, Lock } from "lucide-react";

/**
 * Serve Mode - Shared Intelligence
 *
 * Control which reports and insights are visible to clients.
 * Manage sharing permissions and access levels.
 */
export default async function SharedIntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shared Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Control which reports and insights your clients can access
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Share2 className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Shared Intelligence Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Share strategic insights and performance reports with your clients.
              Control exactly what they see and when they see it.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileBarChart className="h-4 w-4" />
                <span>Share reports</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="h-4 w-4" />
                <span>Access control</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
