import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { PageHeader } from "@repo/patterns";
import { Eye, Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import Link from "next/link";

/**
 * Serve Mode - Preview Bridge
 *
 * Preview how clients see their Bridge portal.
 * Opens a modal overlay or full-screen preview.
 */
export default async function PreviewBridgePage() {
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
    .limit(20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preview Bridge"
        description="See your client portal through your clients' eyes"
        noBorder
      />

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Eye className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Portal Preview</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Preview how your clients experience The Bridge. Select a client
              and device size to see exactly what they see.
            </p>

            {/* Device Selection */}
            <div className="flex items-center gap-2 mb-6">
              <Button variant="outline" size="sm" className="gap-2">
                <Monitor className="h-4 w-4" />
                Desktop
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Tablet className="h-4 w-4" />
                Tablet
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile
              </Button>
            </div>

            {/* Client Selection */}
            {clients && clients.length > 0 ? (
              <div className="w-full max-w-md space-y-2">
                <p className="text-sm font-medium mb-3">Select a client to preview:</p>
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.contact_email}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2" disabled>
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-4">
                  Full preview functionality coming Q2 2026
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No clients yet. Add clients in Studio mode to preview their portal.
                </p>
                <Button asChild variant="outline">
                  <Link href="/studio/work/clients">Go to Clients</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
