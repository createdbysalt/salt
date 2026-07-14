import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendLlm } from "@/app/_lib/ai/gpt";

const FALLBACK_OPPORTUNITY = {
  claim: "Late follow-ups may be leaving revenue on the table",
  summary:
    "Salt found quiet threads and open loops worth a structured follow-up batch.",
  amount_min: 1200,
  amount_max: 4200,
  confidence: 82,
};

const FALLBACK_PLAYS = [
  {
    title: "Send payment reminder to a quiet invoice thread",
    preview:
      "Hi — just a gentle nudge on the outstanding invoice. Happy to hop on a quick call if easier.",
    recipient: "Client contact",
  },
  {
    title: "Send kickoff recap to your latest lead",
    preview:
      "Quick recap of our last conversation — next steps, timeline, and any open questions.",
    recipient: "Lead contact",
  },
  {
    title: "Draft scope check-in for an active project",
    preview:
      "Flagging a small scope drift signal — here's what changed and what we should confirm before proceeding.",
    recipient: "Project stakeholder",
  },
] as const;

async function hasExistingScan(workspaceId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("opportunity_gaps")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  return (count ?? 0) > 0;
}

async function tryLlmOpportunity(workspaceId: string): Promise<typeof FALLBACK_OPPORTUNITY | null> {
  const response = await sendLlm(
    [
      {
        role: "system",
        content:
          "Return JSON only: { claim, summary, amount_min, amount_max, confidence }. Use ranges not precise dollars.",
      },
      {
        role: "user",
        content:
          "A solo service studio just connected Gmail. Estimate one credible revenue opportunity gap from late follow-ups or unpaid invoices.",
      },
    ],
    workspaceId,
    { routingKey: "opportunityScan", maxTokens: 400, temperature: 0.2 },
  );

  if (!response) return null;

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as typeof FALLBACK_OPPORTUNITY;
    if (!parsed.claim) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function runFirstScanForStudio(workspaceId: string): Promise<void> {
  if (await hasExistingScan(workspaceId)) return;

  const admin = createAdminClient();
  const opportunity = (await tryLlmOpportunity(workspaceId)) ?? FALLBACK_OPPORTUNITY;

  const { data: gap } = await admin
    .from("opportunity_gaps")
    .insert({
      workspace_id: workspaceId,
      claim: opportunity.claim,
      summary: opportunity.summary,
      amount_min: opportunity.amount_min,
      amount_max: opportunity.amount_max,
      currency: "USD",
      confidence: opportunity.confidence,
      category: "follow_up",
      is_primary: true,
      sources: [{ type: "scan", label: "First connect scan" }],
    })
    .select("id")
    .single();

  for (const play of FALLBACK_PLAYS) {
    await admin.from("play_runs").insert({
      workspace_id: workspaceId,
      // player_id deprecated 2026-07-13
      opportunity_gap_id: gap?.id ?? null,
      state: "queued",
      title: play.title,
      preview: play.preview,
      recipient_label: play.recipient,
      channel: "Gmail",
      channels: ["Gmail"],
      draft_body: play.preview,
      confidence: opportunity.confidence,
      eta_label: "Ready to review",
    });
  }

  await admin.from("activity_entries").insert({
    workspace_id: workspaceId,
    action: "created",
    title: "First scan completed",
    detail: "Salt seeded starter opportunities and plays from your connected accounts.",
  });
}

export async function runFirstScanForWorkspace(workspaceId: string): Promise<void> {
  return runFirstScanForStudio(workspaceId);
}
