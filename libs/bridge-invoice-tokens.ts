/**
 * Bridge Invoice Tokenized Link Management
 * 
 * Secure tokenized links for client invoice viewing and payment.
 * Features:
 * - 30-day TTL
 * - Rotation/revocation on resend
 * - Spent-for-checkout tracking (prevents double-charge, allows paid view)
 * - Rate limiting ready (caller should implement)
 */

import { createAdminClient } from "./supabase/admin";
import { generateTokenWithHash, verifyTokenHash } from "./tokens";

const TOKEN_TTL_DAYS = 30;

export interface InvoiceToken {
  id: string;
  invoiceId: string;
  tokenHash: string;
  expiresAt: Date;
  spentForCheckout: boolean;
  usedAt: Date | null;
  revokedAt: Date | null;
  lastSentAt: Date | null;
  createdAt: Date;
}

export interface TokenVerificationResult {
  valid: boolean;
  token?: InvoiceToken;
  invoice?: {
    id: string;
    studioId: string;
    clientId: string;
    amountCents: number;
    currency: string;
    status: string;
    description: string | null;
    dueDate: string | null;
  };
  reason?: "not_found" | "expired" | "revoked" | "invoice_not_found";
}

/**
 * Issue a new tokenized link for an invoice
 * Automatically revokes any prior active tokens for the same invoice.
 * 
 * @param invoiceId - UUID of the bridge invoice
 * @returns Object with raw token (send to client) and token metadata
 */
export async function issueInvoiceToken(invoiceId: string): Promise<{
  token: string;
  tokenRecord: InvoiceToken;
}> {
  const supabase = createAdminClient();
  
  // Generate secure token and hash
  const { token, hash } = await generateTokenWithHash(32);
  
  // Revoke any existing active tokens for this invoice
  await supabase.rpc("revoke_invoice_tokens", { p_invoice_id: invoiceId });
  
  // Calculate expiry (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);
  
  // Insert new token
  const { data, error } = await supabase
    .from("bridge_invoice_access_tokens")
    .insert({
      invoice_id: invoiceId,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
      last_sent_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error("Failed to issue invoice token:", error);
    throw new Error("Failed to generate invoice access link");
  }
  
  return {
    token,
    tokenRecord: {
      id: data.id,
      invoiceId: data.invoice_id,
      tokenHash: data.token_hash,
      expiresAt: new Date(data.expires_at),
      spentForCheckout: data.spent_for_checkout,
      usedAt: data.used_at ? new Date(data.used_at) : null,
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
      lastSentAt: data.last_sent_at ? new Date(data.last_sent_at) : null,
      createdAt: new Date(data.created_at),
    },
  };
}

/**
 * Verify a token and return invoice details if valid
 * 
 * @param token - Raw token string from URL
 * @returns Verification result with token/invoice data or reason for failure
 */
export async function verifyInvoiceToken(
  token: string
): Promise<TokenVerificationResult> {
  const supabase = createAdminClient();
  
  // Hash the provided token
  const { hashToken: hashFn } = await import("./tokens");
  const hash = await hashFn(token);
  
  // Look up token by hash
  const { data: tokenData, error: tokenError } = await supabase
    .from("bridge_invoice_access_tokens")
    .select("*")
    .eq("token_hash", hash)
    .single();
  
  if (tokenError || !tokenData) {
    return {
      valid: false,
      reason: "not_found",
    };
  }
  
  const tokenRecord: InvoiceToken = {
    id: tokenData.id,
    invoiceId: tokenData.invoice_id,
    tokenHash: tokenData.token_hash,
    expiresAt: new Date(tokenData.expires_at),
    spentForCheckout: tokenData.spent_for_checkout,
    usedAt: tokenData.used_at ? new Date(tokenData.used_at) : null,
    revokedAt: tokenData.revoked_at ? new Date(tokenData.revoked_at) : null,
    lastSentAt: tokenData.last_sent_at ? new Date(tokenData.last_sent_at) : null,
    createdAt: new Date(tokenData.created_at),
  };
  
  // Check if revoked
  if (tokenRecord.revokedAt) {
    return {
      valid: false,
      token: tokenRecord,
      reason: "revoked",
    };
  }
  
  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    return {
      valid: false,
      token: tokenRecord,
      reason: "expired",
    };
  }
  
  // Fetch invoice details
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("bridge_invoices")
    .select(
      "id, studio_id, client_id, amount_cents, currency, status, description, due_date"
    )
    .eq("id", tokenRecord.invoiceId)
    .single();
  
  if (invoiceError || !invoiceData) {
    return {
      valid: false,
      token: tokenRecord,
      reason: "invoice_not_found",
    };
  }
  
  return {
    valid: true,
    token: tokenRecord,
    invoice: {
      id: invoiceData.id,
      studioId: invoiceData.studio_id,
      clientId: invoiceData.client_id,
      amountCents: invoiceData.amount_cents,
      currency: invoiceData.currency,
      status: invoiceData.status,
      description: invoiceData.description,
      dueDate: invoiceData.due_date,
    },
  };
}

/**
 * Mark a token as "spent for checkout"
 * This prevents creating multiple checkout sessions but still allows read-only access.
 * 
 * @param token - Raw token string
 * @returns true if successfully marked, false if token invalid/expired/revoked
 */
export async function markTokenSpentForCheckout(token: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  // Hash the token
  const { hashToken: hashFn } = await import("./tokens");
  const hash = await hashFn(token);
  
  // Call the DB function
  const { data, error } = await supabase.rpc("mark_token_spent_for_checkout", {
    p_token_hash: hash,
  });
  
  if (error) {
    console.error("Failed to mark token spent:", error);
    return false;
  }
  
  return data === true;
}

/**
 * Revoke all active tokens for an invoice
 * Typically called when issuing a new token (resend).
 * 
 * @param invoiceId - UUID of the bridge invoice
 */
export async function revokeInvoiceTokens(invoiceId: string): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase.rpc("revoke_invoice_tokens", {
    p_invoice_id: invoiceId,
  });
  
  if (error) {
    console.error("Failed to revoke invoice tokens:", error);
    throw new Error("Failed to revoke access links");
  }
}

/**
 * Build the full tokenized link URL for an invoice
 * 
 * @param token - Raw token string
 * @param baseUrl - Base URL of the application (e.g., https://app.salt.studio)
 * @returns Full URL for client to access invoice
 */
export function buildInvoiceTokenUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/invoices/${token}`;
}




