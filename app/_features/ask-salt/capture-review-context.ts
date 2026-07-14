import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import type { EnrichedMetadata } from "@/app/_features/capture/services/enrichment/types";
import {
  type CaptureCategory,
  categoryFromEnrichment,
} from "@/app/_features/capture/services/intelligence/capture-intelligence-outcome";

export interface CaptureReviewContext {
  capture_id: string;
  workspace_id: string;

  source_type: string;
  capture_type: string;
  title: string | null;
  occurred_at: string;

  sender?: {
    email: string | null;
    name: string | null;
    domain: string | null;
  };
  recipients?: string[];

  signals_matched: string[];
  category: CaptureCategory;

  linked_records: Array<{
    surface: string;
    entity_id: string;
    entity_label: string;
    match_type: string;
    confidence: number;
  }>;

  play_fit: Record<
    string,
    {
      score: number;
      threshold?: number;
      meets_threshold?: boolean;
      reason: string;
    }
  >;

  plays_dispatched: Array<{
    play_slug: string;
    play_name: string;
    play_run_id: string;
    state: string;
  }>;

  watches_triggered: Array<{
    entity_id: string;
    entity_label: string;
    surface: string;
    match_type: string;
  }>;

  deep_link: string | null;
  content_snippet?: string | null;
}

function extractDomain(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : null;
}

export async function loadCaptureReviewContext(
  captureId: string,
  workspaceId: string
): Promise<CaptureReviewContext | null> {
  const supabase = await createClient();

  const { data: capture, error } = await supabase
    .from("capture_events")
    .select(
      `
      id,
      workspace_id,
      title,
      capture_type,
      source_type,
      created_at,
      extracted_data,
      enriched_metadata,
      state
    `
    )
    .eq("id", captureId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !capture) {
    return null;
  }

  const enriched = capture.enriched_metadata as EnrichedMetadata | null;
  const extracted = capture.extracted_data as Record<string, unknown> | null;

  const senderEmail = enriched?.sender?.email ?? (extracted?.sender_email as string | null) ?? null;
  const senderName = enriched?.sender?.name ?? (extracted?.sender_name as string | null) ?? null;

  const category = categoryFromEnrichment(enriched, "awaiting_scan");

  const recipients: string[] = [];
  if (enriched?.recipients?.to) recipients.push(...enriched.recipients.to);
  if (enriched?.recipients?.cc) recipients.push(...enriched.recipients.cc);

  return {
    capture_id: capture.id,
    workspace_id: capture.workspace_id,
    source_type: capture.source_type,
    capture_type: capture.capture_type,
    title: capture.title,
    occurred_at: capture.created_at,
    sender: {
      email: senderEmail,
      name: senderName,
      domain: extractDomain(senderEmail),
    },
    recipients: recipients.length > 0 ? recipients : undefined,
    signals_matched: enriched?.signals_matched ?? [],
    category,
    linked_records: (enriched?.linked_records ?? []).map((r) => ({
      surface: r.surface,
      entity_id: r.entity_id,
      entity_label: r.entity_label,
      match_type: r.match_type,
      confidence: r.confidence,
    })),
    play_fit: enriched?.play_fit ?? {},
    plays_dispatched: (enriched?.plays_dispatched ?? []).map((p) => ({
      play_slug: p.play_slug,
      play_name: p.play_name,
      play_run_id: p.play_run_id,
      state: p.state,
    })),
    watches_triggered: (enriched?.watches_triggered ?? []).map((w) => ({
      entity_id: w.entity_id,
      entity_label: w.entity_label,
      surface: w.surface,
      match_type: w.match_type,
    })),
    deep_link: enriched?.deep_link ?? null,
    content_snippet: (extracted?.snippet as string) ?? (extracted?.body_preview as string) ?? null,
  };
}

export function formatCaptureContextForPrompt(ctx: CaptureReviewContext): string {
  const lines: string[] = [
    `## Capture Context`,
    ``,
    `**Source:** ${ctx.source_type} (${ctx.capture_type})`,
    `**Title:** ${ctx.title ?? "Untitled"}`,
    `**When:** ${new Date(ctx.occurred_at).toLocaleString()}`,
    `**Category:** ${ctx.category}`,
  ];

  if (ctx.sender?.email) {
    lines.push(`**Sender:** ${ctx.sender.name ?? ctx.sender.email} <${ctx.sender.email}>`);
  }

  if (ctx.signals_matched.length > 0) {
    lines.push(`**Signals:** ${ctx.signals_matched.join(", ")}`);
  }

  if (ctx.linked_records.length > 0) {
    lines.push(`**Linked to:** ${ctx.linked_records.map((r) => `${r.entity_label} (${r.surface})`).join(", ")}`);
  }

  if (ctx.plays_dispatched.length > 0) {
    lines.push(`**Plays triggered:** ${ctx.plays_dispatched.map((p) => p.play_name).join(", ")}`);
  }

  if (ctx.watches_triggered.length > 0) {
    lines.push(`**Watching:** ${ctx.watches_triggered.map((w) => w.entity_label).join(", ")}`);
  }

  const playFitEntries = Object.entries(ctx.play_fit)
    .filter(([, fit]) => fit.score >= 30)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3);

  if (playFitEntries.length > 0) {
    lines.push(`**Play candidates:**`);
    for (const [slug, fit] of playFitEntries) {
      const status = fit.meets_threshold ? "✓ meets threshold" : "below threshold";
      lines.push(`  - ${slug}: ${fit.score}% (${status}) — ${fit.reason}`);
    }
  }

  if (ctx.content_snippet) {
    lines.push(``, `**Preview:**`, `> ${ctx.content_snippet.slice(0, 200)}...`);
  }

  return lines.join("\n");
}
