import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { PipelineBoard } from "../../pipeline/PipelineBoard";
import { WorkTabs } from "../../components/WorkTabs";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

export type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

export interface PipelineClient {
  id: string;
  name: string;
  contactEmail: string | null;
  lifecycleStage: LifecycleStage;
  stageOrderIndex: number;
  projectCount: number;
  healthScore: number;
  stageEnteredAt: string;
  createdAt: string;
}

const LIFECYCLE_STAGES: LifecycleStage[] = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];

/**
 * Studio Mode - Work → Pipeline View
 *
 * Kanban board for client lifecycle management.
 * Part of the Work multi-view section.
 */
export default async function WorkPipelinePage() {
  const { studio, supabase } = await getStudioContext();

  // Fetch clients with lifecycle data, grouped by stage
  const { data: clients, error } = await supabase
    .from("clients")
    .select(`
      id,
      name,
      contact_email,
      lifecycle_stage,
      stage_order_index,
      created_at,
      updated_at
    `)
    .eq("studio_id", studio.id)
    .not("lifecycle_stage", "eq", "archived")
    .order("stage_order_index", { ascending: true });

  if (error) {
    console.error("Error fetching pipeline clients:", error);
  }

  // Fetch project counts for each client
  const clientIds = (clients || []).map((c: any) => c.id);
  const { data: projectCounts } = clientIds.length > 0
    ? await supabase
        .from("projects")
        .select("client_id")
        .in("client_id", clientIds)
    : { data: [] };

  // Count projects per client
  const projectCountMap = (projectCounts || []).reduce((acc: Record<string, number>, p: any) => {
    acc[p.client_id] = (acc[p.client_id] || 0) + 1;
    return acc;
  }, {});

  // Transform and group clients by stage
  const pipelineClients: PipelineClient[] = (clients || []).map((client: any) => ({
    id: client.id,
    name: client.name,
    contactEmail: client.contact_email,
    lifecycleStage: client.lifecycle_stage || "lead",
    stageOrderIndex: client.stage_order_index || 0,
    projectCount: projectCountMap[client.id] || 0,
    healthScore: 75, // Default health score - will be calculated properly
    stageEnteredAt: client.updated_at,
    createdAt: client.created_at,
  }));

  // Group clients by stage
  const clientsByStage: Record<LifecycleStage, PipelineClient[]> = {
    lead: [],
    discovery: [],
    pitch: [],
    active: [],
    complete: [],
    on_hold: [],
    lost: [],
  };

  pipelineClients.forEach((client) => {
    const stage = client.lifecycleStage as LifecycleStage;
    if (clientsByStage[stage]) {
      clientsByStage[stage].push(client);
    }
  });

  // Sort each stage by order index
  Object.keys(clientsByStage).forEach((stage) => {
    clientsByStage[stage as LifecycleStage].sort(
      (a, b) => a.stageOrderIndex - b.stageOrderIndex
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Work"
        description="Manage your projects, clients, and pipeline"
        noBorder
      />

      {/* Work Section Tabs */}
      <WorkTabs />

      {/* Pipeline Board */}
      <PipelineBoard
        clientsByStage={clientsByStage}
        stages={LIFECYCLE_STAGES}
      />
    </div>
  );
}
