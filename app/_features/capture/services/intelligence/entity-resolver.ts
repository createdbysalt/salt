import type { createAdminClient } from "@/app/_lib/supabase/admin";
import type { MemoryProposal } from "../../types/memory-proposals";

export const ENTITY_MATCH_MIN_CONFIDENCE = 85;

type AdminClient = ReturnType<typeof createAdminClient>;

export interface KnownWorkspaceEntities {
  orgs: Array<{ id: string; name: string; domain: string | null }>;
  works: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string | null; email: string | null }>;
  meetingCaptures: Array<{ id: string; title: string; start: string | null }>;
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fuzzyScore(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 90;
  return 0;
}

export async function loadKnownWorkspaceEntities(
  admin: AdminClient,
  workspaceId: string
): Promise<KnownWorkspaceEntities> {
  const [orgsResult, worksResult, peopleResult, meetingsResult] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id, name, domain")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null),
      admin
        .from("work")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null),
      admin
        .from("people")
        .select("id, name, email")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null),
      admin
        .from("capture_events")
        .select("id, title, extracted_data")
        .eq("workspace_id", workspaceId)
        .eq("capture_type", "meeting")
        .limit(200),
    ]);

  const meetingCaptures =
    meetingsResult.data?.map((row) => {
      const extracted = row.extracted_data as { start?: string } | null;
      return {
        id: row.id as string,
        title: (row.title as string) ?? "",
        start: extracted?.start ?? null,
      };
    }) ?? [];

  return {
    orgs: (orgsResult.data ?? []) as KnownWorkspaceEntities["orgs"],
    works: (worksResult.data ?? []) as KnownWorkspaceEntities["works"],
    people: (peopleResult.data ?? []) as KnownWorkspaceEntities["people"],
    meetingCaptures,
  };
}

export function resolveMemoryProposals(
  proposals: MemoryProposal[],
  entities: KnownWorkspaceEntities,
  context?: { fromEmail?: string; fromName?: string | null }
): MemoryProposal[] {
  return proposals.map((proposal) => resolveSingleProposal(proposal, entities, context));
}

function resolveSingleProposal(
  proposal: MemoryProposal,
  entities: KnownWorkspaceEntities,
  context?: { fromEmail?: string; fromName?: string | null }
): MemoryProposal {
  if (proposal.action === "link" && proposal.hint.existing_match_id) {
    return proposal;
  }

  const hintName = proposal.hint.name ?? "";

  if (proposal.surface === "orgs" && hintName) {
    const domain = proposal.hint.domain?.toLowerCase();
    const byDomain = domain
      ? entities.orgs.find((org) => org.domain?.toLowerCase() === domain)
      : undefined;
    const byName = entities.orgs
      .map((org) => ({ org, score: fuzzyScore(org.name, hintName) }))
      .sort((a, b) => b.score - a.score)[0];

    const match = byDomain ?? (byName && byName.score >= ENTITY_MATCH_MIN_CONFIDENCE ? byName.org : undefined);
    if (match) {
      return {
        ...proposal,
        action: "link",
        confidence: Math.max(proposal.confidence, ENTITY_MATCH_MIN_CONFIDENCE),
        hint: { ...proposal.hint, existing_match_id: match.id },
        reason: `${proposal.reason} Matched existing org "${match.name}".`,
      };
    }
  }

  if (proposal.surface === "work" && hintName) {
    const best = entities.works
      .map((work) => ({ work, score: fuzzyScore(work.name, hintName) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= ENTITY_MATCH_MIN_CONFIDENCE) {
      return {
        ...proposal,
        action: "link",
        confidence: Math.max(proposal.confidence, ENTITY_MATCH_MIN_CONFIDENCE),
        hint: { ...proposal.hint, existing_match_id: best.work.id },
        reason: `${proposal.reason} Matched existing work "${best.work.name}".`,
      };
    }
  }

  if (proposal.surface === "meetings" && hintName) {
    const datetime = proposal.hint.datetime;
    const best = entities.meetingCaptures
      .map((meeting) => {
        let score = fuzzyScore(meeting.title, hintName);
        if (datetime && meeting.start && meeting.start.startsWith(datetime.slice(0, 10))) {
          score = Math.max(score, 92);
        }
        return { meeting, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.score >= ENTITY_MATCH_MIN_CONFIDENCE) {
      return {
        ...proposal,
        action: "link",
        confidence: Math.max(proposal.confidence, ENTITY_MATCH_MIN_CONFIDENCE),
        hint: { ...proposal.hint, existing_match_id: best.meeting.id },
        reason: `${proposal.reason} Matched existing meeting "${best.meeting.title}".`,
      };
    }
  }

  if (proposal.surface === "people" && context?.fromEmail) {
    const email = context.fromEmail.toLowerCase();
    const match = entities.people.find((p) => p.email?.toLowerCase() === email);
    if (match) {
      return {
        ...proposal,
        action: "link",
        confidence: Math.max(proposal.confidence, 95),
        hint: {
          ...proposal.hint,
          name: match.name ?? context.fromName ?? undefined,
          existing_match_id: match.id,
        },
        reason: `${proposal.reason} Matched existing person.`,
      };
    }
  }

  return proposal;
}
