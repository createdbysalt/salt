/**
 * Client-safe provider / SDK error sanitization.
 * Use before showing any external error text in product UI.
 */

export type ProviderErrorMatch = {
  message: string;
  /** When true, the match is specific enough to show without a SALT reference ID. */
  actionable?: boolean;
};

const SALT_REF_PATTERN = /SALT-[A-F0-9]{8}/;

const PROVIDER_MARKERS = [
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "composio",
  "content filter",
  "guardrail",
  "prompt injection",
  "api key",
  "api_key",
  "rate limit",
  "rate_limit",
  "quota",
  "insufficient credits",
  "payload too large",
  "payload_too_large",
  "context length",
  "maximum context",
  "status code",
  "error_type",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  "overloaded",
  "model not found",
  "invalid_request",
  "content_policy",
];

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message.trim();
  }
  return "Unknown error";
}

/** Salt-generated copy that is already safe to render. */
export function isSaltUserFacingMessage(message: string): boolean {
  if (!message) return false;
  if (SALT_REF_PATTERN.test(message)) return true;
  if (message.startsWith("Ask Salt")) return true;
  if (message.startsWith("Something went wrong")) return true;
  if (message.includes("support@usesalt.io")) return true;
  return false;
}

/** Heuristic: message looks like a provider/SDK payload, not product copy. */
export function looksLikeProviderError(message: string): boolean {
  if (!message) return false;
  if (isSaltUserFacingMessage(message)) return false;

  const lower = message.toLowerCase();
  if (PROVIDER_MARKERS.some((marker) => lower.includes(marker))) return true;
  if (/^(error|request blocked|failed to|api error)/i.test(message)) return true;
  if (/\b(4\d{2}|5\d{2})\b/.test(message) && lower.includes("error")) return true;
  if (message.includes("{") && message.includes("error")) return true;

  return false;
}

export function matchKnownProviderError(message: string): ProviderErrorMatch | null {
  const lower = message.toLowerCase();

  if (
    lower.includes("content filter") ||
    (lower.includes("guardrail") && lower.includes("block"))
  ) {
    return {
      message:
        "Salt could not process that request because of a safety or size limit. Try a shorter message, start a new chat, or ask again in a moment.",
      actionable: true,
    };
  }

  if (
    lower.includes("payload too large") ||
    lower.includes("payload_too_large") ||
    lower.includes("request entity too large") ||
    lower.includes("maximum size") ||
    lower.includes("context length") ||
    lower.includes("maximum context") ||
    lower.includes("token limit")
  ) {
    return {
      message:
        "That request was too large for Salt to handle in one go. Try a shorter message or start a new chat.",
      actionable: true,
    };
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return {
      message: "Salt is receiving too many requests right now. Wait a moment and try again.",
      actionable: true,
    };
  }

  if (
    lower.includes("insufficient credits") ||
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("payment required") ||
    lower.includes("402")
  ) {
    return {
      message:
        "Salt cannot reach the AI service right now because of an account limit. Try again later or contact support.",
      actionable: true,
    };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("gateway timeout") ||
    lower.includes("504")
  ) {
    return {
      message: "Salt took too long to respond. Try again with a shorter request.",
      actionable: true,
    };
  }

  if (
    lower.includes("service unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("bad gateway") ||
    lower.includes("502") ||
    lower.includes("503")
  ) {
    return {
      message: "The AI service is temporarily unavailable. Try again in a moment.",
      actionable: true,
    };
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return {
      message: "Salt could not reach the AI service. Try again later or contact support.",
      actionable: true,
    };
  }

  if (lower.includes("model not found") || lower.includes("not_found")) {
    return {
      message: "Salt could not use the configured AI model. Try again later or contact support.",
      actionable: true,
    };
  }

  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("failed to fetch")) {
    return {
      message: "Salt lost connection while responding. Check your network and try again.",
      actionable: true,
    };
  }

  return null;
}

export type SanitizeProviderErrorOptions = {
  /** Product-specific matcher run before generic provider patterns. */
  matchProductError?: (message: string) => string | null;
  /** Shown when no safe mapping exists (client-side; no SALT id). */
  genericMessage?: string;
  /** In development, return the raw provider message for debugging. */
  exposeRawInDevelopment?: boolean;
};

/**
 * Resolve user-visible copy for an external/provider failure.
 * Never returns raw provider text in production unless it is already Salt-safe.
 */
export function sanitizeProviderErrorForUser(
  error: unknown,
  options: SanitizeProviderErrorOptions = {},
): string {
  const raw = extractErrorMessage(error);
  const {
    matchProductError,
    genericMessage = "Something went wrong while Salt was responding. Please try again.",
    exposeRawInDevelopment = true,
  } = options;

  if (isSaltUserFacingMessage(raw)) return raw;

  const productMatch = matchProductError?.(raw);
  if (productMatch) return productMatch;

  const known = matchKnownProviderError(raw);
  if (known) return known.message;

  if (process.env.NODE_ENV === "development" && exposeRawInDevelopment && raw) {
    return raw;
  }

  if (!looksLikeProviderError(raw) && raw.length > 0 && raw.length < 200) {
    // Short, non-provider messages may be intentional app copy — but still avoid
    // leaking if they contain obvious internals.
    const lower = raw.toLowerCase();
    if (!lower.includes("supabase") && !lower.includes("postgres") && !lower.includes("sql")) {
      return raw;
    }
  }

  return genericMessage;
}
