import type { EmailAnalysis, EmailToAnalyze } from "./email-analyzer";
import { classifyCaptureNoise, emailToNoiseInput } from "./capture-noise";

type FindingDraft = EmailAnalysis["findings"][number];

const PAYMENT_RAIL_DOMAINS = [
  "intuit.com",
  "quickbooks.com",
  "stripe.com",
  "bill.com",
  "paypal.com",
  "square.com",
  "squareup.com",
];

const PAYMENT_PAYER_PATTERNS = [
  /payment from\s+([^.\n$]+?)(?:\.|$|\s+for\s)/i,
  /you(?:'ve| have)? received\s+\$[\d,.]+\s+from\s+([^.\n]+?)(?:\s+for\s|\.$|$)/i,
  /from\s+([A-Z][^.\n$]{2,80}?)\s+(?:sent you|paid you|made a payment)/i,
  /deposit from\s+([^.\n$]+)/i,
  /\$[\d,.]+\s+from\s+([^.\n]+?)(?:\s+for\s|\.$|$)/i,
];

const PAYMENT_SIGNAL_PATTERNS = [
  /money on the way/i,
  /payment (from|arriving|will be deposited|has been sent)/i,
  /sent you a payment/i,
  /deposit(ed)? today/i,
];

export interface PaymentPayerHint {
  name: string;
  email?: string;
}

export interface HeuristicFindingContext {
  /** Sender already linked in Memory */
  knownPerson?: boolean;
  /** Bidirectional thread (not just Re: subject) */
  bidirectionalThread?: boolean;
}

const HIGH_TRUST_OVERRIDE_TYPES = new Set<FindingDraft["type"]>([
  "revenue_buying",
  "revenue_closing",
  "revenue_upsell",
  "revenue_risk",
  "pending_question",
  "pending_deliverable",
]);

const HIGH_TRUST_OVERRIDE_MIN_CONFIDENCE = 85;

/** Automated payment processors — not the client who paid. */
export function isPaymentRailSender(fromEmail: string): boolean {
  const domain = fromEmail.toLowerCase().split("@")[1] ?? "";
  return PAYMENT_RAIL_DOMAINS.some(
    (rail) => domain === rail || domain.endsWith(`.${rail}`)
  );
}

export function extractPaymentPayer(text: string): PaymentPayerHint | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  for (const pattern of PAYMENT_PAYER_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;
    const name = match[1].trim().replace(/\s+/g, " ");
    if (name.length >= 2 && name.length <= 80) {
      return { name };
    }
  }
  return null;
}

const CLIENT_QUESTION_PATTERNS = [
  /\bquick question\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bdo i need to\b/i,
  /\bshould i\b/i,
  /\bwhen (will|can|do)\b/i,
  /\bhow do i\b/i,
  /\?\s*$/,
];

const MARKETING_FAQ_PATTERNS = [
  /\bunsubscribe\b/i,
  /\bview in browser\b/i,
  /\bshop now\b/i,
  /\blimited time\b/i,
  /\b\d+% off\b/i,
  /\bfree shipping\b/i,
];

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function normalizeEmailText(email: EmailToAnalyze): string {
  return decodeHtmlEntities(email.body_text || email.snippet || "");
}

function extractEvidenceQuote(text: string, maxLen = 160): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function subjectTitle(email: EmailToAnalyze, fallback: string): string {
  const cleaned = email.subject.replace(/^(re|fwd):\s*/gi, "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

function isRealClientQuestion(content: string): boolean {
  if (MARKETING_FAQ_PATTERNS.some((pattern) => pattern.test(content))) {
    return false;
  }
  return CLIENT_QUESTION_PATTERNS.some((pattern) => pattern.test(content));
}

function heuristicCanOverrideLlmNoise(heuristic: FindingDraft[]): boolean {
  return heuristic.some(
    (finding) =>
      finding.confidence >= HIGH_TRUST_OVERRIDE_MIN_CONFIDENCE &&
      HIGH_TRUST_OVERRIDE_TYPES.has(finding.type)
  );
}

/**
 * Deterministic signals the LLM often misses (conservative prompts, snippet-only bodies).
 */
export function detectHeuristicFindings(
  email: EmailToAnalyze,
  context: HeuristicFindingContext = {}
): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const content = normalizeEmailText(email);
  const subject = email.subject;
  const combined = `${subject}\n${content}`;
  const noise = classifyCaptureNoise(emailToNoiseInput(email));

  if (!email.is_sent_by_user) {
    const isPaymentNotice = PAYMENT_SIGNAL_PATTERNS.some((pattern) =>
      pattern.test(combined)
    );
    if (isPaymentNotice) {
      const payer = extractPaymentPayer(combined);
      findings.push({
        type: "revenue_closing",
        title: payer
          ? `Payment from ${payer.name}`
          : subject || "Payment incoming",
        content: payer
          ? `${payer.name} paid you — confirm who this belongs to in Memory if needed.`
          : "Payment notification — money is on the way or deposited.",
        evidence_quote: extractEvidenceQuote(content || subject),
        confidence: payer ? 82 : 75,
      });
    }

    const hasQuestion = isRealClientQuestion(content);
    const canFlagReply =
      email.has_prior_thread &&
      (context.knownPerson === true || context.bidirectionalThread === true);

    if (!noise.isNoise && hasQuestion) {
      findings.push({
        type: "pending_question",
        title: `Question: ${subjectTitle(email, "Client question")}`,
        content: extractEvidenceQuote(content),
        evidence_quote: extractEvidenceQuote(content),
        confidence: 78,
      });
    } else if (!noise.isNoise && canFlagReply) {
      findings.push({
        type: "pending_reply",
        title: `Reply needed: ${subjectTitle(email, "Thread waiting on you")}`,
        content: "Their latest message may need a response.",
        evidence_quote: extractEvidenceQuote(content || subject),
        confidence: 72,
      });
    }

    const deliverablePatterns = [
      /\bready for review\b/i,
      /\bready for your review\b/i,
      /\bdeliverable\b/i,
      /\bstrategy is ready\b/i,
    ];
    if (
      !noise.isNoise &&
      deliverablePatterns.some((pattern) => pattern.test(combined))
    ) {
      findings.push({
        type: "pending_deliverable",
        title: subjectTitle(email, "Deliverable ready"),
        content: "Work or document may be ready for your review.",
        evidence_quote: extractEvidenceQuote(content || subject),
        confidence: 76,
      });
    }
  }

  return findings;
}

export function mergeEmailAnalyses(
  heuristic: FindingDraft[],
  llm: EmailAnalysis
): EmailAnalysis {
  if (llm.is_noise && !heuristicCanOverrideLlmNoise(heuristic)) {
    return {
      ...llm,
      findings: [],
    };
  }

  if (heuristic.length === 0) {
    return llm;
  }

  const merged = [...heuristic];
  const seenTypes = new Set(heuristic.map((f) => f.type));

  for (const finding of llm.findings) {
    if (seenTypes.has(finding.type)) continue;
    merged.push(finding);
    seenTypes.add(finding.type);
  }

  return {
    ...llm,
    is_noise: false,
    findings: merged,
  };
}
