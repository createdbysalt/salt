import "server-only";

import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  buildCreatePlaySuggestions,
  buildRunPlaySuggestions,
  buildSearchMemorySuggestions,
  starterMessageToKey,
  type ComposerSuggestionStarter,
} from "./composer-suggestion-builders";

export type { ComposerSuggestionStarter } from "./composer-suggestion-builders";
export { starterMessageToKey } from "./composer-suggestion-builders";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getComposerSuggestions(
  starter: ComposerSuggestionStarter,
): Promise<string[]> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();
  const workspaceId = workspace.id;

  const [peopleResult, orgsResult, workResult, templatesResult, queuedResult] =
    await Promise.all([
      supabase
        .from("people")
        .select("name, last_contact_at, updated_at")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("organizations")
        .select("name")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("work")
        .select(
          "name, updated_at, people:person_id ( name ), organizations:organization_id ( name )",
        )
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("play_templates")
        .select("name")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name")
        .limit(8),
      supabase
        .from("play_runs")
        .select("title")
        .eq("workspace_id", workspaceId)
        .in("state", ["queued", "draft"])
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

  const people = peopleResult.data ?? [];
  const playNames = (templatesResult.data ?? [])
    .map((row) => row.name)
    .filter((name): name is string => Boolean(name?.trim()));

  const quietPeople = [...people]
    .map((person) => ({
      name: person.name,
      daysSinceContact: daysSince(person.last_contact_at),
    }))
    .sort((a, b) => {
      const aDays = a.daysSinceContact ?? 9999;
      const bDays = b.daysSinceContact ?? 9999;
      return bDays - aDays;
    });

  const recentWork = (workResult.data ?? []).map((row) => {
    const personJoin = Array.isArray(row.people) ? row.people[0] : row.people;
    const orgJoin = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    return {
      title: row.name,
      personName: personJoin?.name ?? null,
      orgName: orgJoin?.name ?? null,
    };
  });

  switch (starter) {
    case "search-or-add-memory":
      return buildSearchMemorySuggestions({
        quietPeople,
        recentWork,
        recentOrgs: (orgsResult.data ?? []).map((row) => ({ name: row.name })),
        recentPeople: people.map((row) => ({ name: row.name })),
      });
    case "create-play":
      return buildCreatePlaySuggestions({
        playNames,
        quietPersonName: quietPeople[0]?.name ?? null,
      });
    case "run-play":
      return buildRunPlaySuggestions({
        playNames,
        queuedTitles: (queuedResult.data ?? [])
          .map((row) => row.title)
          .filter((title): title is string => Boolean(title?.trim())),
      });
    default:
      return [];
  }
}
