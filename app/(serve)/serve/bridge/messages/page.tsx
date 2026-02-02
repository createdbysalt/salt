import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { BridgeTabs } from "../../components/BridgeTabs";
import { MessageSquare, Bell, Users } from "lucide-react";

/**
 * Serve Mode - Bridge → Messages View
 *
 * Client-facing communication threads:
 * - Messages visible to clients in their portal
 * - Separate from internal Studio messages
 *
 * Part of the Bridge multi-view section.
 */
export default async function BridgeMessagesPage() {
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
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Client Messaging Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Send and receive messages with clients directly through their portal.
              Keep all client communication organized and accessible.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Per-client threads</span>
              </div>
              <div className="flex items-center gap-1">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
