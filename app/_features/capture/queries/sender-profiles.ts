import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaptureSenderKind,
  CaptureSenderProfileRow,
  CaptureSenderProfileSource,
  SenderProfileRegistry,
  SenderProfileRegistryEntry,
} from "../types/sender-profiles";
import {
  emptySenderProfileRegistry,
  parseSenderEmail,
} from "../types/sender-profiles";

function rowToEntry(row: CaptureSenderProfileRow): SenderProfileRegistryEntry {
  return {
    kind: row.kind,
    vendorName: row.vendor_name ?? undefined,
    source: row.source,
    confidence: row.confidence,
  };
}

function shouldReplaceEntry(
  existing: SenderProfileRegistryEntry,
  incoming: SenderProfileRegistryEntry
): boolean {
  const sourcePriority: Record<CaptureSenderProfileSource, number> = {
    user_confirm: 100,
    user_dismiss: 90,
    manual: 80,
    auto_receipt: 50,
    auto_scan: 40,
  };

  const existingPriority = sourcePriority[existing.source] + existing.confidence;
  const incomingPriority = sourcePriority[incoming.source] + incoming.confidence;
  return incomingPriority >= existingPriority;
}

function addToRegistry(
  registry: SenderProfileRegistry,
  row: CaptureSenderProfileRow
): void {
  const entry = rowToEntry(row);
  const target =
    row.sender_key_type === "email"
      ? registry.byEmail
      : registry.byDomain;
  const existing = target.get(row.sender_key);
  if (!existing || shouldReplaceEntry(existing, entry)) {
    target.set(row.sender_key, entry);
  }
}

export async function loadSenderProfileRegistry(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<SenderProfileRegistry> {
  const registry = emptySenderProfileRegistry();

  const { data, error } = await supabase
    .from("capture_sender_profiles")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[sender-profiles] load failed:", error.message);
    return registry;
  }

  for (const row of (data ?? []) as CaptureSenderProfileRow[]) {
    addToRegistry(registry, row);
  }

  return registry;
}

export interface UpsertSenderProfileInput {
  workspaceId: string;
  fromEmail: string;
  kind: CaptureSenderKind;
  vendorName?: string;
  source: CaptureSenderProfileSource;
  confidence?: number;
  userId?: string;
  /** When true, store full email; otherwise registrable domain. */
  keyType?: "email" | "domain";
}

export async function upsertSenderProfile(
  supabase: SupabaseClient,
  input: UpsertSenderProfileInput
): Promise<void> {
  const { email, domain } = parseSenderEmail(input.fromEmail);
  if (!domain) return;

  const keyType = input.keyType ?? "domain";
  const senderKey = keyType === "email" ? email : domain;
  const confidence = input.confidence ?? (input.source.startsWith("user_") ? 95 : 75);

  const { data: existing, error: fetchError } = await supabase
    .from("capture_sender_profiles")
    .select("id, kind, source, confidence, evidence_count")
    .eq("workspace_id", input.workspaceId)
    .eq("sender_key_type", keyType)
    .eq("sender_key", senderKey)
    .maybeSingle();

  if (fetchError) {
    console.error("[sender-profiles] fetch for upsert failed:", fetchError.message);
    return;
  }

  if (existing) {
    const existingEntry: SenderProfileRegistryEntry = {
      kind: existing.kind as CaptureSenderKind,
      source: existing.source as CaptureSenderProfileSource,
      confidence: existing.confidence,
    };
    const incomingEntry: SenderProfileRegistryEntry = {
      kind: input.kind,
      vendorName: input.vendorName,
      source: input.source,
      confidence,
    };

    if (!shouldReplaceEntry(existingEntry, incomingEntry)) {
      const { error: bumpError } = await supabase
        .from("capture_sender_profiles")
        .update({
          evidence_count: (existing.evidence_count ?? 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (bumpError) {
        console.error("[sender-profiles] evidence bump failed:", bumpError.message);
      }
      return;
    }

    const { error: updateError } = await supabase
      .from("capture_sender_profiles")
      .update({
        kind: input.kind,
        vendor_name: input.vendorName ?? null,
        source: input.source,
        confidence,
        evidence_count: (existing.evidence_count ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[sender-profiles] update failed:", updateError.message);
    }
    return;
  }

  const { error: insertError } = await supabase.from("capture_sender_profiles").insert({
    workspace_id: input.workspaceId,
    sender_key: senderKey,
    sender_key_type: keyType,
    kind: input.kind,
    vendor_name: input.vendorName ?? null,
    source: input.source,
    confidence,
    evidence_count: 1,
    created_by: input.userId ?? null,
  });

  if (insertError) {
    console.error("[sender-profiles] insert failed:", insertError.message);
  }
}
