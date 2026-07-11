import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { safeRedirectPath } from "@repo/security";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

const STATE_TTL_MS = 15 * 60 * 1000;

/** How the OAuth flow is presented; drives the callback's completion UI. */
export type ComposioOAuthDisplay = "popup" | "page";

export interface ComposioOAuthStatePayload {
  userId: string;
  workspaceId: string;
  /** Registry provider key — validated against the DB registry at callback. */
  provider: string;
  returnUrl: string;
  issuedAt: number;
  /**
   * Carried in the signed state because nothing browser-side survives the
   * OAuth round trip: Google's COOP headers reset window.name and give the
   * popup fresh sessionStorage. Absent = "page" (legacy full-page flow).
   */
  display?: ComposioOAuthDisplay;
}

interface SignedComposioOAuthState {
  payload: ComposioOAuthStatePayload;
  signature: string;
}

/** Fields bound by the HMAC — excludes returnUrl (validated via safeRedirectPath). */
interface ComposioOAuthSignedFields {
  userId: string;
  workspaceId: string;
  provider: string;
  issuedAt: number;
  display?: ComposioOAuthDisplay;
}

function getStateSecret(): string {
  const secret =
    process.env.COMPOSIO_OAUTH_STATE_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing COMPOSIO_OAUTH_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY for OAuth state signing",
    );
  }

  return secret;
}

function toSignedFields(
  payload: ComposioOAuthStatePayload,
): ComposioOAuthSignedFields {
  return {
    userId: payload.userId,
    workspaceId: payload.workspaceId,
    provider: payload.provider,
    issuedAt: payload.issuedAt,
    display: payload.display === "popup" ? "popup" : undefined,
  };
}

function canonicalSignedState(fields: ComposioOAuthSignedFields): string {
  return [
    "v1",
    fields.userId,
    fields.workspaceId,
    fields.provider,
    String(fields.issuedAt),
    fields.display ?? "",
  ].join("\x1f");
}

function signSignedFields(fields: ComposioOAuthSignedFields): string {
  return createHmac("sha256", getStateSecret())
    .update(canonicalSignedState(fields))
    .digest("base64url");
}

function verifySignature(
  payload: ComposioOAuthStatePayload,
  signature: string,
): boolean {
  const expected = signSignedFields(toSignedFields(payload));
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function encodeComposioOAuthState(
  input: Omit<ComposioOAuthStatePayload, "issuedAt">,
): string {
  const returnUrl = safeRedirectPath(input.returnUrl) ?? connectorsPageUrl();

  const payload: ComposioOAuthStatePayload = {
    ...input,
    display: input.display === "popup" ? "popup" : undefined,
    returnUrl,
    issuedAt: Date.now(),
  };

  const signed: SignedComposioOAuthState = {
    payload,
    signature: signSignedFields(toSignedFields(payload)),
  };

  return Buffer.from(JSON.stringify(signed)).toString("base64url");
}

export function decodeComposioOAuthState(
  state: string,
): ComposioOAuthStatePayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as SignedComposioOAuthState;

    if (!parsed?.payload || !parsed.signature) {
      return null;
    }

    const { payload, signature } = parsed;

    if (
      !payload.userId ||
      !payload.workspaceId ||
      !payload.provider ||
      !payload.returnUrl ||
      typeof payload.issuedAt !== "number"
    ) {
      return null;
    }

    if (!verifySignature(payload, signature)) {
      return null;
    }

    if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
      return null;
    }

    const returnUrl = safeRedirectPath(payload.returnUrl);
    if (!returnUrl) {
      return null;
    }

    return {
      ...payload,
      display: payload.display === "popup" ? "popup" : undefined,
      returnUrl,
    };
  } catch {
    return null;
  }
}
