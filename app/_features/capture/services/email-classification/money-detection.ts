/**
 * Email Money Detection
 *
 * Detects financial signals: dollar amounts, invoices, payment links.
 * Used for Money Moves classification and priority boosting.
 */

import type { EmailClassificationInput } from "./types";
import {
  MONEY_PATTERNS,
  PAYMENT_LINK_DOMAINS,
  INVOICE_ATTACHMENT_PATTERNS,
} from "./types";

export interface MoneyResult {
  hasMoney: boolean;
  hasInvoiceAttachment: boolean;
  hasPaymentLink: boolean;
  amounts: string[];
  evidence: string[];
}

export function detectMoney(
  input: EmailClassificationInput
): MoneyResult {
  const content = `${input.subject} ${input.bodyPreview}`;
  const amounts: string[] = [];
  const evidence: string[] = [];

  for (const pattern of MONEY_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      amounts.push(match[0]);
    }
  }

  if (amounts.length > 0) {
    evidence.push(`Money amounts: ${amounts.join(", ")}`);
  }

  const hasPaymentLink = PAYMENT_LINK_DOMAINS.some((domain) =>
    content.toLowerCase().includes(domain)
  );
  if (hasPaymentLink) {
    evidence.push("Payment link detected");
  }

  const hasInvoiceAttachment = input.attachmentNames.some((name) =>
    INVOICE_ATTACHMENT_PATTERNS.some((p) => p.test(name))
  );
  if (hasInvoiceAttachment) {
    evidence.push(
      `Invoice attachment: ${input.attachmentNames.filter((n) =>
        INVOICE_ATTACHMENT_PATTERNS.some((p) => p.test(n))
      ).join(", ")}`
    );
  }

  return {
    hasMoney: amounts.length > 0,
    hasInvoiceAttachment,
    hasPaymentLink,
    amounts,
    evidence,
  };
}

export function extractMoneyAmount(text: string): number | null {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  if (!match) return null;
  const cleaned = match[0].replace(/[$,]/g, "");
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}
