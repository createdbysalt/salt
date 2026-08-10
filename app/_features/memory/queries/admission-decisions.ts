import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import {
  extractGateReason,
  keptOutCauseFromGateResult,
  type KeptOutCause,
} from "./admission-gate-result";

/**
 * Admission decisions for Memory → Filter.
 *
 * Record-centric view of the capture gate pipeline: what Salt is watching
 * (candidates), what it let in (signals), and what it kept out
 * (noise/drop/held) with plain-language reasons from the gate result.
 */

export interface AdmissionItem {
  captureId: string;
  title: string | null;
  fromLabel: string | null;
  sourceType: string;
  createdAt: string;
  confidence: number | null;
  gateAction: string;
  reason: string | null;
  /**
   * Why this capture was kept out: an explicit user rule (removable) or a
   * heuristic score (correctable with always-allow). Drives the Kept Out
   * correction action (P4).
   */
  cause: KeptOutCause;
}

export interface AdmissionDecisions {
  /** gate_action = 'candidate' — scored in; lives in Watching until nudged or the bar clears. */
  candidates: AdmissionItem[];
  /** gate_action = 'signal' — admitted in the last 7 days (Handled). */
  letIn: AdmissionItem[];
  /** noise/drop/held in the last 7 days. */
  keptOutCount: number;
  /** Borderline kept-out items (most recent) worth a second look. */
  keptOutSample: AdmissionItem[];
}

interface CaptureGateRow {
  id: string;
  title: string | null;
  source_type: string;
  overall_confidence: number | null;
  created_at: string;
  gate_action: string | null;
  gate_result: unknown;
  extracted_data: unknown;
}

function extractFromLabel(extracted: unknown): string | null {
  if (!extracted || typeof extracted !== "object") return null;
  const data = extracted as { from_name?: string; from_email?: string };
  return data.from_name?.trim() || data.from_email || null;
}

function mapRow(row: CaptureGateRow): AdmissionItem | null {
  if (!row.gate_action) return null;
  return {
    captureId: row.id,
    title: row.title,
    fromLabel: extractFromLabel(row.extracted_data),
    sourceType: row.source_type,
    createdAt: row.created_at,
    confidence: row.overall_confidence,
    gateAction: row.gate_action,
    reason: extractGateReason(row.gate_result),
    cause: keptOutCauseFromGateResult(row.gate_result),
  };
}

const GATE_SELECT = `
  id,
  title,
  source_type,
  overall_confidence,
  created_at,
  gate_action,
  gate_result,
  extracted_data
`;

function daysAgo(days: number): string {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since.toISOString();
}

export const getAdmissionDecisions = cache(
  async (workspaceId: string): Promise<AdmissionDecisions> => {
    const supabase = await createClient();
    const weekAgo = daysAgo(7);
    const twoWeeksAgo = daysAgo(14);

    const [candidatesRes, letInRes, keptOutCountRes, keptOutSampleRes] =
      await Promise.all([
        supabase
          .from("capture_events")
          .select(GATE_SELECT)
          .eq("workspace_id", workspaceId)
          .eq("gate_action", "candidate")
          .gte("created_at", twoWeeksAgo)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("capture_events")
          .select(GATE_SELECT)
          .eq("workspace_id", workspaceId)
          .eq("gate_action", "signal")
          .gte("created_at", weekAgo)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("capture_events")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("gate_action", ["noise", "drop", "held"])
          .gte("created_at", weekAgo),
        supabase
          .from("capture_events")
          .select(GATE_SELECT)
          .eq("workspace_id", workspaceId)
          .in("gate_action", ["noise", "held"])
          .gte("created_at", weekAgo)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

    for (const res of [candidatesRes, letInRes, keptOutCountRes, keptOutSampleRes]) {
      if (res.error) {
        console.error(
          "[admission-decisions] query error:",
          res.error.message,
          res.error.code,
        );
      }
    }

    const mapRows = (rows: CaptureGateRow[] | null): AdmissionItem[] =>
      (rows ?? [])
        .map(mapRow)
        .filter((item): item is AdmissionItem => item !== null);

    return {
      candidates: mapRows(candidatesRes.data as CaptureGateRow[] | null),
      letIn: mapRows(letInRes.data as CaptureGateRow[] | null),
      keptOutCount: keptOutCountRes.count ?? 0,
      keptOutSample: mapRows(keptOutSampleRes.data as CaptureGateRow[] | null),
    };
  },
);
