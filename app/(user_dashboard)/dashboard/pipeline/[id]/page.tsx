import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { PageHeader } from "@repo/patterns";
import { ClientDetailContent } from "./ClientDetailContent";
import type { LifecycleStage } from "../page";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  discovery: "Discovery",
  pitch: "Pitch",
  active: "Active",
  complete: "Complete",
  on_hold: "On Hold",
  lost: "Lost",
};

export default async function PipelineClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { studio, supabase } = await getStudioContext();

  // Get client details
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Get all clients in the same stage for navigation
  const { data: stageClients } = await supabase
    .from("clients")
    .select("id, name, stage_order_index")
    .eq("studio_id", studio.id)
    .eq("lifecycle_stage", client.lifecycle_stage)
    .order("stage_order_index", { ascending: true });

  // Find current position and prev/next
  const sortedClients = stageClients || [];
  const currentIndex = sortedClients.findIndex((c) => c.id === id);
  const prevClient = currentIndex > 0 ? sortedClients[currentIndex - 1] : null;
  const nextClient = currentIndex < sortedClients.length - 1 ? sortedClients[currentIndex + 1] : null;

  // Get project count
  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id);

  const stage = (client.lifecycle_stage || "lead") as LifecycleStage;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pipeline"
        description="Track clients through your lifecycle stages"
        noBorder
      />

      {/* Detail card */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Breadcrumb + navigation bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard/pipeline"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Pipeline
          </Link>
          <span className="text-muted-foreground">›</span>
          <span className="text-muted-foreground">{STAGE_LABELS[stage]}</span>
          <span className="text-muted-foreground">›</span>
          <span className="font-medium">{client.name}</span>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {sortedClients.length}
          </span>
          <div className="flex items-center gap-1">
            {prevClient ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link href={`/dashboard/pipeline/${prevClient.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {nextClient ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link href={`/dashboard/pipeline/${nextClient.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        </div>

        {/* Content */}
        <ClientDetailContent
        client={{
          id: client.id,
          name: client.name,
          contactEmail: client.contact_email,
          contactPhone: client.contact_phone,
          notes: client.notes,
          lifecycleStage: stage,
          projectCount: projectCount || 0,
          createdAt: client.created_at,
          updatedAt: client.updated_at,
        }}
        />
      </div>
    </div>
  );
}
