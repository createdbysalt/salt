import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { FileText, Sparkles } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";

export default async function StrategicReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Strategic Reports</h1>
            <Badge variant="secondary" className="font-semibold">
              🚧 Coming Q1-Q2 2026
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Competitive analyses, positioning strategies, and market intelligence
          </p>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Intelligence Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Strategic Reports Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Strategic Reports will deliver AI-powered competitive intelligence, brand positioning strategies, 
              and market research—the same insights that strategic consultants charge $5k-10k for, generated 
              in 10-15 minutes and ready to present to clients.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Early adopters will get access as features launch</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitive Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              12-15 page analyses of competitors with strategic opportunities identified.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Positioning Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Brand positioning frameworks, messaging hierarchies, and differentiation strategies.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Market Research</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Industry trends, customer needs analysis, and go-to-market recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
