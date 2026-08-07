/**
 * Get Similar Records - Find potential duplicates
 *
 * Searches for records with similar names, emails, or domains.
 * Used by Duplicate Detector playbook.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface SimilarityMatch {
  recordId: string;
  matchedRecordId: string;
  entityType: LearningEntityType;
  signal: string;
  confidence: number;
  because: string;
  recordA: {
    id: string;
    name: string;
    email?: string;
    domain?: string;
  };
  recordB: {
    id: string;
    name: string;
    email?: string;
    domain?: string;
  };
}

export interface GetSimilarInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  criteria?: {
    checkEmail?: boolean;
    checkPhone?: boolean;
    checkDomain?: boolean;
    checkName?: boolean;
    nameThreshold?: number;
  };
  limit?: number;
}

export interface GetSimilarResult {
  matches: SimilarityMatch[];
  scannedCount: number;
}

const DEFAULT_NAME_THRESHOLD = 0.85;

export async function memoryGetSimilarRecords(
  input: GetSimilarInput
): Promise<GetSimilarResult> {
  const {
    workspaceId,
    entityType,
    criteria = { checkEmail: true, checkDomain: true, checkName: true },
    limit = 100,
  } = input;

  const supabase = createAdminClient();
  const matches: SimilarityMatch[] = [];

  if (!entityType || entityType === "person") {
    const personMatches = await findPersonDuplicates(supabase, workspaceId, criteria, limit);
    matches.push(...personMatches);
  }

  if (!entityType || entityType === "organization") {
    const orgMatches = await findOrgDuplicates(supabase, workspaceId, criteria, limit);
    matches.push(...orgMatches);
  }

  if (!entityType || entityType === "billing") {
    const billingMatches = await findBillingDuplicates(supabase, workspaceId, limit);
    matches.push(...billingMatches);
  }

  return {
    matches: matches.slice(0, limit),
    scannedCount: matches.length,
  };
}

async function findPersonDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  criteria: GetSimilarInput["criteria"],
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  if (criteria?.checkEmail) {
    const { data: emailDupes } = await supabase
      .from("people")
      .select("id, name, email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .not("email", "is", null)
      .order("email");

    if (emailDupes) {
      const emailMap = new Map<string, typeof emailDupes>();
      for (const person of emailDupes) {
        const email = person.email?.toLowerCase();
        if (!email) continue;
        const existing = emailMap.get(email) || [];
        existing.push(person);
        emailMap.set(email, existing);
      }

      for (const [email, people] of emailMap) {
        if (people.length > 1) {
          for (let i = 0; i < people.length - 1; i++) {
            matches.push({
              recordId: people[i].id,
              matchedRecordId: people[i + 1].id,
              entityType: "person",
              signal: "person_duplicate_email",
              confidence: 98,
              because: `Same email address: ${email}`,
              recordA: {
                id: people[i].id,
                name: people[i].name || "",
                email: people[i].email || undefined,
              },
              recordB: {
                id: people[i + 1].id,
                name: people[i + 1].name || "",
                email: people[i + 1].email || undefined,
              },
            });
          }
        }
      }
    }
  }

  if (criteria?.checkPhone) {
    const { data: phoneDupes } = await supabase
      .from("people")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .not("phone", "is", null);

    if (phoneDupes) {
      const phoneMap = new Map<string, typeof phoneDupes>();
      for (const person of phoneDupes) {
        const phone = normalizePhone(person.phone);
        if (!phone) continue;
        const existing = phoneMap.get(phone) || [];
        existing.push(person);
        phoneMap.set(phone, existing);
      }

      for (const [phone, people] of phoneMap) {
        if (people.length > 1) {
          for (let i = 0; i < people.length - 1; i++) {
            matches.push({
              recordId: people[i].id,
              matchedRecordId: people[i + 1].id,
              entityType: "person",
              signal: "person_duplicate_phone",
              confidence: 85,
              because: `Same phone number: ${phone}`,
              recordA: {
                id: people[i].id,
                name: people[i].name || "",
              },
              recordB: {
                id: people[i + 1].id,
                name: people[i + 1].name || "",
              },
            });
          }
        }
      }
    }
  }

  return matches.slice(0, limit);
}

async function findOrgDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  criteria: GetSimilarInput["criteria"],
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  if (criteria?.checkDomain) {
    const { data: domainDupes } = await supabase
      .from("organizations")
      .select("id, name, website")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .not("website", "is", null);

    if (domainDupes) {
      const domainMap = new Map<string, typeof domainDupes>();
      for (const org of domainDupes) {
        const domain = extractDomain(org.website);
        if (!domain) continue;
        const existing = domainMap.get(domain) || [];
        existing.push(org);
        domainMap.set(domain, existing);
      }

      for (const [domain, orgs] of domainMap) {
        if (orgs.length > 1) {
          for (let i = 0; i < orgs.length - 1; i++) {
            matches.push({
              recordId: orgs[i].id,
              matchedRecordId: orgs[i + 1].id,
              entityType: "organization",
              signal: "org_duplicate_domain",
              confidence: 95,
              because: `Same domain: ${domain}`,
              recordA: {
                id: orgs[i].id,
                name: orgs[i].name || "",
                domain,
              },
              recordB: {
                id: orgs[i + 1].id,
                name: orgs[i + 1].name || "",
                domain,
              },
            });
          }
        }
      }
    }
  }

  return matches.slice(0, limit);
}

async function findBillingDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  const { data: numberDupes } = await supabase
    .from("billing_records")
    .select("id, number, amount_cents, due_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("number", "is", null);

  if (numberDupes) {
    const numberMap = new Map<string, typeof numberDupes>();
    for (const record of numberDupes) {
      const num = record.number?.toLowerCase().trim();
      if (!num) continue;
      const existing = numberMap.get(num) || [];
      existing.push(record);
      numberMap.set(num, existing);
    }

    for (const [num, records] of numberMap) {
      if (records.length > 1) {
        for (let i = 0; i < records.length - 1; i++) {
          matches.push({
            recordId: records[i].id,
            matchedRecordId: records[i + 1].id,
            entityType: "billing",
            signal: "billing_duplicate_number",
            confidence: 95,
            because: `Same invoice number: ${num}`,
            recordA: {
              id: records[i].id,
              name: records[i].number || "",
            },
            recordB: {
              id: records[i + 1].id,
              name: records[i + 1].number || "",
            },
          });
        }
      }
    }
  }

  return matches.slice(0, limit);
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, "");
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}
