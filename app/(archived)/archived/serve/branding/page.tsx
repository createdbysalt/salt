import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { BrandingEditor } from "@/app/_features/serve/components/branding-editor";
import { DomainWizard } from "@/app/_features/serve/components/domain-wizard";
import { DomainStatusCard } from "@/app/_features/serve/components/domain-status-card";
import { getBridgeBranding, getStudioDomains } from "@/app/_features/serve/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Palette, Globe, Eye } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";

/**
 * Serve Mode - Portal Branding
 *
 * Customize the look and feel of client portals:
 * - Logo upload (light/dark modes)
 * - Brand colors
 * - Custom domain configuration
 * - Footer customization
 */
export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Get user's studio
  const { data: membership } = await supabase
    .from("studio_members")
    .select("studio_id, studios(id, name, bridge_branding)")
    .eq("user_id", user.id)
    .single();

  if (!membership?.studio_id) {
    redirect("/studio");
  }

  const studioId = membership.studio_id;
  const studioName = (membership.studios as any)?.name || "Your Studio";

  // Get current branding config
  const { branding } = await getBridgeBranding(studioId);

  // Get configured domains
  const { domains } = await getStudioDomains(studioId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bridge Branding</h1>
          <p className="text-muted-foreground mt-1">
            Customize how your client portal looks and feels
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/serve/preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview Bridge
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Visual Identity
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-2">
            <Globe className="h-4 w-4" />
            Custom Domain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <BrandingEditor
            studioId={studioId}
            initialBranding={branding || {}}
          />
        </TabsContent>

        <TabsContent value="domain" className="mt-6 space-y-6">
          {/* Existing Domains */}
          {domains.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Configured Domains</h2>
              {domains.map((domain) => (
                <DomainStatusCard key={domain.id} domain={domain} />
              ))}
            </div>
          )}

          {/* Add New Domain */}
          <DomainWizard studioId={studioId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
