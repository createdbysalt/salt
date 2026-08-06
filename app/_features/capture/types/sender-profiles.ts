export type CaptureSenderKind =
  | "client"
  | "vendor_saas"
  | "payment_rail"
  | "newsletter"
  | "transactional"
  | "personal"
  | "unknown";

export type CaptureSenderProfileSource =
  | "user_dismiss"
  | "user_confirm"
  | "auto_receipt"
  | "auto_scan"
  | "manual";

export interface CaptureSenderProfileRow {
  id: string;
  workspace_id: string;
  sender_key: string;
  sender_key_type: "email" | "domain";
  kind: CaptureSenderKind;
  vendor_name: string | null;
  source: CaptureSenderProfileSource;
  confidence: number;
  evidence_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  email_type: "personal" | "transactional" | "promotional" | "automated" | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  capture_count: number;
  user_archived_count: number;
  user_replied_count: number;
  reputation_score: number;
  last_calculated_at: string | null;
}

export interface SenderProfileRegistryEntry {
  kind: CaptureSenderKind;
  vendorName?: string;
  source: CaptureSenderProfileSource;
  confidence: number;
}

/** In-memory index loaded once per scan / classification batch. */
export interface SenderProfileRegistry {
  byEmail: Map<string, SenderProfileRegistryEntry>;
  byDomain: Map<string, SenderProfileRegistryEntry>;
}

export function parseSenderEmail(fromEmail: string): {
  email: string;
  domain: string;
  local: string;
} {
  const email = fromEmail.toLowerCase().trim();
  const at = email.indexOf("@");
  if (at === -1) {
    return { email, domain: "", local: email };
  }
  return {
    email,
    domain: email.slice(at + 1),
    local: email.slice(0, at),
  };
}

export function lookupSenderProfile(
  registry: SenderProfileRegistry,
  fromEmail: string
): SenderProfileRegistryEntry | null {
  const { email, domain } = parseSenderEmail(fromEmail);
  if (!domain) return null;

  const byEmail = registry.byEmail.get(email);
  if (byEmail) return byEmail;

  return registry.byDomain.get(domain) ?? null;
}

export function emptySenderProfileRegistry(): SenderProfileRegistry {
  return {
    byEmail: new Map(),
    byDomain: new Map(),
  };
}
