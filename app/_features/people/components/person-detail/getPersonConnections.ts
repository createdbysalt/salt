import {
  MOCK_NOTES,
  MOCK_ORGANIZATIONS,
  MOCK_PROJECTS,
  MOCK_TEAMS,
  type MockNote,
  type MockOrganization,
  type MockPerson,
  type MockProject,
  type MockTeam,
} from "@/app/_lib/demo";

export type PersonConnections = {
  organizations: MockOrganization[];
  projects: MockProject[];
  teams: MockTeam[];
  notes: MockNote[];
};

export function getPersonConnections(person: MockPerson): PersonConnections {
  const personId = person.id;

  const notes = MOCK_NOTES.filter(
    (note) =>
      !note.isArchived &&
      note.linkedEntities.some(
        (entity) => entity.id === personId && entity.type === "person"
      )
  );

  const organizationIds = new Set<string>();
  if (person.organizationId) {
    organizationIds.add(person.organizationId);
  }
  for (const note of notes) {
    for (const entity of note.linkedEntities) {
      if (entity.type === "organization") {
        organizationIds.add(entity.id);
      }
    }
  }

  const projectIds = new Set<string>();
  if (person.organizationId) {
    for (const project of MOCK_PROJECTS) {
      if (project.organizationId === person.organizationId) {
        projectIds.add(project.id);
      }
    }
  }
  for (const note of notes) {
    for (const entity of note.linkedEntities) {
      if (entity.type === "project") {
        projectIds.add(entity.id);
      }
    }
  }

  const projects = MOCK_PROJECTS.filter((project) => projectIds.has(project.id));

  for (const project of projects) {
    organizationIds.add(project.organizationId);
  }

  const teamIds = new Set<string>();
  for (const team of MOCK_TEAMS) {
    if (team.memberIds.includes(personId)) {
      teamIds.add(team.id);
    }
  }
  for (const project of projects) {
    if (project.teamId) {
      teamIds.add(project.teamId);
    }
  }

  return {
    organizations: MOCK_ORGANIZATIONS.filter((org) => organizationIds.has(org.id)),
    projects,
    teams: MOCK_TEAMS.filter((team) => teamIds.has(team.id)),
    notes,
  };
}
