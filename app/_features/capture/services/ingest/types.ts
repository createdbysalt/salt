import type { CaptureOrigin } from "../../types";
import type { GatePipelineResult } from "../../types/gate-result";

export type IngestOutcome =
  | "created"
  | "updated"
  | "duplicate"
  | "noise"
  | "held"
  | "dropped"
  | "error";

export interface IngestEnvelopeOptions {
  isBootstrap?: boolean;
  /** Origin for the row; trigger/webhook arrivals are "found". */
  origin?: CaptureOrigin;
  /** Skip evidence accumulation (for bulk imports). */
  skipEvidence?: boolean;
  /** User's email for gate pipeline context. */
  userEmail?: string | null;
  /** Enable new gate pipeline (Captures V2). Default: false for backward compat. */
  useGatePipeline?: boolean;
  /**
   * Await evidence + enrichment before returning. Serverless callers (the
   * Composio webhook route) must set this — fire-and-forget work is killed
   * when the function instance freezes after the response, leaving captures
   * without enriched_metadata ("Processing" forever).
   */
  awaitEnrichment?: boolean;
  /**
   * Lane 1 discriminator: pay for a cold-inbound intent read so a genuine
   * inquiry from an unknown sender is admitted in real time instead of held
   * for the discovery cron. Real-time paths (webhook) only — backfills never
   * set this.
   */
  coldIntentRead?: boolean;
}

export interface IngestEnvelopeResult {
  outcome: IngestOutcome;
  noiseReason?: string;
  error?: string;
  captureId?: string;
  gateResult?: GatePipelineResult;
}
