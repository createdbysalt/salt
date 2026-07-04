import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Composio Webhook Subscriptions signature verification (Phase 3.1).
 *
 * Delivery signs `${webhookId}.${webhookTimestamp}.${body}` with
 * HMAC-SHA256; the signature header carries space-separated
 * `v1,<base64>` entries (key-rotation can produce several). Secrets may be
 * issued with a `whsec_` prefix over a base64 key (Svix convention).
 */

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export interface ComposioWebhookHeaders {
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

function secretBytes(secret: string): Buffer {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice("whsec_".length), "base64");
  }
  return Buffer.from(secret, "utf8");
}

export function verifyComposioWebhookSignature(
  body: string,
  headers: ComposioWebhookHeaders,
  secret: string,
  options?: { toleranceSeconds?: number; nowMs?: number },
): boolean {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature || !secret) {
    return false;
  }

  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  const nowSeconds = (options?.nowMs ?? Date.now()) / 1000;
  const tolerance = options?.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - timestamp) > tolerance) {
    return false;
  }

  const expected = createHmac("sha256", secretBytes(secret))
    .update(`${webhookId}.${webhookTimestamp}.${body}`)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);

  for (const entry of webhookSignature.split(" ")) {
    const [version, signature] = entry.split(",", 2);
    if (version !== "v1" || !signature) continue;
    const candidate = Buffer.from(signature);
    if (
      candidate.length === expectedBuffer.length &&
      timingSafeEqual(candidate, expectedBuffer)
    ) {
      return true;
    }
  }
  return false;
}
