import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeRecordAction } from "@/app/_features/memory/records/executor";
import type { RecordActionResult } from "@/app/_features/memory/records/types";
import {
  filterActionableMemoryProposals,
  memoryProposalFingerprint,
  parseMemoryProposals,
  type MemoryProposal,
} from "../../types/memory-proposals";
import {
  loadKnownWorkspaceEntities,
  resolveMemoryProposals,
} from "./entity-resolver";
import { learnClientFromMemoryApply } from "./sender-profile-learn";

const SURFACE_ORDER: MemoryProposal["surface"][] = [
  "orgs",
  "people",
  "work",
  "meetings",
];

export interface ApplyMemoryPlanResult {
  success: boolean;
  error?: string;
  created?: Record<string, string[]>;
}

interface FindingRow {
  id: string;
  workspace_id: string;
  person_id: string | null;
  org_id: string | null;
  evidence: {
    source_id?: string;
    metadata?: Record<string, unknown>;
  } | null;
  state: string;
}

function defaultMeetingStart(datetime?: string): string {
  if (datetime) {
    const parsed = new Date(datetime);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(18, 0, 0, 0);
  return nextWeek.toISOString();
}

function getAppliedFingerprints(metadata: Record<string, unknown> | undefined): Set<string> {
  const raw = metadata?.memory_applied_fingerprints;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((v): v is string => typeof v === "string"));
}

