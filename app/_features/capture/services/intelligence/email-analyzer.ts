import { z } from "zod";
import type { FindingType } from "../../types/intelligence-findings";

/**
 * Email Analyzer — LLM-powered signal extraction
 *
 * Analyzes email content to extract:
 * 1. Revenue signals (buying, closing, upsell, risk)
 * 2. New relationship signals (new contact, referral)
 * 3. Pending action signals (question, deliverable, reply needed)
 */

export const EmailAnalysisSchema = z.object({
  findings: z.array(
    z.object({
      type: z.enum([
        "revenue_buying",
        "revenue_closing",
        "revenue_upsell",
        "revenue_risk",
        "new_person",
        "referral",
        "pending_question",
        "pending_deliverable",
        "pending_reply",
      ]),
      title: z.string(),
      content: z.string().optional(),
      evidence_quote: z.string().optional(),
      confidence: z.number().min(0).max(100),
    })
  ),
  relationship_type: z
    .enum(["client", "prospect", "team", "partner", "vendor", "personal", "unknown"])
    .optional(),
  is_noise: z.boolean(),
  noise_reason: z.string().optional(),
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

export interface EmailToAnalyze {
  id: string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string;
  snippet: string;
  body_text: string | null;
  sent_at: string;
  thread_id: string;
  is_sent_by_user: boolean;
  has_prior_thread: boolean;
}

export const ANALYSIS_SYSTEM_PROMPT = `You are an AI assistant analyzing emails for a solo creative or service professional.

Your job is to identify signals that matter for their business:

## PRIORITY SIGNALS (Revenue)
1. **Buying Intent** — "What would it cost...", "Do you have availability...", "Interested in working with you..."
2. **Ready to Close** — "Let's move forward", "Send me the contract", "Ready to start", explicit yes
3. **Upsell Opportunity** — Existing relationship mentions new need or expanded scope
4. **Risk Signal** — "We need to pause", "Budget got cut", "Let me think about it", delays

## RELATIONSHIP SIGNALS
5. **Referral** — "Got your name from...", "X recommended you", "Y said I should reach out"

## PENDING ACTIONS
6. **Unanswered Question** — They asked something that wasn't addressed in the reply
7. **Pending Deliverable** — "When can I expect...", "Waiting on...", deadline mentioned
8. **Your Turn to Reply** — Thread ended with their message, implies action needed

## NOISE SIGNALS (Skip these)
- Security alerts, login notifications, password resets
- Newsletter subscriptions, marketing emails
- Automated receipts from SaaS tools (unless it's an invoice TO the user)
- Support tickets, automated responses
- Social notifications (LinkedIn, Twitter, etc.)
- Internal tool notifications (Slack, Notion, etc.)

## OUTPUT RULES
- Return ONLY JSON matching the schema
- A single email can have multiple findings (e.g., buying intent + referral)
- Confidence: 85-100 for explicit signals, 60-84 for inferred, below 60 means skip
- If noise, set is_noise: true and explain why
- Include a direct quote as evidence when possible
- Be conservative: if uncertain, lower confidence or mark as noise`;

export function buildAnalysisPrompt(email: EmailToAnalyze): string {
  const direction = email.is_sent_by_user ? "SENT by user" : "RECEIVED by user";
  const threadContext = email.has_prior_thread ? "Part of ongoing thread" : "New thread";

  return `Analyze this email for business signals.

---
**Direction:** ${direction}
**Thread:** ${threadContext}
**From:** ${email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
**To:** ${email.to_emails.join(", ")}
**Subject:** ${email.subject}
**Date:** ${email.sent_at}

**Content:**
${email.body_text || email.snippet}
---

Return JSON with your analysis. If this is noise (automated, notification, newsletter), mark is_noise: true.`;
}

export async function analyzeEmail(
  email: EmailToAnalyze,
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<EmailAnalysis | null> {
  try {
    const userPrompt = buildAnalysisPrompt(email);
    const response = await llmCall(ANALYSIS_SYSTEM_PROMPT, userPrompt);

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    return EmailAnalysisSchema.parse(parsed);
  } catch (error) {
    console.error("Failed to analyze email:", error);
    return null;
  }
}

export function calculateFindingConfidence(
  baseConfidence: number,
  signals: {
    isSentByUser?: boolean;
    hasPriorThread?: boolean;
    hasStripeSignal?: boolean;
    hasCalendarSignal?: boolean;
  }
): number {
  let confidence = baseConfidence;

  // Boost confidence for multi-signal confirmation
  if (signals.hasStripeSignal) confidence += 15;
  if (signals.hasCalendarSignal) confidence += 10;
  if (signals.isSentByUser && signals.hasPriorThread) confidence += 5;

  return Math.min(100, Math.max(0, confidence));
}
