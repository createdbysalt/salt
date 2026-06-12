import { PEOPLE, type Connection, type Person } from "@/app/_lib/demo/people-demo-data";
import { ORGS } from "@/app/_lib/demo/orgs-demo-data";
import { SPACES } from "@/app/_lib/demo/spaces-demo-data";
import type { ResolvedEntity } from "@/app/_lib/notes";

export type LinkCandidate = {
  id: string;
  name: string;
  type: Connection["type"];
  subtitle?: string;
};

function uniqueOrgsFromPeople() {
  const map = new Map<string, { id: string; name: string }>();
  for (const person of PEOPLE) {
    if (person.org && !map.has(person.org.id)) {
      map.set(person.org.id, { id: person.org.id, name: person.org.name });
    }
  }
  return Array.from(map.values());
}

function peopleAtOrg(orgId: string): Person[] {
  return PEOPLE.filter((p) => p.org?.id === orgId);
}

function collectWorkCandidates(): LinkCandidate[] {
  const map = new Map<string, LinkCandidate>();

  for (const person of PEOPLE) {
    for (const work of person.work) {
      if (!map.has(work.id)) {
        map.set(work.id, {
          id: work.id,
          name: work.title,
          type: "work",
          subtitle: work.status,
        });
      }
    }
  }

  return Array.from(map.values());
}

function connectionKey(type: Connection["type"], id: string) {
  return `${type}:${id}`;
}

export function getLinkCandidates(
  recordKind: "person" | "org" | "work",
  recordId: string,
  existing: Connection[]
): LinkCandidate[] {
  const existingKeys = new Set(existing.map((c) => connectionKey(c.type, c.id)));
  const candidates: LinkCandidate[] = [];
  const orgs = uniqueOrgsFromPeople();

  for (const person of PEOPLE) {
    if (recordKind === "person" && person.id === recordId) continue;
    if (recordKind === "org" && peopleAtOrg(recordId).some((p) => p.id === person.id)) continue;
    if (recordKind === "work" && person.work.some((w) => w.id === recordId)) continue;
    if (existingKeys.has(connectionKey("person", person.id))) continue;
    candidates.push({
      id: person.id,
      name: person.name,
      type: "person",
      subtitle: person.role ?? person.relationship,
    });
  }

  for (const org of orgs) {
    if (recordKind === "org" && org.id === recordId) continue;
    if (recordKind === "person") {
      const person = PEOPLE.find((p) => p.id === recordId);
      if (person?.org?.id === org.id) continue;
    }
    if (existingKeys.has(connectionKey("org", org.id))) continue;
    candidates.push({
      id: org.id,
      name: org.name,
      type: "org",
    });
  }

  for (const work of collectWorkCandidates()) {
    if (recordKind === "work" && work.id === recordId) continue;
    if (existingKeys.has(connectionKey("work", work.id))) continue;
    candidates.push(work);
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

export function candidateToConnection(candidate: LinkCandidate): Connection {
  return {
    id: candidate.id,
    name: candidate.name,
    type: candidate.type,
    subtitle: candidate.subtitle,
  };
}

export function linkedPeopleForOrg(orgId: string, connections: Connection[]): Person[] {
  const fromOrg = peopleAtOrg(orgId);
  const seen = new Set(fromOrg.map((p) => p.id));
  const extras: Person[] = [];

  for (const connection of connections) {
    if (connection.type !== "person" || seen.has(connection.id)) continue;
    const person = PEOPLE.find((p) => p.id === connection.id);
    if (person) {
      extras.push(person);
      seen.add(connection.id);
    }
  }

  return [...fromOrg, ...extras];
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getAllLinkableEntities(): ResolvedEntity[] {
  const entities: ResolvedEntity[] = [];

  for (const person of PEOPLE) {
    entities.push({
      id: person.id,
      type: "person",
      name: person.name,
      slug: nameToSlug(person.name),
    });
  }

  for (const org of ORGS) {
    entities.push({
      id: org.id,
      type: "org",
      name: org.name,
      slug: nameToSlug(org.name),
    });
  }

  for (const space of SPACES) {
    entities.push({
      id: space.id,
      type: "space",
      name: space.name,
      slug: nameToSlug(space.name),
    });
  }

  const workMap = new Map<string, { id: string; title: string }>();
  for (const person of PEOPLE) {
    for (const work of person.work) {
      if (!workMap.has(work.id)) {
        workMap.set(work.id, { id: work.id, title: work.title });
      }
    }
  }
  for (const [, work] of workMap) {
    entities.push({
      id: work.id,
      type: "work",
      name: work.title,
      slug: nameToSlug(work.title),
    });
  }

  return entities.sort((a, b) => a.name.localeCompare(b.name));
}
