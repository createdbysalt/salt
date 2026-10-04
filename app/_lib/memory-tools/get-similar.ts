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

  if (!entityType || entityType === "work") {
    const workMatches = await findWorkDuplicates(supabase, workspaceId, limit);
    matches.push(...workMatches);
  }

  if (!entityType || entityType === "resource") {
    const fileMatches = await findFileDuplicates(supabase, workspaceId, limit);
    matches.push(...fileMatches);
  }

  if (!entityType || entityType === "meeting") {
    const meetingMatches = await findMeetingDuplicates(supabase, workspaceId, limit);
    matches.push(...meetingMatches);
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
  // Pair dedupe across signals — the strongest signal for a pair wins.
  const emittedPairs = new Set<string>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}::${b}` : `${b}::${a}`);

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
            emittedPairs.add(pairKey(people[i].id, people[i + 1].id));
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
            if (emittedPairs.has(pairKey(people[i].id, people[i + 1].id))) continue;
            emittedPairs.add(pairKey(people[i].id, people[i + 1].id));
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

  if (criteria?.checkName) {
    const { data: people } = await supabase
      .from("people")
      .select("id, name, email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .not("name", "is", null);

    // Local-part correlation reads the full identity set, not just the
    // primary — jane.example@outlook.com should correlate with "Jane Example"
    // even when her record's primary is lisa@studio.com.
    const { data: emailRows } = await supabase
      .from("person_emails")
      .select("person_id, email")
      .eq("workspace_id", workspaceId);

    const emailsByPerson = new Map<string, Set<string>>();
    for (const row of emailRows ?? []) {
      const set = emailsByPerson.get(row.person_id) ?? new Set<string>();
      set.add(row.email.toLowerCase());
      emailsByPerson.set(row.person_id, set);
    }

    type PersonRow = { id: string; name: string | null; email: string | null };
    const rows = (people ?? []) as PersonRow[];

    const pushNameMatch = (
      a: PersonRow,
      b: PersonRow,
      signal: string,
      confidence: number,
      because: string,
    ) => {
      const key = pairKey(a.id, b.id);
      if (emittedPairs.has(key)) return;
      emittedPairs.add(key);
      matches.push({
        recordId: a.id,
        matchedRecordId: b.id,
        entityType: "person",
        signal,
        confidence,
        because,
        recordA: { id: a.id, name: a.name ?? "", email: a.email ?? undefined },
        recordB: { id: b.id, name: b.name ?? "", email: b.email ?? undefined },
      });
    };

    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        const nameA = normalizePersonName(a.name);
        const nameB = normalizePersonName(b.name);
        if (!nameA || !nameB) continue;

        if (nameA === nameB) {
          const emailA = a.email?.toLowerCase() ?? null;
          const emailB = b.email?.toLowerCase() ?? null;
          if (emailA && emailB && emailA === emailB) continue; // email signal owns this pair
          pushNameMatch(
            a,
            b,
            "person_duplicate_name_exact",
            85,
            `Same name: ${a.name}`,
          );
          continue;
        }

        // Email local-part correlation: jane.example@ → "lisa trent" matching
        // the other record's name. Strongest when one record has no email.
        // Checked before subset — it's the stronger evidence when both fire.
        const addressesOf = (person: PersonRow): Set<string> => {
          const set = new Set(emailsByPerson.get(person.id) ?? []);
          if (person.email) set.add(person.email.toLowerCase());
          return set;
        };
        const localPartMatch =
          [...addressesOf(a)].some((addr) => localPartAsName(addr) === nameB) ||
          [...addressesOf(b)].some((addr) => localPartAsName(addr) === nameA);
        if (localPartMatch) {
          pushNameMatch(
            a,
            b,
            "person_duplicate_name_local_part",
            85,
            `Email address matches the other record's name: "${a.name}" ↔ "${b.name}"`,
          );
          continue;
        }

        // Subset/prefix: one name's tokens are a subset of the other's
        // ("Lisa" ⊂ "Jane Example"). Medium confidence — always user-approved.
        const tokensA = new Set(nameA.split(" "));
        const tokensB = new Set(nameB.split(" "));
        const aSubsetOfB = [...tokensA].every((t) => tokensB.has(t));
        const bSubsetOfA = [...tokensB].every((t) => tokensA.has(t));
        if (aSubsetOfB || bSubsetOfA) {
          pushNameMatch(
            a,
            b,
            "person_duplicate_name_subset",
            70,
            `Overlapping names: "${a.name}" and "${b.name}"`,
          );
        }
      }
    }
  }

  return matches.slice(0, limit);
}

