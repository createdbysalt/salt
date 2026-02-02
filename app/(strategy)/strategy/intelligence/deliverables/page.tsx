import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { Card, CardContent } from "@/app/_components/ui/card";
import { PageHeader } from "@repo/patterns";
import { IntelligenceNavTabs } from "../../components/IntelligenceNavTabs";
import { FileOutput, FileText, Presentation, Palette } from "lucide-react";

export const metadata = {
  title: "Deliverables | Salt",
  description: "Agent-generated outputs and deliverables",
};

/**
 * Strategy Mode - Intelligence → Deliverables View
 *
 * Agent-generated outputs:
 * - Copy and content
 * - Wireframes
 * - Pitch decks
 * - Design systems
 *
 * Part of the Intelligence multi-view section.
 */
export default async function IntelligenceDeliverablesPage() {
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
        title="Intelligence"
        description="Strategic and technical intelligence across all projects"
        noBorder
      />

      <IntelligenceNavTabs />

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileOutput className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Deliverables Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              AI-generated outputs including copy, wireframes, pitch decks,
              and design systems—all ready for client review and delivery.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Copy & Content</span>
              </div>
              <div className="flex items-center gap-1">
                <Presentation className="h-4 w-4" />
                <span>Pitch Decks</span>
              </div>
              <div className="flex items-center gap-1">
                <Palette className="h-4 w-4" />
                <span>Design Systems</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
