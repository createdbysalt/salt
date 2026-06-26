import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkHealthSignals } from "./types";

export async function gatherWorkHealthSignals(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  workId: string;
  clientId: string | null;
  status: string;
  stageEnteredAt: string | null;
  deadline: string | null;
  updatedAt: string | null;
}): Promise<WorkHealthSignals> {
  const signals: WorkHealthSignals = {
    status: input.status,
    stageEnteredAt: input.stageEnteredAt,
    deadline: input.deadline,
    updatedAt: input.updatedAt,
    linkedPeopleCount: 0,
    overdueInvoiceCount: 0,
  };

  const { count: relationPeopleCount } = await input.supabase
    .from("entity_relations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .or(
      `and(from_entity_type.in.(work,project),from_entity_id.eq.${input.workId},to_entity_type.eq.person),and(to_entity_type.in.(work,project),to_entity_id.eq.${input.workId},from_entity_type.eq.person)`,
    );

  signals.linkedPeopleCount = relationPeopleCount ?? 0;

  if (!input.clientId) {
    return signals;
  }

  const { count: overdueInvoiceCount } = await input.supabase
    .from("portal_invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", input.clientId)
    .in("status", ["overdue", "sent"])
    .lt("due_date", new Date().toISOString());

  signals.overdueInvoiceCount = overdueInvoiceCount ?? 0;

  return signals;
}
