import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Palette, Globe, Image } from "lucide-react";

/**
 * Serve Mode - Portal Branding
 *
 * Customize the look and feel of client portals:
 * - Logo upload
 * - Brand colors
 * - Custom domain configuration
 */
export default async function BrandingPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Portal Branding</h1>
        <p className="text-muted-foreground mt-1">
          Customize how your client portal looks and feels
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Palette className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Portal Branding Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Customize your client portal with your brand colors, logo,
              and even a custom domain for a fully white-labeled experience.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Image className="h-4 w-4" />
                <span>Logo & colors</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>Custom domain</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
