import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ProjectIntelligencePage({
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
    <div className="space-y-8">
      {/* Generate Intelligence CTA */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Generate New Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Create strategic reports, performance audits, and competitive analyses
              </p>
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Generate Intelligence
              <Badge variant="outline" className="ml-2 text-xs">
                🚧
              </Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Intelligence */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Strategic Intelligence</h2>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">No strategic intelligence yet</p>
              <p className="text-sm max-w-md mx-auto">
                Strategic intelligence includes competitive analyses, brand positioning strategies,
                and market research reports
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Intelligence */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Technical Intelligence</h2>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">No technical intelligence yet</p>
              <p className="text-sm max-w-md mx-auto">
                Technical intelligence includes performance audits, SEO analyses, security scans,
                and technical recommendations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
