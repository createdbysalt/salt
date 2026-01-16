import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Search, Sparkles } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";

export default async function TechnicalAuditsPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">Technical Audits</h1>
            <Badge variant="secondary" className="font-semibold">
              🚧 Coming Q1-Q2 2026
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Performance monitoring, SEO intelligence, and technical optimization
          </p>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Intelligence & Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Search className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Technical Audits Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Technical Audits will provide continuous performance monitoring, SEO intelligence, 
              and security scanning—proving ongoing value with data-backed insights that justify 
              $1k-3k/month retainer relationships through measurable improvements.
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
            <CardTitle className="text-base">Performance Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              24/7 Core Web Vitals tracking, page speed analysis, and regression detection.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keyword ranking tracking, technical SEO audits, and backlink analysis.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security & Accessibility</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vulnerability scanning, SSL monitoring, and WCAG compliance auditing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
