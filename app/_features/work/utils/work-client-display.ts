type NamedEntity = { id: string; name: string };

/** Primary contact from structured FK first, then graph connections. */
export function resolveWorkPrimaryPerson(input: {
  primaryPerson?: NamedEntity | null;
  connections: Array<{ id: string; name: string; type: string }>;
}): NamedEntity | null {
  if (input.primaryPerson) return input.primaryPerson;
  const linkedPerson = input.connections.find((connection) => connection.type === "person");
  return linkedPerson ? { id: linkedPerson.id, name: linkedPerson.name } : null;
}

/** Solo-client org shells often mirror the person's name — hide them from Organization. */
export function isRedundantPersonalOrg(
  org: { name: string } | null | undefined,
  person: { name: string } | null | undefined,
): boolean {
  if (!org || !person) return false;
  return org.name.trim().toLowerCase() === person.name.trim().toLowerCase();
}

export function resolveWorkOrganizationDisplay(input: {
  org?: NamedEntity | null;
  primaryPerson?: NamedEntity | null;
}): { name: string; id: string | null } {
  if (!input.org) return { name: "", id: null };
  if (isRedundantPersonalOrg(input.org, input.primaryPerson ?? null)) {
    return { name: "", id: null };
  }
  return { name: input.org.name, id: input.org.id };
}
