import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertSenderProfile } from "../../queries/sender-profiles";
import type { FindingType } from "../../types/intelligence-findings";
import {
  filterActionableMemoryProposals,
  parseMemoryProposals,
} from "../../types/memory-proposals";
import type { EmailSenderContext } from "./email-sender-context";

const REVENUE_FINDING_TYPES = new Set<FindingType>([
  "revenue_buying",
  "revenue_closing",
  "revenue_upsell",
  "revenue_risk",
]);

const MEMORY_ONLY_DISMISS_TYPES = new Set<FindingType>([
  "new_org",
  "new_person",
  "needs_routing",
]);

const AUTO_LEARN_VENDOR_REASONS = new Set([
  "receipt_billing_signal",
  "known_vendor_domain",
  "payment_rail_self_billing",
  "google_vendor_billing",
  "vendor_brand_in_subject",
  "vendor_display_name",
]);

function metadataFromEvidence(evidence: unknown): Record<string, unknown> | null {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return null;
  }
  const metadata = (evidence as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

export function extractFromEmailFromEvidence(
  evidence: unknown
): string | null {
  const metadata = metadataFromEvidence(evidence);
  const fromEmail = metadata?.from_email;
  if (typeof fromEmail !== "string" || !fromEmail.includes("@")) {
    return null;
  }
  return fromEmail.toLowerCase().trim();
}

export function shouldLearnVendorOnDismiss(args: {
  findingType: string;
  evidence: unknown;
}): boolean {
  const { findingType, evidence } = args;
  const typed = findingType as FindingType;

  if (REVENUE_FINDING_TYPES.has(typed)) {
    return false;
  }

  const metadata = metadataFromEvidence(evidence);
  if (!metadata) return MEMORY_ONLY_DISMISS_TYPES.has(typed);

  const proposals = filterActionableMemoryProposals(
    parseMemoryProposals(metadata.memory_proposals)
  );

  if (MEMORY_ONLY_DISMISS_TYPES.has(typed)) {
    return proposals.length > 0 || typed !== "needs_routing";
  }

  if (proposals.some((p) => p.surface === "orgs" || p.surface === "people")) {
    return true;
  }

  return false;
}

export async function learnVendorFromDismiss(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  findingType: string;
  evidence: unknown;
  vendorName?: string;
}): Promise<void> {
  if (
    !shouldLearnVendorOnDismiss({
      findingType: args.findingType,
      evidence: args.evidence,
    })
  ) {
    return;
  }

  const fromEmail = extractFromEmailFromEvidence(args.evidence);
  if (!fromEmail) return;

  const metadata = metadataFromEvidence(args.evidence);
  const vendorName =
    args.vendorName ??
    (typeof metadata?.vendor_name === "string" ? metadata.vendor_name : undefined);

  await upsertSenderProfile(args.supabase, {
    workspaceId: args.workspaceId,
    fromEmail,
    kind: "vendor_saas",
    vendorName,
    source: "user_dismiss",
    confidence: 95,
    userId: args.userId,
    keyType: "domain",
  });
}

export async function learnClientFromMemoryApply(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  evidence: unknown;
}): Promise<void> {
  const fromEmail = extractFromEmailFromEvidence(args.evidence);
  if (!fromEmail) return;

  await upsertSenderProfile(args.supabase, {
    workspaceId: args.workspaceId,
    fromEmail,
    kind: "client",
    source: "user_confirm",
    confidence: 95,
    userId: args.userId,
    keyType: "domain",
  });
}

export async function learnVendorFromClassification(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  fromEmail: string;
  sender: EmailSenderContext;
  dryRun?: boolean;
}): Promise<void> {
  if (args.dryRun) return;
  if (args.sender.kind !== "vendor_saas") return;
  if (args.sender.reason === "workspace_sender_profile") return;
  if (!args.sender.reason || !AUTO_LEARN_VENDOR_REASONS.has(args.sender.reason)) {
    return;
  }

  const source =
    args.sender.reason === "receipt_billing_signal" ? "auto_receipt" : "auto_scan";

  await upsertSenderProfile(args.supabase, {
    workspaceId: args.workspaceId,
    fromEmail: args.fromEmail,
    kind: "vendor_saas",
    vendorName: args.sender.vendorName,
    source,
    confidence: source === "auto_receipt" ? 85 : 70,
    keyType: "domain",
  });
}
