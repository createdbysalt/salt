"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";

export type MentionType = "person" | "org" | "work" | "billing" | "resource" | "meeting" | "me";

export type MentionResult = {
  id: string;
  name: string;
  type: MentionType;
  subtitle?: string;
  context: MentionContext;
};

export type MentionContext =
  | { type: "me" }
  | {
      type: "person";
      relationship?: string | null;
      orgName?: string | null;
      lifecycle?: string | null;
    }
  | {
      type: "org";
      relationship?: string | null;
      industry?: string | null;
      lifecycle?: string | null;
    }
  | {
      type: "work";
      orgName?: string | null;
      stage?: string | null;
    }
  | {
      type: "billing";
      amount?: number | null;
      direction?: "receivable" | "payable" | null;
      status?: string | null;
      partyName?: string | null;
    }
  | {
      type: "resource";
      resourceType?: string | null;
      linkedTo?: string | null;
    }
  | {
      type: "meeting";
      date?: string | null;
      clientName?: string | null;
    };

export async function searchMentions(
  query: string,
): Promise<{ ok: true; data: MentionResult[] } | { ok: false; error: string }> {
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);

  if (!workspace) {
    return { ok: false, error: "Not signed in" };
  }

  const admin = createAdminClient();
  const results: MentionResult[] = [];
  const searchTerm = query.trim().toLowerCase();
  const limit = 5;

  // Always include "me" option when relevant
  if (!searchTerm || "me".includes(searchTerm) || "myself".includes(searchTerm)) {
    results.push({
      id: context.userId ?? workspace.id,
      name: "me",
      type: "me",
      subtitle: "Your profile & preferences",
      context: { type: "me" },
    });
  }

  // Search people (org relationship is through junction table organization_people)
  let peopleQuery = admin
    .from("people")
    .select("id, name, email, relationship_type, relationship_status, record_status")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (searchTerm) {
    peopleQuery = peopleQuery.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data: people, error: peopleError } = await peopleQuery;

  if (peopleError) {
    console.error("People search error:", peopleError);
  }

  // Batch fetch organizations for found people via junction table
  const personOrgMap = new Map<string, string>();
  if (people && people.length > 0) {
    const personIds = people.map((p) => p.id);
    const { data: orgLinks } = await admin
      .from("organization_people")
      .select("person_id, organization:organizations(name)")
      .in("person_id", personIds)
      .eq("is_primary", true);

    if (orgLinks) {
      for (const link of orgLinks) {
        const org = link.organization as { name?: string } | { name?: string }[] | null;
        const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
        if (orgName) {
          personOrgMap.set(link.person_id as string, orgName);
        }
      }
    }
  }

  if (people) {
    for (const p of people) {
      results.push({
        id: p.id,
        name: p.name ?? "Unknown",
        type: "person",
        subtitle: p.email ?? p.relationship_type ?? undefined,
        context: {
          type: "person",
          relationship: p.relationship_type ?? p.relationship_status,
          orgName: personOrgMap.get(p.id) ?? null,
          lifecycle: p.record_status,
        },
      });
    }
  }

  // Search organizations
  let orgsQuery = admin
    .from("organizations")
    .select("id, name, domain, relationship_status, industry, record_status")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (searchTerm) {
    orgsQuery = orgsQuery.or(`name.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%`);
  }

  const { data: orgs, error: orgsError } = await orgsQuery;

  if (orgsError) {
    console.error("Orgs search error:", orgsError);
  }

  if (orgs) {
    for (const o of orgs) {
      results.push({
        id: o.id,
        name: o.name ?? "Unknown",
        type: "org",
        subtitle: o.domain ?? undefined,
        context: {
          type: "org",
          relationship: o.relationship_status,
          industry: o.industry,
          lifecycle: o.record_status,
        },
      });
    }
  }

  // Search work/projects (with org join for context)
  let workQuery = admin
    .from("work")
    .select(`
      id, name, status, stage,
      organization:organizations(name)
    `)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (searchTerm) {
    workQuery = workQuery.ilike("name", `%${searchTerm}%`);
  }

  const { data: work, error: workError } = await workQuery;

  if (workError) {
    console.error("Work search error:", workError);
  }

  if (work) {
    for (const w of work) {
      const org = w.organization as { name?: string } | null;
      results.push({
        id: w.id,
        name: w.name ?? "Unknown",
        type: "work",
        subtitle: w.status ?? undefined,
        context: {
          type: "work",
          orgName: org?.name ?? null,
          stage: w.stage,
        },
      });
    }
  }

  // Search billing records (with person/org join for context)
  let billingQuery = admin
    .from("billing_records")
    .select(`
      id, number, amount_cents, vendor_label, direction, status,
      person:people(name),
      organization:organizations(name)
    `)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (searchTerm) {
    billingQuery = billingQuery.or(`number.ilike.%${searchTerm}%,vendor_label.ilike.%${searchTerm}%`);
  }

  const { data: billing, error: billingError } = await billingQuery;

  if (billingError) {
    console.error("Billing search error:", billingError);
  }

  if (billing) {
    for (const b of billing) {
      const amountDollars = b.amount_cents ? b.amount_cents / 100 : null;
      const amountLabel = amountDollars ? `$${amountDollars.toLocaleString()}` : "";
      const person = b.person as { name?: string } | null;
      const org = b.organization as { name?: string } | null;
      const partyName = b.vendor_label || person?.name || org?.name || null;
      results.push({
        id: b.id,
        name: b.number || b.vendor_label || "Billing record",
        type: "billing",
        subtitle: amountLabel || b.vendor_label || undefined,
        context: {
          type: "billing",
          amount: amountDollars,
          direction: b.direction as "receivable" | "payable" | null,
          status: b.status,
          partyName,
        },
      });
    }
  }

  // Search files (with person/org join for context)
  let filesQuery = admin
    .from("files")
    .select(`
      id, file_name, category,
      person:people(name),
      organization:organizations(name)
    `)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("file_name", { ascending: true })
    .limit(limit);

  if (searchTerm) {
    filesQuery = filesQuery.ilike("file_name", `%${searchTerm}%`);
  }

  const { data: files, error: filesError } = await filesQuery;

  if (filesError) {
    console.error("Files search error:", filesError);
  }

  if (files) {
    for (const file of files) {
      const person = file.person as { name?: string } | null;
      const org = file.organization as { name?: string } | null;
      const linkedTo = person?.name ?? org?.name ?? null;
      const subtitleParts = [file.category, linkedTo && `linked to ${linkedTo}`].filter(Boolean);
      results.push({
        id: file.id,
        name: file.file_name ?? "Unknown",
        type: "resource",
        subtitle: subtitleParts.join(" · ") || undefined,
        context: {
          type: "resource",
          resourceType: file.category,
          linkedTo,
        },
      });
    }
  }

  // Search meetings (with person join for context)
  let meetingsQuery = admin
    .from("meetings")
    .select(`
      id, title, start_time,
      person:people(name)
    `)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (searchTerm) {
    meetingsQuery = meetingsQuery.ilike("title", `%${searchTerm}%`);
  }

  const { data: meetings, error: meetingsError } = await meetingsQuery;

  if (meetingsError) {
    console.error("Meetings search error:", meetingsError);
  }

  if (meetings) {
    for (const m of meetings) {
      const startTime = m.start_time ? new Date(m.start_time).toLocaleDateString() : "";
      const person = m.person as { name?: string } | null;
      results.push({
        id: m.id,
        name: m.title || "Meeting",
        type: "meeting",
        subtitle: startTime || undefined,
        context: {
          type: "meeting",
          date: startTime || null,
          clientName: person?.name ?? null,
        },
      });
    }
  }

  // Sort by relevance
  const typePriority: Record<MentionType, number> = {
    me: 0,
    person: 1,
    org: 2,
    work: 3,
    meeting: 4,
    billing: 5,
    resource: 6,
  };

  if (searchTerm) {
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchTerm;
      const bExact = b.name.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aPriority = typePriority[a.type];
      const bPriority = typePriority[b.type];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });
  }

  return { ok: true, data: results.slice(0, 12) };
}
