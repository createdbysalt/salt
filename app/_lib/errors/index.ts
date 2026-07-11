import { logger } from "@/app/_lib/logger";

export const DEFAULT_SUPPORT_EMAIL = "support@usesalt.io";

type ErrorContext = Record<string, unknown>;

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;

  constructor(input: { code: AppErrorCode; message: string; userMessage?: string }) {
    super(input.message);
    this.name = "AppError";
    this.code = input.code;
    this.userMessage = input.userMessage ?? input.message;
  }
}

export type SafeErrorReport = {
  errorId: string;
  userMessage: string;
};

export function newErrorRef(): string {
  return `SALT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function safeUserMessage(input: {
  errorId: string;
  action?: string;
  supportEmail?: string;
  message?: string;
}): string {
  const supportEmail = input.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
  const action = input.action ? ` ${input.action}` : "";
  const base =
    input.message ?? `Something went wrong${action} on our end. Please try again.`;

  return `${base} If it keeps happening, contact ${supportEmail} and mention ${input.errorId}.`;
}

export function reportError(input: {
  scope: string;
  error: unknown;
  context?: ErrorContext;
  action?: string;
  supportEmail?: string;
  errorId?: string;
}): SafeErrorReport {
  const errorId = input.errorId ?? newErrorRef();
  const knownSafeMessage =
    input.error instanceof AppError ? input.error.userMessage : undefined;
  const userMessage = safeUserMessage({
    errorId,
    action: input.action,
    supportEmail: input.supportEmail,
    message: knownSafeMessage,
  });

  logger.error(`[${input.scope}] ${errorId}`, input.error, {
    ...input.context,
    errorId,
  });

  return { errorId, userMessage };
}

export {
  extractErrorMessage,
  isSaltUserFacingMessage,
  looksLikeProviderError,
  matchKnownProviderError,
  sanitizeProviderErrorForUser,
} from "./provider-errors";
