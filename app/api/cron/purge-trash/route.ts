/**
 * Purge trash cron — permanently deletes memory items soft-deleted 30+ days ago.
 *
 * Secured with CRON_SECRET. Recommended schedule: daily (see vercel.json).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { TRASH_RETENTION_DAYS } from "@/app/_features/memory/types/trash";
import { NextRequest, NextResponse } from "next/server";
import { assertInternalSecret } from "@/app/_lib/security/assert-internal-secret";

const PURGE_TABLES = ["people", "organizations", "work", "notes"] as const;

function purgeCutoffIso(): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - TRASH_RETENTION_DAYS);
  return cutoff.toISOString();
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const unauthorized = assertInternalSecret(req, "[Purge trash cron]");
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const cutoff = purgeCutoffIso();
  const purged: Record<string, number> = {};

  try {
    for (const table of PURGE_TABLES) {
      if (table === "notes") {
        const { data: noteIds } = await admin
          .from("notes")
          .select("id")
          .not("deleted_at", "is", null)
          .lt("deleted_at", cutoff);

        const ids = (noteIds ?? []).map((row) => row.id as string);
        if (ids.length > 0) {
          await admin
            .from("entity_links")
            .delete()
            .eq("source_type", "note")
            .in("source_id", ids);
        }
      }

      const { data, error } = await admin
        .from(table)
        .delete()
        .not("deleted_at", "is", null)
        .lt("deleted_at", cutoff)
        .select("id");

      if (error) {
        console.error(`[Purge trash cron] Failed to purge ${table}:`, error);
        return NextResponse.json(
          {
            error: `Failed to purge ${table}`,
            purged,
            executionTimeMs: Date.now() - startTime,
          },
          { status: 500 },
        );
      }

      purged[table] = data?.length ?? 0;
    }

    const total = Object.values(purged).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      message: `Purged ${total} trashed items older than ${TRASH_RETENTION_DAYS} days`,
      cutoff,
      purged,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[Purge trash cron] Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
        purged,
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
