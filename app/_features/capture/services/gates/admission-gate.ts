import "server-only";

/**
 * Admission Gate (Captures V2 Phase 2 — Gate 3).
 *
 * Scores unknown senders for admission to Captures:
 * - You initiated? → High signal (you reached out first)
 * - They replied? → High signal (ongoing conversation)
 * - Bidirectional thread? → High signal
 * - Calendar meeting? → High signal (business relationship)
 * - Payment? → High signal (customer)
 * - Shared file? → Medium signal
 *
 * Low-signal cold inbound goes to noise (hidden but searchable).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type {
  AdmissionGateInput,
  GateResultCandidate,
  GateResultNoise,
  AdmissionSignal,
} from "../../types/gate-result";

const ADMISSION_THRESHOLD = 30;
const HIGH_CONFIDENCE_THRESHOLD = 70;

export async function runAdmissionGate(
  input: AdmissionGateInput
): Promise<GateResultCandidate | GateResultNoise> {
  const signals: AdmissionSignal[] = [];
  let totalScore = 0;

  if (input.youInitiated) {
    signals.push({
      type: "you_initiated",
      weight: 40,
      evidence: "You sent the first message in this thread",
    });
    totalScore += 40;
  }

  if (input.isReply && !input.youInitiated) {
    signals.push({
      type: "they_replied",
      weight: 35,
      evidence: "They replied to your message",
    });
    totalScore += 35;
  }

  if (input.threadId && input.senderEmail) {
    const bidirectional = await checkBidirectionalThread(
      input.workspaceId,
      input.threadId,
      input.senderEmail,
      input.userEmail
    );
    if (bidirectional) {
      signals.push({
        type: "bidirectional",
        weight: 30,
        evidence: "Bidirectional email thread",
      });
      totalScore += 30;
    }
  }

  if (input.hasCalendarMeeting) {
    signals.push({
      type: "calendar_meeting",
      weight: 35,
      evidence: "Has calendar meeting with you",
    });
    totalScore += 35;
  }

  if (input.hasPayment) {
    signals.push({
      type: "payment_customer",
      weight: 40,
      evidence: "Has payment/invoice relationship",
    });
    totalScore += 40;
  }

  if (input.hasSharedFile) {
    signals.push({
      type: "shared_file",
      weight: 20,
      evidence: "Has shared files with you",
    });
    totalScore += 20;
  }

  const confidence = Math.min(100, totalScore);

  if (confidence >= ADMISSION_THRESHOLD) {
    return {
      action: "candidate",
      gate: "admission",
      confidence,
      signals,
      reason:
        confidence >= HIGH_CONFIDENCE_THRESHOLD
          ? `High-signal contact: ${signals.map((s) => s.type).join(", ")}`
          : `Candidate contact: ${signals.map((s) => s.type).join(", ")}`,
    };
  }

  return {
    action: "noise",
    gate: "admission",
    reason: signals.length === 0 ? "Cold inbound with no prior interaction" : "Low signal score",
    category: signals.length === 0 ? "cold_inbound" : "low_signal",
  };
}

async function checkBidirectionalThread(
  workspaceId: string,
  threadId: string,
  senderEmail: string,
  userEmail: string | null
): Promise<boolean> {
  if (!userEmail) return false;

  const admin = createAdminClient();

  const { data: threadCaptures } = await admin
    .from("capture_events")
    .select("extracted_data")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "gmail")
    .contains("extracted_data", { thread_id: threadId })
    .limit(10);

  if (!threadCaptures || threadCaptures.length < 2) {
    return false;
  }

  const userEmailLower = userEmail.toLowerCase();
  const senderEmailLower = senderEmail.toLowerCase();

  let hasUserSent = false;
  let hasContactSent = false;

  for (const capture of threadCaptures) {
    const data = capture.extracted_data as Record<string, unknown> | null;
    const from = (data?.sender_email as string)?.toLowerCase();

    if (from === userEmailLower) {
      hasUserSent = true;
    } else if (from === senderEmailLower) {
      hasContactSent = true;
    }

    if (hasUserSent && hasContactSent) {
      return true;
    }
  }

  return false;
}

export async function checkCalendarRelationship(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("capture_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "googlecalendar")
    .contains("extracted_data", { attendee_emails: [email.toLowerCase()] })
    .limit(1)
    .maybeSingle();

  return !!data;
}

export async function checkPaymentRelationship(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("capture_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "stripe")
    .contains("extracted_data", { customer_email: email.toLowerCase() })
    .limit(1)
    .maybeSingle();

  return !!data;
}

export async function checkFileSharing(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("capture_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_type", "googledrive")
    .contains("extracted_data", { shared_with_emails: [email.toLowerCase()] })
    .limit(1)
    .maybeSingle();

  return !!data;
}
