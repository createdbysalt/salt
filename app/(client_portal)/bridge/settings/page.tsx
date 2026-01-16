import { getTenantContext } from "@/app/_lib/tenancy";
import { createClient } from "@/app/_lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { User, Building2, Mail, Phone, Shield, LogOut } from "lucide-react";
import { Separator } from "@/app/_components/ui/separator";

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
      studios!inner(name, contact_email)
    `)
    .eq("id", context.client.id)
    .single();

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and information
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Full Name</span>
              </div>
              <div className="font-medium text-lg">{fullName || "—"}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <div className="font-medium text-lg">{user?.email || "—"}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Account Status</span>
            </div>
            <Badge variant="default" className="text-sm">
              {context.client.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Details about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Company Name</span>
              </div>
              <div className="font-medium text-lg">{client?.name || "—"}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Contact Email</span>
              </div>
              <div className="font-medium text-lg">{client?.contact_email || "—"}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Phone Number</span>
              </div>
              <div className="font-medium text-lg">{client?.contact_phone || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Studio Section */}
      {studio && (
        <Card>
          <CardHeader>
            <CardTitle>Your Studio</CardTitle>
            <CardDescription>
              Information about the agency managing your projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Studio Name</div>
                <div className="font-medium text-lg">{(studio.studios as any)?.name || "—"}</div>
              </div>
              
              {(studio.studios as any)?.contact_email && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Support Email</div>
                  <div className="font-medium text-lg">{(studio.studios as any).contact_email}</div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Have questions or need support? Contact your studio directly using the information above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