/** "Lisa  Trent!" → "lisa trent" — lowercase, punctuation-free, single-spaced. */
function normalizePersonName(name: string | null): string | null {
  if (!name) return null;
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

/** "jane.example+news@outlook.com" → "lisa trent" — the name an address encodes. */
function localPartAsName(email: string): string | null {
  const local = email.split("@")[0];
  if (!local) return null;
  const withoutPlus = local.split("+")[0];
  const normalized = withoutPlus
    .toLowerCase()
    .replace(/[._\-]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Require at least two tokens — a bare "lisa@" correlating with every
  // "Lisa" is a coincidence engine, not a merge signal.
  return normalized.includes(" ") ? normalized : null;
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

/**
 * Work duplicates: same name under the same organization. Name-only matches
 * without an org are too weak ("Website redesign" recurs legitimately), so
 * org-less records never pair.
 */
async function findWorkDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  const { data: workRows } = await supabase
    .from("work")
    .select("id, name, organization_id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("organization_id", "is", null);

  if (workRows) {
    const keyMap = new Map<string, typeof workRows>();
    for (const row of workRows) {
      const name = row.name?.toLowerCase().trim();
      if (!name || !row.organization_id) continue;
      const key = `${row.organization_id}::${name}`;
      const existing = keyMap.get(key) || [];
      existing.push(row);
      keyMap.set(key, existing);
    }

    for (const rows of keyMap.values()) {
      if (rows.length > 1) {
        const name = rows[0].name || "";
        for (let i = 0; i < rows.length - 1; i++) {
          matches.push({
            recordId: rows[i].id,
            matchedRecordId: rows[i + 1].id,
            entityType: "work",
            signal: "work_duplicate_name_same_org",
            confidence: 88,
            because: `Same name under the same organization: ${name}`,
            recordA: { id: rows[i].id, name },
            recordB: { id: rows[i + 1].id, name },
          });
        }
      }
    }
  }

  return matches.slice(0, limit);
}

/**
 * Resource duplicates: links pair on the same normalized URL; uploads pair
 * on the same file name under the same linked record (org or person), with
 * a confidence bump when the byte sizes also match.
 */
async function findFileDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  const { data: files } = await supabase
    .from("resources")
    .select(
      "id, file_name, file_type, external_url, size_bytes, organization_id, person_id"
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (!files) return matches;

  type FileRow = (typeof files)[number];

  const pushPairs = (
    rows: FileRow[],
    signal: string,
    confidence: (_a: FileRow, _b: FileRow) => number,
    because: (_a: FileRow, _b: FileRow) => string
  ) => {
    for (let i = 0; i < rows.length - 1; i++) {
      matches.push({
        recordId: rows[i].id,
        matchedRecordId: rows[i + 1].id,
        entityType: "resource",
        signal,
        confidence: confidence(rows[i], rows[i + 1]),
        because: because(rows[i], rows[i + 1]),
        recordA: { id: rows[i].id, name: rows[i].file_name || "" },
        recordB: { id: rows[i + 1].id, name: rows[i + 1].file_name || "" },
      });
    }
  };

  const urlMap = new Map<string, FileRow[]>();
  const uploadMap = new Map<string, FileRow[]>();
  for (const file of files) {
    const url = normalizeLinkUrl(file.external_url);
    if (url) {
      const existing = urlMap.get(url) || [];
      existing.push(file);
      urlMap.set(url, existing);
      continue;
    }
    if (file.file_type === "upload") {
      const entityId = file.organization_id ?? file.person_id;
      const name = file.file_name?.toLowerCase().trim();
      if (!entityId || !name) continue;
      const key = `${entityId}::${name}`;
      const existing = uploadMap.get(key) || [];
      existing.push(file);
      uploadMap.set(key, existing);
    }
  }

  for (const [url, rows] of urlMap) {
    if (rows.length > 1) {
      pushPairs(rows, "file_duplicate_url", (_a, _b) => 97, (_a, _b) => `Same link: ${url}`);
    }
  }
  for (const rows of uploadMap.values()) {
    if (rows.length > 1) {
      pushPairs(
        rows,
        "file_duplicate_name_same_entity",
        (a, b) => (a.size_bytes != null && a.size_bytes === b.size_bytes ? 90 : 82),
        (a, b) =>
          a.size_bytes != null && a.size_bytes === b.size_bytes
            ? `Same file name and size under the same record: ${a.file_name}`
            : `Same file name under the same record: ${a.file_name}`
      );
    }
  }

  return matches.slice(0, limit);
}

/**
 * Meeting duplicates: same start time with overlapping guests (email when
 * present, name otherwise). Catches the same call ingested from both the
 * calendar and a recording app.
 */
async function findMeetingDuplicates(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  limit: number
): Promise<SimilarityMatch[]> {
  const matches: SimilarityMatch[] = [];

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, title, start_time, attendees")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (meetings) {
    const timeMap = new Map<string, typeof meetings>();
    for (const meeting of meetings) {
      if (!meeting.start_time) continue;
      const existing = timeMap.get(meeting.start_time) || [];
      existing.push(meeting);
      timeMap.set(meeting.start_time, existing);
    }

    for (const [startTime, rows] of timeMap) {
      if (rows.length < 2) continue;
      for (let i = 0; i < rows.length - 1; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = attendeeKeys(rows[i].attendees);
          const b = attendeeKeys(rows[j].attendees);
          const overlap = [...a].some((key) => b.has(key));
          if (!overlap) continue;
          matches.push({
            recordId: rows[i].id,
            matchedRecordId: rows[j].id,
            entityType: "meeting",
            signal: "meeting_duplicate_time_attendees",
            confidence: 85,
            because: `Same start time with overlapping guests: ${startTime}`,
            recordA: { id: rows[i].id, name: rows[i].title || "" },
            recordB: { id: rows[j].id, name: rows[j].title || "" },
          });
        }
      }
    }
  }

  return matches.slice(0, limit);
}

function attendeeKeys(attendees: unknown): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(attendees)) return keys;
  for (const attendee of attendees) {
    if (!attendee || typeof attendee !== "object") continue;
    const { email, name } = attendee as { email?: unknown; name?: unknown };
    if (typeof email === "string" && email.trim()) {
      keys.add(email.toLowerCase().trim());
    } else if (typeof name === "string" && name.trim()) {
      keys.add(name.toLowerCase().trim());
    }
  }
  return keys;
}

function normalizeLinkUrl(url: string | null): string | null {
  if (!url) return null;
  const normalized = url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  return normalized || null;
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
