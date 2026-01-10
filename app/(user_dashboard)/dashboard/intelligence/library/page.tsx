import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function IntelligenceLibraryPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">Intelligence Library</h1>
            <Badge variant="secondary" className="font-semibold">
              🚧 Coming Q1-Q2 2026
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Searchable repository of all generated strategic + technical intelligence
          </p>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Centralized Intelligence Repository</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Library className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Intelligence Library Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              The Intelligence Library will be your searchable archive of all competitive analyses, 
              positioning strategies, performance audits, and technical intelligence reports—organized 
              by project, client, and type with powerful search and filtering.
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
            <CardTitle className="text-base">Natural Language Search</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Search intelligence using natural language queries, not just keywords.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Filtering</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Filter by type, client, project, date range, and custom tags.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-Project Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Discover patterns and insights across all your intelligence data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
