/**
 * Zod Validation Schemas for Billing Operations
 * Type-safe input validation for Server Actions and API routes
 */

import { z } from "zod";

// ============================================================================
// SaaS Subscription Schemas
// ============================================================================

export const SaasTierSchema = z.enum(["starter", "pro", "max", "enterprise"]);
export type SaasTier = z.infer<typeof SaasTierSchema>;

export const BillingIntervalSchema = z.enum(["month", "year"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const CreateSaasCheckoutSchema = z.object({
  tier: SaasTierSchema,
  interval: BillingIntervalSchema,
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});
export type CreateSaasCheckoutInput = z.infer<typeof CreateSaasCheckoutSchema>;

export const UpgradePlanSchema = z.object({
  newTier: SaasTierSchema,
  newInterval: BillingIntervalSchema.optional(),
});
export type UpgradePlanInput = z.infer<typeof UpgradePlanSchema>;

export const GetUpgradePreviewSchema = z.object({
  newTier: SaasTierSchema,
  newInterval: BillingIntervalSchema,
});
export type GetUpgradePreviewInput = z.infer<typeof GetUpgradePreviewSchema>;

// ============================================================================
// AI Credit Schemas
// ============================================================================

// Credit pack sizes (500, 1000, 2000 credits)
// Uses coerce to handle both string and number inputs
export const CreditPackSizeSchema = z.coerce.number().refine(
  (val): val is 500 | 1000 | 2000 => val === 500 || val === 1000 || val === 2000,
  { message: "Invalid credit pack size. Must be 500, 1000, or 2000" }
);
export type CreditPackSize = 500 | 1000 | 2000;

export const BuyCreditPackSchema = z.object({
  packSize: CreditPackSizeSchema,
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});
export type BuyCreditPackInput = z.infer<typeof BuyCreditPackSchema>;

export const DeductCreditsSchema = z.object({
  credits: z.number().positive("Credits must be positive"),
  operationType: z.string().min(1, "Operation type required"),
  actualCostUsd: z.number().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});
export type DeductCreditsInput = z.infer<typeof DeductCreditsSchema>;

// ============================================================================
// Stripe Connect Schemas
// ============================================================================

export const CountryCodeSchema = z.enum(["US", "CA", "GB", "AU", "EU"]);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

export const ConnectBusinessTypeSchema = z.enum(["individual", "company"]);
export type ConnectBusinessType = z.infer<typeof ConnectBusinessTypeSchema>;

export const CreateConnectAccountSchema = z.object({
  country: CountryCodeSchema.default("US"),
  businessType: ConnectBusinessTypeSchema.default("individual"),
  returnUrl: z.string().url("Invalid return URL"),
  refreshUrl: z.string().url("Invalid refresh URL"),
});
export type CreateConnectAccountInput = z.infer<typeof CreateConnectAccountSchema>;

// ============================================================================
// Bridge Invoice Schemas
// ============================================================================

export const CurrencySchema = z.enum(["usd", "cad", "gbp", "eur", "aud"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const CreateBridgeInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  projectId: z.string().uuid("Invalid project ID").optional(),
  amountCents: z.number().positive("Amount must be positive"),
  currency: CurrencySchema.default("usd"),
  description: z.string().min(1, "Description required").max(500, "Description too long"),
  dueDate: z.string().datetime().optional(),
});
export type CreateBridgeInvoiceInput = z.infer<typeof CreateBridgeInvoiceSchema>;

export const CreateBridgeInvoiceCheckoutSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});
export type CreateBridgeInvoiceCheckoutInput = z.infer<typeof CreateBridgeInvoiceCheckoutSchema>;

export const SendInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
});
export type SendInvoiceInput = z.infer<typeof SendInvoiceSchema>;

// ============================================================================
// Bridge Subscription (Retainer) Schemas
// ============================================================================

export const SubscriptionIntervalSchema = z.enum(["day", "week", "month", "year"]);
export type SubscriptionInterval = z.infer<typeof SubscriptionIntervalSchema>;

export const CreateBridgeRetainerSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  projectId: z.string().uuid("Invalid project ID").optional(),
  amountCents: z.number().positive("Amount must be positive"),
  currency: CurrencySchema.default("usd"),
  interval: SubscriptionIntervalSchema,
  intervalCount: z.number().positive().default(1),
  description: z.string().min(1, "Description required").max(500, "Description too long"),
  servicesIncluded: z.array(z.string()).optional(),
});
export type CreateBridgeRetainerInput = z.infer<typeof CreateBridgeRetainerSchema>;

export const CreateBridgeRetainerCheckoutSchema = z.object({
  retainerData: CreateBridgeRetainerSchema,
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});
export type CreateBridgeRetainerCheckoutInput = z.infer<typeof CreateBridgeRetainerCheckoutSchema>;

export const CancelRetainerSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID"),
  immediately: z.boolean().default(false),
});
export type CancelRetainerInput = z.infer<typeof CancelRetainerSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const SuccessResponseSchema = z.object({
  ok: z.literal(true),
  data: z.any(),
});
export type SuccessResponse<T = any> = {
  ok: true;
  data: T;
};

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  errorCode: z.string(),
  message: z.string(),
});
export type ErrorResponse = {
  ok: false;
  errorCode: string;
  message: string;
};

export type ActionResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response
 */
export function success<T>(data: T): SuccessResponse<T> {
  return { ok: true, data };
}

/**
 * Create an error response
 */
export function error(errorCode: string, message: string): ErrorResponse {
  return { ok: false, errorCode, message };
}

/**
 * Map Stripe errors to user-friendly messages
 */
export function mapStripeError(err: any): ErrorResponse {
  if (err.type === "StripeCardError") {
    return error("CARD_DECLINED", err.message || "Your card was declined");
  }
  if (err.type === "StripeInvalidRequestError") {
    return error("INVALID_REQUEST", "Invalid payment details");
  }
  if (err.code === "resource_missing") {
    return error("NOT_FOUND", "Resource not found");
  }
  if (err.code === "authentication_required") {
    return error("AUTH_REQUIRED", "Additional authentication required");
  }
  
  console.error("Stripe error:", err);
  return error("STRIPE_ERROR", "Payment processing failed. Please try again.");
}

/**
 * Safe schema parse with error handling
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ActionResponse<T> {
  try {
    const parsed = schema.parse(data);
    return success(parsed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0];
      return error(
        "VALIDATION_ERROR",
        firstError.message || "Invalid input"
      );
    }
    return error("PARSE_ERROR", "Failed to parse input");
  }
}

