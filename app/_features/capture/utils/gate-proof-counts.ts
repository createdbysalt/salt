import type { CustomizeArea } from "../adapters/rule-entities";

/**
 * Gate proof counts (Sources → Customize, Phase S1).
 *
 * "Proof, not promises": every default line on the Customize surface can
 * carry quiet evidence — "I skipped 43 promotions this week". This pure
 * summarizer turns a week of capture_events rows (source_type +
 * gate_action) into per-area counts. The server query lives in
 * `capture/queries.ts`; the area mapping is injected so this module stays
 * pure and testable.
 *
 * Vocabulary (matches the surface copy):
 * - keptOut:  gate_action drop | noise — Salt filtered it before it reached you
 * - watching: gate_action held — unknown senders earning their way in
 * - letIn:    gate_action signal | candidate — admitted to the stream
 */

export interface GateProofRow {
  sourceType: string;
  gateAction: string | null;
}

export interface AreaProofCounts {
  keptOut: number;
  watching: number;
  letIn: number;
}

export function summarizeGateProofCounts(
  rows: readonly GateProofRow[],
  resolveArea: (provider: string) => CustomizeArea | null,
): Map<CustomizeArea, AreaProofCounts> {
  const counts = new Map<CustomizeArea, AreaProofCounts>();

  for (const row of rows) {
    if (!row.gateAction) continue;
    const area = resolveArea(row.sourceType);
    if (!area) continue;

    const entry = counts.get(area) ?? { keptOut: 0, watching: 0, letIn: 0 };
    switch (row.gateAction) {
      case "drop":
      case "noise":
        entry.keptOut += 1;
        break;
      case "held":
        entry.watching += 1;
        break;
      case "signal":
      case "candidate":
        entry.letIn += 1;
        break;
      default:
        continue;
    }
    counts.set(area, entry);
  }

  return counts;
}
