import type { SupabaseClient } from "@supabase/supabase-js";
import { extractEmailToAnalyze } from "../extract-capture-email";
import type { FindingType } from "../../types/intelligence-findings";
import {
  filterActionableMemoryProposals,
  parseMemoryProposals,
  type MemoryProposal,
} from "../../types/memory-proposals";
import {
  classifyEmailSender,
  filterMemoryProposalsForSender,
  inferVendorSenderContext,
  isKnownSaasVendorEmail,
  isVendorOrgName,
  type EmailSenderContext,
} from "./email-sender-context";
import { persistCaptureIntelligenceOutcome } from "./capture-intelligence-persistence";
import type { SenderProfileRegistry } from "../../types/sender-profiles";

const REAL_BUSINESS_FINDING_TYPES = new Set<FindingType>([
  "revenue_buying",
  "revenue_closing",
  "revenue_upsell",
  "revenue_risk",
  "pending_question",
  "pending_reply",
  "referral",
]);

export interface RepairVendorFindingsResult {
  findingsUpdated: number;
  findingsDismissed: number;
}

interface FindingRow {
  id: string;
  finding_type: string;
  title: string;
  evidence: unknown;
}

function evidenceMetadata(
  evidence: unknown
): Record<string, unknown> | null {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return null;
  }
  const metadata = (evidence as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function captureIdFromEvidence(evidence: unknown): string | null {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return null;
  }
  const sourceId = (evidence as { source_id?: unknown }).source_id;
  return typeof sourceId === "string" ? sourceId : null;
}

function senderInputFromMetadata(
  metadata: Record<string, unknown>,
  subjectFallback?: string
) {
  const fromEmail = metadata.from_email;
  if (typeof fromEmail !== "string" || !fromEmail.includes("@")) {
    return null;
  }
  return {
    from_email: fromEmail,
    from_name:
      typeof metadata.from_name === "string" ? metadata.from_name : null,
    subject: subjectFallback ?? "",
    body_text:
      typeof metadata.body_snippet === "string" ? metadata.body_snippet : "",
    snippet:
      typeof metadata.body_snippet === "string" ? metadata.body_snippet : "",
  };
}

function resolveSenderForRepair(args: {
  senderInput: {
    from_email: string;
    from_name?: string | null;
    subject?: string;
    body_text?: string | null;
    snippet?: string;
  };
  findingTitle: string;
  metadata: Record<string, unknown>;
  storedProposals: MemoryProposal[];
  senderRegistry?: SenderProfileRegistry;
}): EmailSenderContext {
  const classified = classifyEmailSender(
    {
      from_email: args.senderInput.from_email,
      from_name: args.senderInput.from_name,
      subject: args.senderInput.subject ?? "",
      body_text: args.senderInput.body_text,
      snippet: args.senderInput.snippet,
    },
    { registry: args.senderRegistry }
  );

  if (classified.kind === "vendor_saas" || classified.kind === "payment_rail") {
    return classified;
  }

  const inferred = inferVendorSenderContext({
    fromEmail: args.senderInput.from_email,
    fromName: args.senderInput.from_name,
    subject: args.senderInput.subject,
    title: args.findingTitle,
    proposalHintNames: args.storedProposals
      .map((p) => p.hint.name)
      .filter((name): name is string => Boolean(name)),
    registry: args.senderRegistry,
  });

  return inferred ?? classified;
}

function proposalsImplyVendorTool(proposals: MemoryProposal[]): boolean {
  return proposals.some((proposal) => {
    const name = proposal.hint.name ?? "";
    const domain = proposal.hint.domain ?? "";
    if (domain && isKnownSaasVendorEmail(`placeholder@${domain}`)) return true;
    return isVendorOrgName(name);
  });
}

function hasRealBusinessSignal(findingType: string): boolean {
  return REAL_BUSINESS_FINDING_TYPES.has(findingType as FindingType);
}

function countUnderlyingBusinessSignals(metadata: Record<string, unknown>): number {
  const underlying = metadata.underlying_findings;
  if (!Array.isArray(underlying)) return 0;
  return underlying.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const type = (row as { type?: unknown }).type;
    return typeof type === "string" && hasRealBusinessSignal(type);
  }).length;
}

export function shouldDismissVendorMisclassifiedFinding(args: {
  findingType: string;
  sender: EmailSenderContext;
  filteredProposals: MemoryProposal[];
  metadata: Record<string, unknown>;
  storedProposals?: MemoryProposal[];
}): boolean {
  const { findingType, sender, filteredProposals, metadata, storedProposals = [] } = args;

  if (sender.kind === "payment_rail") return false;

  const vendorContext =
    sender.kind === "vendor_saas"
      ? sender
      : proposalsImplyVendorTool(storedProposals)
        ? ({ kind: "vendor_saas" as const, reason: "vendor_proposals" })
        : null;

  if (!vendorContext) return false;

  if (metadata.payment_payer_hint) return false;
  if (hasRealBusinessSignal(findingType)) return false;
  if (countUnderlyingBusinessSignals(metadata) > 0) return false;

  if (filteredProposals.length > 0) {
    const onlyBilling = filteredProposals.every((p) => p.surface === "billing");
    if (!onlyBilling) return false;
  }

  return true;
}

