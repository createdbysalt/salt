import { getClientsWithMetrics } from "@/app/actions/clients/get-clients-with-metrics";
import { PipelineBoardView } from "@/app/_features/sales/components";
import { triggerBackgroundBookingSync } from "@/app/_features/meetings/calcom-sync";

/**
 * Sales Pipeline - Kanban board view of leads through the sales funnel
 * Stages: Inquiry → Discovery → Pitch → Active → Complete | On Hold | Lost
 */
export default async function PipelinePage() {
  // Trigger background sync for Cal.com bookings (non-blocking, debounced)
  triggerBackgroundBookingSync();

  // Fetch all clients for pipeline view
  const clientsWithMetrics = await getClientsWithMetrics({ view: "all" });

  // Filter to pipeline stages (exclude archived) and transform for the board
  const pipelineStages = ["lead", "discovery", "pitch", "active", "complete", "on_hold", "lost"];
  const leads = clientsWithMetrics
    .filter((client) => pipelineStages.includes(client.lifecycleStage || "lead"))
    .map((client) => ({
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      company: client.company,
      lifecycleStage: client.lifecycleStage || "lead",
      ltv: client.ltv,
    }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Track leads through your sales funnel
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PipelineBoardView leads={leads} />
      </div>
    </div>
  );
}
