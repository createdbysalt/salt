/**
 * Drain the capture-intelligence backlog (audit fix #12 follow-up).
 *
 * Runs runDailyScan against the env-selected Supabase project in a loop.
 * Fix #6 makes the scan pick up unstamped/scan_error captures regardless of
 * age, so each pass chews through up to `maxEmails` of the backlog until
 * nothing is left.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- pnpm exec tsx scripts/drain-capture-backlog.ts
 *
 * LLM analysis is wired through sendLlm + workspaceSpend, so spend meters
 * at the primitive exactly like the in-app scan.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MAX_PASSES = 8;
const MAX_EMAILS_PER_PASS = 100;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Workspace with the backlog (staging is single-tenant for our purposes).
  const { data: sample, error: sampleError } = await supabase
    .from("capture_events")
    .select("workspace_id")
    .limit(1)
    .single();
  if (sampleError || !sample) {
    console.error("No captures found:", sampleError?.message);
    process.exit(1);
  }
  const workspaceId = sample.workspace_id as string;

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single();
  if (memberError || !member) {
    console.error("No workspace member found:", memberError?.message);
    process.exit(1);
  }
  const userId = member.user_id as string;
  console.log(`Workspace ${workspaceId}, actor ${userId}`);

  const { runDailyScan } = await import(
    "../app/_features/capture/services/intelligence/daily-scan"
  );
  const { sendLlm, workspaceSpend } = await import("../app/_lib/ai/gpt");

  const llmCall = async (systemPrompt: string, userPrompt: string) => {
    const result = await sendLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      workspaceSpend(workspaceId, userId),
      { routingKey: "insights", maxTokens: 1000, temperature: 0.3 }
    );
    return result || "{}";
  };

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const { count } = await supabase
      .from("capture_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("source_type", ["gmail", "outlook"])
      .or("gate_action.is.null,gate_action.not.in.(drop,held,noise)")
      .or(
        "extracted_data->>intelligence.is.null,extracted_data->intelligence->>outcome.eq.scan_error"
      );

    console.log(`\nPass ${pass}: ${count ?? "?"} backlog captures remaining`);
    if (!count) break;

    const result = await runDailyScan(workspaceId, userId, {
      maxEmails: MAX_EMAILS_PER_PASS,
      llmCall,
    });

    console.log(
      `  processed=${result.emailsProcessed} findings=${result.findingsCreated} ` +
        `people=${result.peopleResolved} fields=${result.fieldsApplied} ` +
        `errors=${result.errors.length}`
    );
    for (const err of result.errors.slice(0, 5)) console.log(`  ! ${err}`);

    if (result.emailsProcessed === 0) {
      console.log("  No progress — stopping.");
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
