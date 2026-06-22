import type { PlaybookEvalCase } from "../types";

/**
 * Promote a real-world failure or heavy edit into the regression suite shape.
 */
export function buildEdgeCaseEval(input: {
  id: string;
  name: string;
  playbook_slug: string;
  input: Record<string, unknown>;
  mocks?: Record<string, unknown>;
  assertions: PlaybookEvalCase["assertions"];
  source_run_id?: string;
}): PlaybookEvalCase & { origin: "from_edge_case"; source_run_id?: string } {
  return {
    id: input.id,
    name: input.name,
    input: input.input,
    mocks: input.mocks,
    assertions: input.assertions,
    origin: "from_edge_case",
    source_run_id: input.source_run_id,
  };
}

export function shouldPromoteEdgeCase(input: {
  signalType: "edited" | "failed" | "guard_skipped" | "dismissed";
  editRatio?: number;
}): boolean {
  if (input.signalType === "failed") return true;
  if (input.signalType === "guard_skipped") return true;
  if (input.signalType === "edited" && (input.editRatio ?? 0) >= 0.3) return true;
  return false;
}
