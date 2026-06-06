import {
  WAITLIST_QUAL_STEPS,
  type WaitlistQualStep,
} from "@/app/_features/marketing/waitlist-qualification";

export const EMAIL_MAX_LENGTH = 254;
export const SOURCE_MAX_LENGTH = 64;
export const METADATA_MAX_BYTES = 8 * 1024;
export const DEFAULT_WAITLIST_SOURCE = "landing2";

export type WaitlistLeadStatus = "partial" | "complete";

export type WaitlistQualification = {
  primaryBusiness?: string;
  annualRevenue?: string;
  operationalBottleneck?: string;
  tools?: string;
  hearAbout?: string;
};

export type WaitlistLeadMetadata = {
  status: WaitlistLeadStatus;
  qualification?: WaitlistQualification;
  last_step?: string;
  completed_at?: string;
  funnel_source?: string;
};

const QUAL_FIELDS = new Set(
  WAITLIST_QUAL_STEPS.map((step) => step.field)
);

const ALLOWED_LAST_STEPS = new Set<string>(["email", ...QUAL_FIELDS]);

const OPTIONS_BY_FIELD = new Map<string, Set<string>>(
  WAITLIST_QUAL_STEPS.map((step) => [
    step.field,
    new Set(step.options?.map((option) => option.value) ?? []),
  ])
);

const STEP_BY_FIELD = new Map<string, WaitlistQualStep>(
  WAITLIST_QUAL_STEPS.map((step) => [step.field, step])
);

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function capSource(source: string | undefined): string {
  const trimmed = (source ?? "").trim().toLowerCase().slice(0, SOURCE_MAX_LENGTH);
  const sanitized = trimmed.replace(/[^a-z0-9_-]/g, "");
  return sanitized.length > 0 ? sanitized : DEFAULT_WAITLIST_SOURCE;
}

function sanitizeQualValue(
  field: string,
  value: string | undefined
): string | undefined {
  if (typeof value !== "string") return undefined;

  const allowed = OPTIONS_BY_FIELD.get(field);
  if (!allowed) return undefined;

  const step = STEP_BY_FIELD.get(field);
  if (!step) return undefined;

  if (step.type === "multi") {
    const tokens = value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    const filtered = tokens.filter((token) => allowed.has(token));
    return filtered.length > 0 ? filtered.join(",") : undefined;
  }

  const trimmed = value.trim();
  return allowed.has(trimmed) ? trimmed : undefined;
}

export function sanitizeQualification(
  input: Partial<WaitlistQualification> | Record<string, string> | undefined
): WaitlistQualification {
  if (!input) return {};

  const result: WaitlistQualification = {};

  for (const [key, value] of Object.entries(input)) {
    if (!QUAL_FIELDS.has(key)) continue;
    const sanitized = sanitizeQualValue(key, value);
    if (sanitized) {
      result[key as keyof WaitlistQualification] = sanitized;
    }
  }

  return result;
}

export function sanitizeLastStep(lastStep: string | undefined): string | undefined {
  if (!lastStep) return undefined;
  const trimmed = lastStep.trim();
  return ALLOWED_LAST_STEPS.has(trimmed) ? trimmed : undefined;
}

function normalizeExistingMetadata(
  raw: Record<string, unknown> | null | undefined
): WaitlistLeadMetadata {
  if (!raw || typeof raw !== "object") {
    return { status: "partial" };
  }

  const qualification =
    raw.qualification && typeof raw.qualification === "object"
      ? sanitizeQualification(
          raw.qualification as Partial<WaitlistQualification>
        )
      : undefined;

  const status =
    raw.status === "complete" || raw.status === "partial"
      ? raw.status
      : qualification && Object.keys(qualification).length > 0
        ? "partial"
        : "partial";

  const lastStep =
    typeof raw.last_step === "string"
      ? sanitizeLastStep(raw.last_step)
      : undefined;

  const completedAt =
    typeof raw.completed_at === "string" ? raw.completed_at : undefined;

  const funnelSource =
    typeof raw.funnel_source === "string"
      ? capSource(raw.funnel_source)
      : undefined;

  return {
    status,
    ...(qualification && Object.keys(qualification).length > 0
      ? { qualification }
      : {}),
    ...(lastStep ? { last_step: lastStep } : {}),
    ...(completedAt ? { completed_at: completedAt } : {}),
    ...(funnelSource ? { funnel_source: funnelSource } : {}),
  };
}

export function mergeWaitlistMetadata(
  existing: Record<string, unknown> | null | undefined,
  incoming: {
    status: WaitlistLeadStatus;
    qualification?: Partial<WaitlistQualification>;
    lastStep?: string;
    source: string;
  }
): WaitlistLeadMetadata {
  const base = normalizeExistingMetadata(existing);
  const incomingQual = sanitizeQualification(incoming.qualification);
  const mergedQualification: WaitlistQualification = {
    ...base.qualification,
    ...incomingQual,
  };

  const hasQualification = Object.keys(mergedQualification).length > 0;
  const status =
    base.status === "complete" || incoming.status === "complete"
      ? "complete"
      : "partial";

  const lastStep = sanitizeLastStep(incoming.lastStep) ?? base.last_step;
  const completedAt =
    status === "complete"
      ? base.completed_at ?? new Date().toISOString()
      : base.completed_at;

  return {
    status,
    ...(hasQualification ? { qualification: mergedQualification } : {}),
    ...(lastStep ? { last_step: lastStep } : {}),
    ...(completedAt ? { completed_at: completedAt } : {}),
    funnel_source: incoming.source,
  };
}

export function assertMetadataWithinLimit(metadata: WaitlistLeadMetadata): void {
  const serialized = JSON.stringify(metadata);
  const byteLength = new TextEncoder().encode(serialized).length;
  if (byteLength > METADATA_MAX_BYTES) {
    throw new Error("Waitlist metadata exceeds size limit.");
  }
}

export function buildWaitlistRow({
  email,
  source,
  metadata,
}: {
  email: string;
  source: string;
  metadata: WaitlistLeadMetadata;
}) {
  assertMetadataWithinLimit(metadata);

  return {
    email: email.trim(),
    normalized_email: normalizeWaitlistEmail(email),
    source,
    metadata,
  };
}
