import "server-only";

import { OAuth2Client } from "google-auth-library";
import { Webhook } from "svix";

const googleOidcClient = new OAuth2Client();

/**
 * Verify Recall Calendar webhook signatures (Svix).
 */
export function verifyRecallCalendarSvixSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
): boolean {
  const secret =
    process.env.RECALL_CALENDAR_WEBHOOK_SECRET ?? process.env.RECALL_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "RECALL_CALENDAR_WEBHOOK_SECRET not set — skipping Svix verification (dev only)",
    );
    return process.env.NODE_ENV !== "production";
  }

  if (!headers.svixId || !headers.svixTimestamp || !headers.svixSignature) {
    return false;
  }

  try {
    const wh = new Webhook(secret);
    wh.verify(payload, {
      "svix-id": headers.svixId,
      "svix-timestamp": headers.svixTimestamp,
      "svix-signature": headers.svixSignature,
    });
    return true;
  } catch (error) {
    console.error("Recall calendar Svix verification failed:", error);
    return false;
  }
}

export interface GmailPubSubOidcOptions {
  audience?: string;
  /** Optional expected service account email in the token `email` claim */
  serviceAccountEmail?: string;
}

/**
 * Verify Google Pub/Sub push OIDC token (Authorization: Bearer <JWT>).
 */
export async function verifyGmailPubSubOidcToken(
  authorizationHeader: string | null,
  options: GmailPubSubOidcOptions = {},
): Promise<boolean> {
  if (
    process.env.GMAIL_PUBSUB_SKIP_VERIFICATION === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn("GMAIL_PUBSUB_SKIP_VERIFICATION enabled — skipping OIDC (dev only)");
    return true;
  }

  const audience =
    options.audience ??
    process.env.GMAIL_PUBSUB_PUSH_AUDIENCE ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/webhooks/gmail`;

  const expectedEmail =
    options.serviceAccountEmail ?? process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) return false;

  try {
    const ticket = await googleOidcClient.verifyIdToken({
      idToken: token,
      audience,
    });

    const payload = ticket.getPayload();
    if (!payload) return false;

    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      return false;
    }

    if (expectedEmail && payload.email !== expectedEmail) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Gmail Pub/Sub OIDC verification failed:", error);
    return false;
  }
}
