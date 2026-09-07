/**
 * Outlook stub hydration backfill (2026-08-29).
 *
 * Composio reverted the Outlook toolkit slug rework: the double-prefix
 * OUTLOOK_OUTLOOK_GET_MESSAGE slug started 404ing, so webhook enrichment
 * silently failed and hundreds of Outlook captures were ingested as
 * content-free stubs (extracted_data.needs_hydration = true). Stubs carry
 * no subject/body/attachments, so the classifier never saw them — which is
 * why contract / meeting-notes / invoice resources never birthed from
 * Outlook mail.
 *
 * The slug alias is fixed in app/_lib/composio/tool-slugs.ts. This script
 * repairs the backlog: for each stub it re-fetches the full message through
 * the SAME enrichment path the webhook uses (enrichWebhookPayload →
 * OUTLOOK_GET_MESSAGE), normalizes it with the real Outlook adapter, and
 * updates the capture row in place.
 *
 * All 655 staging stubs are HELD mail (Memory-first policy) whose thin
 * extract is empty — sender_email is null, so relationship discovery can't
 * even group them. Hydration restores the sender. After hydrating, the
 * known-entity gate re-runs: senders now in Memory are released to
 * "candidate" and get processCaptureForEvidence (evidence only runs at
 * ingest — the daily scan never revisits it, so released rows must be
 * processed here). Unknown senders stay held for the discovery cron.
 *
 * Dry-run by default; --apply writes. Sequential with a small delay to stay
 * gentle on the Composio read-class rate limit.
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" \
 *     pnpm tsx scripts/hydrate-outlook-stubs.ts [--apply] [--workspace <id>] [--limit 100]
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { enrichWebhookPayload } from "@/app/_lib/composio/webhook-enrichment";
import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getCategoryAdapter } from "@/app/_features/capture/adapters/categories";
import { runKnownEntityGate } from "@/app/_features/capture/services/gates/known-entity-gate";
import { processCaptureForEvidence } from "@/app/_features/memory/evidence/process-capture";

const apply = process.argv.includes("--apply");
const workspaceFlag = process.argv.indexOf("--workspace");
const onlyWorkspace =
  workspaceFlag >= 0 ? (process.argv[workspaceFlag + 1] ?? null) : null;
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

const DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface StubRow {
  id: string;
  workspace_id: string;
  source_external_id: string;
}

async function main() {
  const supabase = createAdminClient();

  let query = supabase
    .from("capture_events")
    .select("id, workspace_id, source_external_id")
    .eq("source_type", "outlook")
    .filter("raw_payload->>needs_hydration", "eq", "true")
    .not("source_external_id", "is", null)
    .order("created_at", { ascending: true });
  if (onlyWorkspace) query = query.eq("workspace_id", onlyWorkspace);
  if (limit) query = query.limit(limit);

  const { data: stubs, error } = await query;
  if (error) throw error;

  console.log(
    `[hydrate] ${stubs?.length ?? 0} outlook stubs${apply ? "" : " (dry run)"}`,
  );
  if (!stubs?.length) return;

  const adapter = await getCategoryAdapter("outlook");
  if (!adapter) throw new Error("no outlook adapter");

  const connectionByWorkspace = new Map<
    string,
    { connectionId: string } | null
  >();

  let hydrated = 0;
  let fetchFailed = 0;
  let normalizeFailed = 0;
  let noConnection = 0;
  let released = 0;
  let autoCreated = 0;

  for (const stub of stubs as StubRow[]) {
    let connection = connectionByWorkspace.get(stub.workspace_id);
    if (connection === undefined) {
      const status = await getConnectionStatusAdmin(
        "outlook",
        stub.workspace_id,
      );
      connection =
        status.connected && status.composioConnectionId
          ? { connectionId: status.composioConnectionId }
          : null;
      connectionByWorkspace.set(stub.workspace_id, connection);
    }
    if (!connection) {
      noConnection += 1;
      continue;
    }

    let enrichment;
    try {
      enrichment = await enrichWebhookPayload(
        "OUTLOOK_MESSAGE_TRIGGER",
        { id: stub.source_external_id },
        connection.connectionId,
        stub.workspace_id,
      );
    } catch (error) {
      fetchFailed += 1;
      console.error(
        `[hydrate] fetch threw for ${stub.id}:`,
        error instanceof Error ? error.message : error,
      );
      await sleep(DELAY_MS);
      continue;
    }

    if (!enrichment.enriched) {
      fetchFailed += 1;
      console.error(
        `[hydrate] fetch failed for ${stub.id}: ${enrichment.error ?? "unknown"}`,
      );
      await sleep(DELAY_MS);
      continue;
    }

    const envelope = adapter.normalize(enrichment.payload);
    if (!envelope) {
      normalizeFailed += 1;
      console.error(`[hydrate] adapter declined payload for ${stub.id}`);
      await sleep(DELAY_MS);
      continue;
    }

    const enrichedExtract = envelope.extracted as Record<string, unknown>;
    const senderEmail =
      typeof enrichedExtract.sender_email === "string"
        ? enrichedExtract.sender_email.toLowerCase()
        : null;
    const senderDomain = senderEmail?.split("@")[1] ?? null;

    if (apply) {
      const { error: updateError } = await supabase
        .from("capture_events")
        .update({
          title: envelope.title,
          raw_payload: envelope.raw as never,
          extracted_data: envelope.extracted as never,
        })
        .eq("id", stub.id);
      if (updateError) {
        fetchFailed += 1;
        console.error(
          `[hydrate] update failed for ${stub.id}: ${updateError.message}`,
        );
        await sleep(DELAY_MS);
        continue;
      }

      // Re-run the known-entity gate with the restored sender. A match means
      // this mail would never have been held had enrichment worked at
      // ingest — release it and run the evidence lane (which only runs at
      // ingest; no cron revisits it).
      let known = null;
      try {
        known = await runKnownEntityGate({
          workspaceId: stub.workspace_id,
          senderEmail,
          senderDomain,
          senderName:
            typeof enrichedExtract.sender_name === "string"
              ? enrichedExtract.sender_name
              : null,
        });
      } catch (error) {
        console.error(
          `[hydrate] known-entity gate failed for ${stub.id}:`,
          error instanceof Error ? error.message : error,
        );
      }

      if (known) {
        const { error: releaseError } = await supabase
          .from("capture_events")
          .update({ gate_action: "candidate" } as never)
          .eq("id", stub.id);
        if (releaseError) {
          console.error(
            `[hydrate] release failed for ${stub.id}: ${releaseError.message}`,
          );
        } else {
          released += 1;
          try {
            const result = await processCaptureForEvidence(stub.id);
            autoCreated += result.results.filter(
              (r) => r.action === "auto",
            ).length;
          } catch (error) {
            console.error(
              `[hydrate] evidence processing failed for ${stub.id}:`,
              error instanceof Error ? error.message : error,
            );
          }
        }
      }
    }

    hydrated += 1;
    if (hydrated % 25 === 0) {
      console.log(`[hydrate] ${hydrated}/${stubs.length} hydrated`);
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `[hydrate] done — hydrated: ${hydrated}, fetch failed: ${fetchFailed}, ` +
      `normalize failed: ${normalizeFailed}, no connection: ${noConnection}`,
  );
  if (apply) {
    console.log(
      `[hydrate] released to stream: ${released}, records auto-created: ${autoCreated}`,
    );
  }
  if (!apply) console.log("[hydrate] dry run — nothing written");
}

main().catch((error) => {
  console.error("[hydrate] fatal:", error);
  process.exit(1);
});
