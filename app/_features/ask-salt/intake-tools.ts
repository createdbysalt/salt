import "server-only";

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  parseIntakeRequest,
  getCreationOrder,
  getMissingFieldsToWatch,
  type IntakeEntityType,
  type ParsedEntity,
} from "@/app/_features/memory/care/intake";
import {
  isMemoryCareIntakeId,
  loadMemoryCareIntake,
  MEMORY_CARE_INTAKE_ID,
} from "./memory-care-intake";

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
  if (!isMemoryCareIntakeId(slug)) {
    return {
      success: false as const,
      message: `No Memory Care intake registered for "${slug}". Use load_memory_intake first.`,
      supportedIds: [MEMORY_CARE_INTAKE_ID, "memory-records"],
    };
  }

  const parsed = parseIntakeRequest(message);
  const creationOrder = getCreationOrder(parsed);

  return {
    success: true as const,
    intakeId: MEMORY_CARE_INTAKE_ID,
    /** @deprecated Use intakeId — kept for older tool-call transcripts. */
    playbookSlug: MEMORY_CARE_INTAKE_ID,
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
    load_memory_intake: tool({
      description: `Load Memory Care intake — the procedure for adding people, orgs, work, billing, files, or meetings to Memory from chat. NOT a playbook and never queues Plays. Call this FIRST when the user asks to add/create/log Memory records, then follow procedureSteps + call parse_intake.`,
      inputSchema: z.object({}),
      execute: async () => {
        const intake = loadMemoryCareIntake();
        if (!intake) {
          return {
            found: false as const,
            message: "Memory Care intake contract is unavailable.",
          };
        }
        return {
          found: true as const,
          id: intake.id,
          name: intake.name,
          description: intake.description,
          whenToUse: intake.whenToUse,
          procedureMd: intake.procedureMd,
          procedureSteps: intake.chatContract.procedure,
          chat: {
            execution: intake.chatContract.execution,
            enrichment: intake.chatContract.enrichment,
            explicitIntentAuthorizesCreate:
              intake.chatContract.explicitIntentAuthorizesCreate,
            askSaltTools: intake.chatContract.askSaltTools,
            enrichmentCategories: intake.chatContract.enrichmentCategories,
          },
          approvalRequired: false,
          note: "Memory Care learn-layer intake — not a playbook. Do not call propose_play.",
        };
      },
    }),

    parse_intake: tool({
      description: `REQUIRED first step after load_memory_intake. Parses the user's message into ALL entities to create (person, org, work, billing, etc.) with tier order and link instructions. Never call memory_create_* before parse_intake. If isMultiEntity is true, you MUST create every item in creationOrder — e.g. "add Jane Example, project for her" creates person AND work.`,
      inputSchema: z.object({
        intake_id: z
          .string()
          .min(1)
          .optional()
          .describe(`Intake id from load_memory_intake (default: ${MEMORY_CARE_INTAKE_ID})`),
        playbook_slug: z
          .string()
          .min(1)
          .optional()
          .describe("Deprecated alias for intake_id (memory-records / memory-care)"),
        message: z
          .string()
          .min(1)
          .describe("The user's request to parse (usually the latest user message)"),
      }),
      execute: async ({ intake_id, playbook_slug, message }) =>
        runPlaybookIntake(
          intake_id ?? playbook_slug ?? MEMORY_CARE_INTAKE_ID,
          message,
        ),
    }),
  };
}
