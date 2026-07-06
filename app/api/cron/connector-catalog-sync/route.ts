/**
 * Connector catalog sync cron (connector-platform Phase 2.2).
 *
 * Mirrors Composio's toolkit/tool/trigger catalog into the connector_*
 * tables and logs drift events (removed/changed slugs auto-disable their
 * approved classifications — fail closed, never a runtime surprise).
 *
 * Secured with CRON_SECRET. Recommended schedule: daily (see vercel.json).
 */

import { NextRequest, NextResponse } from "next/server";
import { runCatalogSync } from "@/app/_lib/composio/catalog-sync";
import { autoClassifyPendingTools } from "@/app/_lib/composio/auto-classify";

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!CRON_SECRET) {
    console.error("[Catalog sync cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== CRON_SECRET) {
    console.warn("[Catalog sync cron] Unauthorized request attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCatalogSync();
    const driftEvents = result.events.filter(
      (event) => event.kind !== "tool_added" && event.kind !== "trigger_added",
    );
    if (driftEvents.length > 0) {
      console.warn(
        `[Catalog sync cron] ${driftEvents.length} drift event(s):`,
        driftEvents.map((event) => `${event.kind}:${event.subjectSlug}`).join(", "),
      );
    }
    // Auto-classify anything new the sync brought in (founder decision
    // 2026-07-06: LLM verdicts approve directly; manual verdicts still win).
    const classification = await autoClassifyPendingTools({
      actorId: "catalog-sync-cron",
    });
    if (classification.remaining > 0) {
      console.warn(
        `[Catalog sync cron] ${classification.remaining} tool(s) still pending classification (skipped ${classification.skipped})`,
      );
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startTime,
      toolkitsSynced: result.toolkitsSynced,
      toolsSynced: result.toolsSynced,
      triggersSynced: result.triggersSynced,
      events: result.events.length,
      driftEvents: driftEvents.length,
      classified: classification.classified,
      classificationRemaining: classification.remaining,
    });
  } catch (error) {
    console.error("[Catalog sync cron] Sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
