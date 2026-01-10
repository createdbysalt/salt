import { getTenantContext } from "@/libs/tenancy";
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BridgeSettingsPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/bridge/login");
  }

  if (!context.client) {
    redirect("/bridge/select");
  }

  const supabase = await createClient();
  
  // Get user data
  const { data: { user } } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
                   user?.user_metadata?.name?.split(" ")[0] ||
                   user?.email?.split("@")[0];

  // Get client details
  const { data: client } = await supabase
    .from("clients")
    .select("name, contact_email, contact_phone")
    .eq("id", context.client.id)
    .single();

  // Get studio details
  const { data: studio } = await supabase
    .from("clients")
    .select(`
      studio_id,
      studios!inner(name)
    `)
    .eq("id", context.client.id)
    .single();

  return (
    <div className="space-y-8">
      {/* Page Greeting */}
      <PageGreetingHeader page="home" viewer={{ firstName }} variant="bridge" titleOverride="Settings" />

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Company Name</div>
            <div className="font-medium">{client?.name || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Email</div>
            <div className="font-medium">{user?.email || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Contact Email</div>
            <div className="font-medium">{client?.contact_email || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Contact Phone</div>
            <div className="font-medium">{client?.contact_phone || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Role</div>
            <Badge variant="default">{context.client.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Studio Section */}
      {studio && (
        <Card>
          <CardHeader>
            <CardTitle>Your Studio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Studio Name</div>
              <div className="font-medium">{(studio.studios as any)?.name || "—"}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              For support or questions, please contact your studio directly.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


