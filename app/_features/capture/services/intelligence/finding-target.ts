import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { resolvePerson } from "../system-plays/person-resolver";
import type { EmailToAnalyze } from "./email-analyzer";
import {
  extractPaymentPayer,
  isPaymentRailSender,
  normalizeEmailText,
} from "./email-heuristics";
import type { PaymentPayerHint } from "./email-heuristics";

export async function findPersonByNameHint(
  workspaceId: string,
  nameHint: string
): Promise<string | undefined> {
  const trimmed = nameHint.trim();
  if (trimmed.length < 2) return undefined;

  const admin = createAdminClient();
  const pattern = `%${trimmed}%`;

  const { data: byName } = await admin
    .from("people")
    .select("id")
    .eq("studio_id", workspaceId)
    .is("archived_at", null)
    .ilike("name", pattern)
    .limit(1)
    .maybeSingle();

  if (byName?.id) return byName.id;

  const { data: byDisplayName } = await admin
    .from("people")
    .select("id")
    .eq("studio_id", workspaceId)
    .is("archived_at", null)
    .ilike("display_name", pattern)
    .limit(1)
    .maybeSingle();

  return byDisplayName?.id ?? undefined;
}

/**
 * Payment rails (QuickBooks, Stripe, etc.) are not the client.
 * Try to attach revenue to the payer mentioned in the email body.
 */
export async function resolvePaymentPayerPerson(
  workspaceId: string,
  email: EmailToAnalyze,
  payerHint: PaymentPayerHint | null
): Promise<string | undefined> {
  if (!payerHint) return undefined;

  if (payerHint.email) {
    const byEmail = await resolvePerson(workspaceId, {
      email: payerHint.email,
      name: payerHint.name,
      signals: { has_payment_received: true },
    });
    return byEmail.person_id;
  }

  return findPersonByNameHint(workspaceId, payerHint.name);
}

export function getPaymentPayerHint(email: EmailToAnalyze): PaymentPayerHint | null {
  if (!isPaymentRailSender(email.from_email)) return null;
  const text = normalizeEmailText(email);
  return extractPaymentPayer(`${email.subject}\n${text}`);
}

export function isPaymentRailEmail(fromEmail: string): boolean {
  return isPaymentRailSender(fromEmail);
}
