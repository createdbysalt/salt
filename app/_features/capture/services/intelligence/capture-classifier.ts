import type { CaptureSourceType, ExtractedData } from "../../types";
import {
  filterActionableMemoryProposals,
} from "../../types/memory-proposals";
import { extractEmailToAnalyze } from "../extract-capture-email";
import {
  analyzeEmail,
  type EmailAnalysis,
  type EmailToAnalyze,
} from "./email-analyzer";
import type { SenderProfileRegistry } from "../../types/sender-profiles";
import {
  buildNoiseInputFromCaptureRow,
  classifyCaptureNoise,
} from "./capture-noise";

type FindingDraft = EmailAnalysis["findings"][number];

export type CaptureClassification = {
  isNoise: boolean;
  noiseReason?: string;
  findings: FindingDraft[];
  relationshipHint?: EmailAnalysis["relationship_type"];
  analysis: EmailAnalysis | null;
};

export interface ClassifierContext {
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>;
  knownPerson?: boolean;
  bidirectionalThread?: boolean;
  senderRegistry?: SenderProfileRegistry;
}

interface CaptureEventRow {
  id: string;
  source_type: CaptureSourceType;
  raw_payload: Record<string, unknown>;
  extracted_data: ExtractedData;
}

function extractEmailFromCapture(
  row: CaptureEventRow
): EmailToAnalyze | null {
  const noiseInput = buildNoiseInputFromCaptureRow({
    sourceType: row.source_type,
    rawPayload: row.raw_payload,
    extractedData: row.extracted_data,
  });

  const email = extractEmailToAnalyze(
    row.id,
    row.raw_payload,
    row.extracted_data,
    {
      has_prior_thread:
        /^re:/i.test(
          (row.extracted_data?.type === "message"
            ? row.extracted_data.subject
            : "") ?? ""
        ) ||
        Boolean(
          row.extracted_data?.type === "message" &&
            row.extracted_data.thread_id
        ),
    }
  );

  if (!email) return null;

  if (noiseInput) {
    email.labels = noiseInput.labels;
    email.headers = noiseInput.headers;
  }

  return email;
}

async function classifyEmailCapture(
  row: CaptureEventRow,
  ctx: ClassifierContext
): Promise<CaptureClassification | null> {
  const email = extractEmailFromCapture(row);
  if (!email) return null;

  const noise = classifyCaptureNoise(
    buildNoiseInputFromCaptureRow({
      sourceType: row.source_type,
      rawPayload: row.raw_payload,
      extractedData: row.extracted_data,
    }) ?? {
      sourceType: row.source_type,
      fromEmail: email.from_email,
      subject: email.subject,
      bodyText: email.body_text ?? email.snippet,
      labels: email.labels,
      headers: email.headers,
      isSentByUser: email.is_sent_by_user,
    }
  );

  if (noise.isNoise) {
    return {
      isNoise: true,
      noiseReason: noise.reason,
      findings: [],
      analysis: {
        findings: [],
        is_noise: true,
        noise_reason: noise.reason,
      },
    };
  }

  const analysis = await analyzeEmail(email, ctx.llmCall, {
    heuristicContext: {
      knownPerson: ctx.knownPerson,
      bidirectionalThread: ctx.bidirectionalThread,
    },
    senderRegistry: ctx.senderRegistry,
  });

  if (
    !analysis ||
    (analysis.is_noise &&
      filterActionableMemoryProposals(analysis.memory_proposals ?? []).length === 0)
  ) {
    return {
      isNoise: true,
      noiseReason: analysis?.noise_reason ?? "analysis_noise",
      findings: [],
      analysis,
    };
  }

  return {
    isNoise: false,
    findings: analysis.findings,
    relationshipHint: analysis.relationship_type,
    analysis,
  };
}

export async function classifyCapture(
  capture: CaptureEventRow,
  ctx: ClassifierContext
): Promise<CaptureClassification | null> {
  switch (capture.source_type) {
    case "gmail":
    case "outlook":
      return classifyEmailCapture(capture, ctx);
    default:
      return null;
  }
}
