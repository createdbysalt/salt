import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { BridgeTabs } from "../../components/BridgeTabs";
import { ClipboardList, FileInput, MessageSquareText } from "lucide-react";

/**
 * Serve Mode - Bridge → Requests View
 *
 * Manage client intake forms and feedback collection:
 * - Intake questionnaires
 * - Feedback requests
 * - Client submissions
 *
 * Part of the Bridge multi-view section.
 */
export default async function BridgeRequestsPage() {
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
        title="Bridge"
        description="Manage your client portal and shared content"
        noBorder
      />

      <BridgeTabs />

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ClipboardList className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Requests & Forms Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Create intake forms, collect client feedback, and manage
              all client requests in one place.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileInput className="h-4 w-4" />
                <span>Intake forms</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquareText className="h-4 w-4" />
                <span>Feedback collection</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