export async function applyMemoryPlanForFinding(args: {
  workspaceId: string;
  userId: string;
  findingId: string;
  selectedProposalIndexes?: number[];
}): Promise<ApplyMemoryPlanResult> {
  const admin = createAdminClient();
  const { workspaceId, userId, findingId, selectedProposalIndexes } = args;

  const { data: finding, error: fetchError } = await admin
    .from("intelligence_findings")
    .select("id, workspace_id, person_id, org_id, evidence, state")
    .eq("id", findingId)
    .eq("workspace_id", workspaceId)
    .single();

  if (fetchError || !finding) {
    return { success: false, error: fetchError?.message ?? "Finding not found" };
  }

  const row = finding as FindingRow;
  const metadata = (row.evidence?.metadata ?? {}) as Record<string, unknown>;

  if (typeof metadata.memory_applied_at === "string") {
    return {
      success: true,
      created: (metadata.memory_applied_entities as Record<string, string[]>) ?? {},
    };
  }

  const rawProposals = metadata.memory_proposals;
  let proposals = filterActionableMemoryProposals(parseMemoryProposals(rawProposals));

  if (selectedProposalIndexes?.length) {
    proposals = selectedProposalIndexes
      .map((index) => proposals[index])
      .filter((p): p is MemoryProposal => Boolean(p));
  }

  if (proposals.length === 0) {
    return { success: false, error: "No actionable memory proposals on this finding" };
  }

  const fromEmail =
    typeof metadata.from_email === "string" ? metadata.from_email : undefined;
  const fromName =
    typeof metadata.from_name === "string" ? metadata.from_name : null;

  const knownEntities = await loadKnownWorkspaceEntities(admin, workspaceId);
  const resolved = resolveMemoryProposals(proposals, knownEntities, {
    fromEmail,
    fromName,
  });

  const appliedFingerprints = getAppliedFingerprints(metadata);
  const created: Record<string, string[]> = {
    orgs: [],
    people: [],
    work: [],
    meetings: [],
  };

  const entityIds: Partial<Record<MemoryProposal["surface"], string>> = {
    people: row.person_id ?? undefined,
    orgs: row.org_id ?? undefined,
  };

  for (const surface of SURFACE_ORDER) {
    const surfaceProposals = resolved.filter((p) => p.surface === surface);
    for (const proposal of surfaceProposals) {
      const fingerprint = memoryProposalFingerprint(proposal);
      if (appliedFingerprints.has(fingerprint)) continue;

      const entityId = await executeProposal({
        workspaceId,
        userId,
        proposal,
        entityIds,
        captureId: row.evidence?.source_id,
        findingId: row.id,
        fromEmail,
        fromName,
      });

      if (!entityId) {
        return {
          success: false,
          error: `Failed to apply ${proposal.surface} proposal`,
          created,
        };
      }

      entityIds[surface] = entityId;
      created[surface].push(entityId);
      appliedFingerprints.add(fingerprint);
    }
  }

  const captureId = row.evidence?.source_id;
  if (captureId) {
    const attachTarget =
      entityIds.people != null
        ? { target_type: "person" as const, target_id: entityIds.people }
        : entityIds.orgs != null
          ? { target_type: "org" as const, target_id: entityIds.orgs }
          : null;

    if (attachTarget) {
      await executeRecordAction(workspaceId, "system:attach-email", {
        email_id: captureId,
        target_type: attachTarget.target_type,
        target_id: attachTarget.target_id,
      }, userId);
    }
  }

  if (entityIds.people && entityIds.orgs) {
    await executeRecordAction(
      workspaceId,
      "system:link-person-org",
      { person_id: entityIds.people, org_id: entityIds.orgs },
      userId
    );
  }

  if (entityIds.orgs && entityIds.work) {
    await executeRecordAction(
      workspaceId,
      "system:link-org-work",
      { org_id: entityIds.orgs, work_id: entityIds.work },
      userId
    );
  }

  const updatedMetadata = {
    ...metadata,
    memory_applied_at: new Date().toISOString(),
    memory_applied_entities: created,
    memory_applied_fingerprints: [...appliedFingerprints],
  };

  const { error: updateError } = await admin
    .from("intelligence_findings")
    .update({
      evidence: {
        ...row.evidence,
        metadata: updatedMetadata,
      },
      state: "acted",
      corrected_at: new Date().toISOString(),
      corrected_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    return { success: false, error: updateError.message, created };
  }

  await learnClientFromMemoryApply({
    supabase: admin,
    workspaceId,
    userId,
    evidence: row.evidence,
  });

  return { success: true, created };
}

async function executeProposal(args: {
  workspaceId: string;
  userId: string;
  proposal: MemoryProposal;
  entityIds: Partial<Record<MemoryProposal["surface"], string>>;
  captureId?: string;
  findingId: string;
  fromEmail?: string;
  fromName?: string | null;
}): Promise<string | null> {
  const { workspaceId, userId, proposal, findingId, fromEmail, fromName } = args;

  if (proposal.action === "link" && proposal.hint.existing_match_id) {
    return proposal.hint.existing_match_id;
  }

  let result: RecordActionResult;

  switch (proposal.system_play) {
    case "system:create-org":
      result = await executeRecordAction(
        workspaceId,
        "system:create-org",
        {
          name: proposal.hint.name ?? "Unknown org",
          domain: proposal.hint.domain,
        },
        userId
      );
      break;

    case "system:create-person":
      result = await executeRecordAction(
        workspaceId,
        "system:create-person",
        {
          name: proposal.hint.name ?? fromName ?? fromEmail ?? "Unknown contact",
          email: fromEmail,
        },
        userId
      );
      break;

    case "system:create-work":
      result = await executeRecordAction(
        workspaceId,
        "system:create-work",
        { name: proposal.hint.name ?? "New work" },
        userId
      );
      break;

    case "system:create-meeting": {
      const startAt = defaultMeetingStart(proposal.hint.datetime);
      const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
      result = await executeRecordAction(
        workspaceId,
        "system:create-meeting",
        {
          title: proposal.hint.name ?? "Meeting",
          start_at: startAt,
          end_at: endAt,
          source_capture_id: args.captureId,
          external_id: `memory_plan:${findingId}:${memoryProposalFingerprint(proposal)}`,
        },
        userId
      );
      break;
    }

    default:
      return null;
  }

  if (!result.success || !result.entity_id) {
    console.error("[apply-memory-plan] record action failed:", result.error);
    return null;
  }

  return result.entity_id;
}
