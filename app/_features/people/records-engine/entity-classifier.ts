import {
  extractDomain,
  extractNameFromEmail,
  isPersonalDomain,
} from "@/app/_features/capture/services/system-plays/person-signals";
import type { RecordsClassification, RecordsInput } from "./types";

const SYSTEM_SENDER_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "notifications",
  "notification",
  "automated",
  "mailer-daemon",
  "postmaster",
  "alerts",
  "updates",
  "receipts",
  "receipt",
];

const SHARED_ALIAS_PREFIXES = [
  "billing",
  "support",
  "hello",
  "info",
  "sales",
  "admin",
  "help",
  "contact",
  "team",
  "office",
  "accounts",
  "finance",
];

const NEWSLETTER_PREFIXES = ["newsletter", "marketing", "campaigns", "mail", "news"];
const SUSPICIOUS_TERMS = ["phish", "scam", "fraud", "verify-account", "wallet-alert"];

function normalizeEmail(email?: string): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed && trimmed.includes("@") ? trimmed : null;
}

function localPart(email: string | null): string | null {
  return email?.split("@")[0] ?? null;
}

function startsWithAny(value: string | null, prefixes: readonly string[]): boolean {
  if (!value) return false;
  return prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}.`) || value.startsWith(`${prefix}-`) || value.startsWith(`${prefix}_`));
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function looksLikeDomainOnly(input: RecordsInput, domain: string | null): boolean {
  const name = input.name?.trim().toLowerCase();
  if (!name) return Boolean(input.domain && !input.email);
  return Boolean(domain && (name === domain || name === domain.split(".")[0]));
}

export function classifyEntity(input: RecordsInput): RecordsClassification {
  const normalizedEmail = normalizeEmail(input.email);
  const local = localPart(normalizedEmail);
  const domain = normalizedEmail ? extractDomain(normalizedEmail) : input.domain?.trim().toLowerCase() ?? null;
  const reasons: string[] = [];

  if (normalizedEmail && containsAny(normalizedEmail, SUSPICIOUS_TERMS)) {
    return {
      entityType: "suspicious",
      normalizedEmail,
      domain,
      localPart: local,
      suggestedName: input.name?.trim() || null,
      reasons: ["Suspicious email pattern detected"],
    };
  }

  if (startsWithAny(local, SYSTEM_SENDER_PREFIXES)) {
    return {
      entityType: "system_sender",
      normalizedEmail,
      domain,
      localPart: local,
      suggestedName: input.name?.trim() || null,
      reasons: ["Automated sender pattern detected"],
    };
  }

  if (startsWithAny(local, NEWSLETTER_PREFIXES)) {
    return {
      entityType: "newsletter",
      normalizedEmail,
      domain,
      localPart: local,
      suggestedName: input.name?.trim() || null,
      reasons: ["Newsletter or broadcast sender pattern detected"],
    };
  }

  if (startsWithAny(local, SHARED_ALIAS_PREFIXES)) {
    return {
      entityType: "shared_alias",
      normalizedEmail,
      domain,
      localPart: local,
      suggestedName: input.name?.trim() || (domain ? domain.split(".")[0] : null),
      reasons: ["Shared inbox or generic alias pattern detected"],
    };
  }

  if (looksLikeDomainOnly(input, domain)) {
    return {
      entityType: "organization",
      normalizedEmail,
      domain,
      localPart: local,
      suggestedName: input.organizationName?.trim() || input.name?.trim() || domain,
      reasons: ["Company/domain-only input is an organization candidate"],
    };
  }

  if (!normalizedEmail && !input.name?.trim()) {
    return {
      entityType: "source_artifact",
      normalizedEmail: null,
      domain,
      localPart: null,
      suggestedName: null,
      reasons: ["No human name or email was provided"],
    };
  }

  const suggestedName = input.name?.trim() || (normalizedEmail ? extractNameFromEmail(normalizedEmail) : null);
  if (normalizedEmail && !isPersonalDomain(normalizedEmail)) {
    reasons.push("Company email domain can support person or organization context");
  }
  if (suggestedName) {
    reasons.push("Human-readable identity is present");
  }

  return {
    entityType: "person",
    normalizedEmail,
    domain,
    localPart: local,
    suggestedName,
    reasons,
  };
}

export const recordsEnginePatterns = {
  systemSenderPrefixes: SYSTEM_SENDER_PREFIXES,
  sharedAliasPrefixes: SHARED_ALIAS_PREFIXES,
  newsletterPrefixes: NEWSLETTER_PREFIXES,
  suspiciousTerms: SUSPICIOUS_TERMS,
};