function mergeEvidenceMetadata(
  evidence: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const base =
    evidence && typeof evidence === "object" && !Array.isArray(evidence)
      ? (evidence as Record<string, unknown>)
      : {};
  const metadata = evidenceMetadata(evidence) ?? {};
  return {
    ...base,
    metadata: {
      ...metadata,
      ...patch,
    },
  };
}

/**
 * Retroactively fix findings created before vendor/subscription filtering.
 * Runs without LLM — re-classifies sender from stored capture + evidence.
 */
export async function repairVendorFindings(
  workspaceId: string,
  supabase: SupabaseClient,
  options: { dryRun?: boolean; senderRegistry?: SenderProfileRegistry } = {}
): Promise<RepairVendorFindingsResult> {
  const { dryRun = false, senderRegistry } = options;
  const result: RepairVendorFindingsResult = {
    findingsUpdated: 0,
    findingsDismissed: 0,
  };

  const { data: findings, error } = await supabase
    .from("intelligence_findings")
    .select("id, finding_type, title, evidence")
    .eq("workspace_id", workspaceId)
    .eq("state", "needs_you");

  if (error || !findings?.length) {
    return result;
  }

  const captureIds = [
    ...new Set(
      (findings as FindingRow[])
        .map((f) => captureIdFromEvidence(f.evidence))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const captureById = new Map<
    string,
    {
      id: string;
      raw_payload: Record<string, unknown>;
      extracted_data: unknown;
    }
  >();

  if (captureIds.length > 0) {
    const { data: captures } = await supabase
      .from("capture_events")
      .select("id, raw_payload, extracted_data")
      .in("id", captureIds);

    for (const row of captures ?? []) {
      captureById.set(row.id, row as typeof captureById extends Map<string, infer V> ? V : never);
    }
  }

  for (const finding of findings as FindingRow[]) {
    const metadata = evidenceMetadata(finding.evidence) ?? {};

    const captureId = captureIdFromEvidence(finding.evidence);
    const capture = captureId ? captureById.get(captureId) : undefined;

    let senderInput = capture
      ? extractEmailToAnalyze(
          capture.id,
          capture.raw_payload,
          capture.extracted_data as Parameters<typeof extractEmailToAnalyze>[2]
        )
      : null;

    if (!senderInput) {
      senderInput = senderInputFromMetadata(metadata, finding.title) as typeof senderInput;
    }

    if (!senderInput) {
      const inferredOnly = inferVendorSenderContext({
        title: finding.title,
        proposalHintNames: filterActionableMemoryProposals(
          parseMemoryProposals(metadata.memory_proposals)
        )
          .map((p) => p.hint.name)
          .filter((name): name is string => Boolean(name)),
        registry: senderRegistry,
      });
      if (!inferredOnly) continue;
      senderInput = {
        from_email: "unknown@unknown.local",
        from_name: null,
        subject: finding.title,
        body_text: "",
        snippet: "",
      };
    }

    const storedProposals = filterActionableMemoryProposals(
      parseMemoryProposals(metadata.memory_proposals)
    );

    const sender = resolveSenderForRepair({
      senderInput,
      findingTitle: finding.title,
      metadata,
      storedProposals,
      senderRegistry,
    });

    const vendorSender: EmailSenderContext =
      sender.kind === "vendor_saas"
        ? sender
        : proposalsImplyVendorTool(storedProposals)
          ? { kind: "vendor_saas", reason: "vendor_proposals_repair" }
          : sender;

    const filteredProposals = filterMemoryProposalsForSender(
      storedProposals,
      vendorSender
    );

    const proposalsChanged =
      filteredProposals.length !== storedProposals.length ||
      JSON.stringify(filteredProposals) !== JSON.stringify(storedProposals);

    const senderMetaChanged =
      metadata.sender_kind !== vendorSender.kind ||
      metadata.vendor_name !== vendorSender.vendorName;

    const shouldDismiss = shouldDismissVendorMisclassifiedFinding({
      findingType: finding.finding_type,
      sender: vendorSender,
      filteredProposals,
      metadata,
      storedProposals,
    });

    if (!shouldDismiss && !proposalsChanged && !senderMetaChanged) {
      continue;
    }

    if (shouldDismiss) {
      if (!dryRun) {
        const { error: dismissError } = await supabase
          .from("intelligence_findings")
          .update({
            state: "dismissed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", finding.id);

        if (dismissError) {
          console.error(
            `[repair-vendor-findings] Failed to dismiss ${finding.id}:`,
            dismissError.message
          );
          continue;
        }

        if (captureId) {
          await persistCaptureIntelligenceOutcome(supabase, captureId, "no_signal", {
            dryRun: false,
          });
        }
      }

      result.findingsDismissed++;
      continue;
    }

    const updatedEvidence = mergeEvidenceMetadata(finding.evidence, {
      sender_kind: vendorSender.kind,
      vendor_name: vendorSender.vendorName,
      memory_proposals: filteredProposals,
      vendor_repaired_at: new Date().toISOString(),
    });

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("intelligence_findings")
        .update({
          evidence: updatedEvidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", finding.id);

      if (updateError) {
        console.error(
          `[repair-vendor-findings] Failed to update ${finding.id}:`,
          updateError.message
        );
        continue;
      }
    }

    result.findingsUpdated++;
  }

  return result;
}
