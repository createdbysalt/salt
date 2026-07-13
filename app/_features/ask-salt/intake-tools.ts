import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  parseIntakeRequest,
  getCreationOrder,
  getMissingFieldsToWatch,
  type IntakeEntityType,
  type ParsedEntity,
} from "@/app/_features/plays/playbooks/v2/_meta/memory-records/scripts";

const INTAKE_PLAYBOOK_SLUGS = new Set(["memory-records"]);

function presentFieldsForEntity(entity: ParsedEntity): string[] {
  const present: string[] = [];
  if (entity.name) present.push("name");
  if (entity.email) present.push("email");
  if (entity.domain) present.push("domain");
  return present;
}

function serializeEntity(entity: ParsedEntity) {
  const presentFields = presentFieldsForEntity(entity);
  return {
    type: entity.type,
    tier: entity.tier,
    name: entity.name ?? null,
    email: entity.email ?? null,
    domain: entity.domain ?? null,
    hints: entity.hints,
    explicit_links: entity.explicitLinks,
    watch_when_missing: getMissingFieldsToWatch(entity.type, presentFields),
  };
}

export function runPlaybookIntake(slug: string, message: string) {
  if (!INTAKE_PLAYBOOK_SLUGS.has(slug)) {
    return {
      success: false as const,
      message: `No intake script registered for playbook "${slug}".`,
      supportedSlugs: [...INTAKE_PLAYBOOK_SLUGS],
    };
  }

  const parsed = parseIntakeRequest(message);
  const creationOrder = getCreationOrder(parsed);

  return {
    success: true as const,
    playbookSlug: slug,
    isMultiEntity: parsed.isMultiEntity,
    entityCount: parsed.entities.length,
    entities: parsed.entities.map(serializeEntity),
    creationOrder: creationOrder.map(serializeEntity),
    tiers: {
      tier1: (parsed.tiers.get(1) ?? []).map((e) => e.type),
      tier2: (parsed.tiers.get(2) ?? []).map((e) => e.type),
      tier3: (parsed.tiers.get(3) ?? []).map((e) => e.type),
      tier4: (parsed.tiers.get(4) ?? []).map((e) => e.type),
    },
    guidance: buildIntakeGuidance(creationOrder),
  };
}

function buildIntakeGuidance(entities: ParsedEntity[]): string {
  if (entities.length === 0) {
    return "No entities detected. Ask the user for a name or use memory_find_* before creating.";
  }

  const steps = entities.map((entity, index) => {
    const label = entity.name ?? entity.type;
    const enrichType = entityTypeToEnrichType(entity.type);
    const createTool =
      entity.type === "organization"
        ? "memory_create_org"
        : entity.type === "person"
          ? "memory_create_person"
          : entity.type === "work"
            ? "memory_create_work"
            : `memory_create_${entity.type}`;
    return `${index + 1}. Tier ${entity.tier} ${entity.type} (${label}): memory_find → enrich_entity(${enrichType}) → ${createTool}`;
  });

  const lines = [
    "MANDATORY: Create EVERY entity below in order. Do not stop after the first create.",
    "Follow this creation order. Enrich each entity in parallel when possible, then create sequentially by tier.",
    ...steps,
  ];

  const hasPerson = entities.some((entity) => entity.type === "person");
  const hasWork = entities.some((entity) => entity.type === "work");
  if (hasPerson && hasWork) {
    lines.push(
      "After both person and work exist, call memory_link_person_work (Connections tab) and pass person_id + work_id.",
    );
  }

  for (const entity of entities) {
    for (const link of entity.explicitLinks) {
      if (link.targetType === "person" && link.relationship === "primary_contact") {
        lines.push(`Link work "${entity.name}" to person "${link.targetName}" via memory_link_person_work.`);
      }
    }
  }

  lines.push("After creates, register add_to_watching for fields listed in watch_when_missing.");
  return lines.join("\n");
}

function entityTypeToEnrichType(type: IntakeEntityType): string {
  if (type === "organization") return "org";
  return type;
}

export function buildIntakeTools(): ToolSet {
  return {
    parse_intake: tool({
      description: `REQUIRED first step after load_playbook for memory-records. Parses the user's message into ALL entities to create (person, org, work, billing, etc.) with tier order and link instructions. Never call memory_create_* before parse_intake when this playbook is loaded. If isMultiEntity is true, you MUST create every item in creationOrder — e.g. "add Jane Example, project for her" creates person AND work.`,
      inputSchema: z.object({
        playbook_slug: z
          .string()
          .min(1)
          .describe("Slug from load_playbook (e.g. memory-records)"),
        message: z
          .string()
          .min(1)
          .describe("The user's request to parse (usually the latest user message)"),
      }),
      execute: async ({ playbook_slug, message }) => runPlaybookIntake(playbook_slug, message),
    }),
  };
}
