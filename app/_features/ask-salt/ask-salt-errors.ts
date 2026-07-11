import { DEFAULT_SUPPORT_EMAIL, safeUserMessage } from "@/app/_lib/errors";
import {
  extractErrorMessage,
  isSaltUserFacingMessage,
  matchKnownProviderError,
  sanitizeProviderErrorForUser,
} from "@/app/_lib/errors/provider-errors";

const CONTEXT_TOO_LONG_MESSAGE =
  "This chat got too long for Salt to search everything at once. Start a new chat with the pencil button above, then ask again — Salt still has access to your connected accounts.";

const ASK_SALT_GENERIC_MESSAGE =
  "Something went wrong while Ask Salt was responding. Please try again.";

const ASK_SALT_TOOL_FAILURE_FALLBACK =
  "I wasn't able to finish that request — one or more steps hit an issue. Check Thought for details, or tell me if you'd like me to try again a different way.";

type AskSaltToolPartLike = {
  state?: string;
};

function isFailedToolPart(part: AskSaltToolPartLike): boolean {
  return part.state === "output-error" || part.state === "output-denied";
}

/** User-facing copy when the model ends a turn with tool failures but no prose. */
export function askSaltEmptyReplyFallback(
  toolParts: readonly AskSaltToolPartLike[],
): string | null {
  if (toolParts.length === 0) return null;
  if (!toolParts.some(isFailedToolPart)) return null;
  return ASK_SALT_TOOL_FAILURE_FALLBACK;
}

const DEV_MISSING_LLM_MESSAGE =
  "Ask Salt needs an LLM API key. Use pnpm dev:op (or add OPENROUTER_API_KEY to your env) and restart the dev server.";

function matchAskSaltProductError(message: string): string | null {
  const lower = message.toLowerCase();

  if (
    (lower.includes("content filter") || lower.includes("guardrail")) &&
    (lower.includes("maximum size") || lower.includes("exceeds") || lower.includes("too large"))
  ) {
    return CONTEXT_TOO_LONG_MESSAGE;
  }

  if (
    lower.includes("payload too large") ||
    lower.includes("payload_too_large") ||
    lower.includes("context length") ||
    lower.includes("maximum context") ||
    lower.includes("token limit")
  ) {
    return CONTEXT_TOO_LONG_MESSAGE;
  }

  if (process.env.NODE_ENV === "development" && message.startsWith("Ask Salt")) {
    return message;
  }

  if (process.env.NODE_ENV === "development" && message.includes("No LLM configured")) {
    return DEV_MISSING_LLM_MESSAGE;
  }

  return null;
}

/** Client-safe: never surfaces raw provider errors in production. */
export function resolveAskSaltClientError(error: unknown): string {
  return sanitizeProviderErrorForUser(error, {
    matchProductError: matchAskSaltProductError,
    genericMessage: ASK_SALT_GENERIC_MESSAGE,
  });
}

/**
 * Server stream errors: known cases get actionable copy; everything else logs
 * with a SALT reference ID via the shared error reporter.
 */
export function resolveAskSaltServerStreamError(
  error: unknown,
  report: (error: unknown) => { userMessage: string },
): string {
  const raw = extractErrorMessage(error);
  if (isSaltUserFacingMessage(raw)) return raw;

  const productMatch = matchAskSaltProductError(raw);
  if (productMatch) return productMatch;

  const known = matchKnownProviderError(raw);
  if (known?.actionable) return known.message;

  return report(error).userMessage;
}

/** @deprecated Use resolveAskSaltClientError or resolveAskSaltServerStreamError */
export function mapAskSaltErrorMessage(error: unknown): string | null {
  const resolved = sanitizeProviderErrorForUser(error, {
    matchProductError: matchAskSaltProductError,
    genericMessage: ASK_SALT_GENERIC_MESSAGE,
    exposeRawInDevelopment: false,
  });
  if (resolved === ASK_SALT_GENERIC_MESSAGE) return null;
  return resolved;
}

export function askSaltSupportMessage(errorId: string): string {
  return safeUserMessage({
    errorId,
    action: "while Ask Salt was responding",
    supportEmail: DEFAULT_SUPPORT_EMAIL,
  });
}
