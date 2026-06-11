import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { safeRedirectPath } from "@repo/security";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import type { ComposioWorkspaceProvider } from "./providers";

const STATE_TTL_MS = 15 * 60 * 1000;

export interface ComposioOAuthStatePayload {
  userId: string;
  workspaceId: string;
  provider: ComposioWorkspaceProvider;
  returnUrl: string;
  issuedAt: number;
}

interface SignedComposioOAuthState {
  payload: ComposioOAuthStatePayload;
  signature: string;
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

function signPayload(payload: ComposioOAuthStatePayload): string {
  return createHmac("sha256", getStateSecret())
    .update(JSON.stringify(payload))
    .digest("base64url");
}

function verifySignature(
  payload: ComposioOAuthStatePayload,
  signature: string,
): boolean {
  const expected = signPayload(payload);
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
    returnUrl,
    issuedAt: Date.now(),
  };

  const signed: SignedComposioOAuthState = {
    payload,
    signature: signPayload(payload),
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
      returnUrl,
    };
  } catch {
    return null;
  }
}
