import { z } from "zod";
import type { ToolRiskClass } from "@/app/_lib/composio/tool-policy";
import type { SystemPlaySlug } from "./types";

const uuidSchema = z.string().uuid();

export const relationshipTypeSchema = z.enum([
  "client",
  "prospect",
  "team",
  "partner",
  "vendor",
  "personal",
  "unknown",
]);

export const noteTargetTypeSchema = z.enum(["person", "org", "work", "space"]);

export const findPeopleInputSchema = z.object({
  query: z
    .string()
    .describe("Search by name or email. Leave empty to list recent people."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const findOrgsInputSchema = z.object({
  query: z
    .string()
    .describe("Search by name or domain. Leave empty to list organizations."),
  limit: z.number().int().min(1).max(25).optional(),
});

export const createPersonInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    relationship_type: relationshipTypeSchema.optional(),
    title: z.string().min(1).optional(),
    org_id: uuidSchema.optional(),
    organization_name: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    user_insists_person: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.name?.trim() || data.email?.trim()), {
    message: "Provide name or email to create a person",
  });

export const updatePersonInputSchema = z.object({
  person_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
      relationship_type: relationshipTypeSchema.optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const classifyPersonInputSchema = z.object({
  person_id: uuidSchema,
  relationship_type: relationshipTypeSchema,
});

export const archivePersonInputSchema = z.object({
  person_id: uuidSchema,
  reason: z.string().optional(),
});

export const createOrgInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.name?.trim() || data.domain?.trim()), {
    message: "Provide name or domain to create an organization",
  });

export const updateOrgInputSchema = z.object({
  org_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      domain: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveOrgInputSchema = z.object({
  org_id: uuidSchema,
  reason: z.string().optional(),
});

export const createWorkInputSchema = z.object({
  name: z.string().min(1),
  person_id: uuidSchema.optional(),
  org_id: uuidSchema.optional(),
});

export const updateWorkInputSchema = z.object({
  work_id: uuidSchema,
  fields: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.string().optional(),
    })
    .refine((fields) => Object.keys(fields).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const archiveWorkInputSchema = z.object({
  work_id: uuidSchema,
  reason: z.string().optional(),
});

export const linkPersonOrgInputSchema = z.object({
  person_id: uuidSchema,
  org_id: uuidSchema,
});

export const linkPersonWorkInputSchema = z.object({
  person_id: uuidSchema,
  work_id: uuidSchema,
});

export const linkPersonPersonInputSchema = z.object({
  person_id: uuidSchema,
  target_person_id: uuidSchema,
});

export const linkPersonSpaceInputSchema = z.object({
  person_id: uuidSchema,
  space_id: uuidSchema,
});

export const linkOrgWorkInputSchema = z.object({
  org_id: uuidSchema,
  work_id: uuidSchema,
});

export const linkWorkSpaceInputSchema = z.object({
  work_id: uuidSchema,
  space_id: uuidSchema,
});

export const createNoteInputSchema = z.object({
  content: z.string().min(1),
  target_type: noteTargetTypeSchema,
  target_id: uuidSchema,
});

export interface SystemPlayToolSpec {
  toolName: string;
  /** Play slug to execute; omitted for read-only lookup tools. */
  slug?: SystemPlaySlug;
  description: string;
  schema: z.ZodType<unknown>;
  risk: ToolRiskClass;
  needsApproval: boolean;
}

export const SYSTEM_PLAY_TOOL_SPECS: SystemPlayToolSpec[] = [
  {
    toolName: "memory_find_people",
    description:
      "Search people in Memory by name or email. Always use this before creating or updating a person to get the correct person_id.",
    schema: findPeopleInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_find_orgs",
    description:
      "Search organizations in Memory by name or domain. Always use this before creating or linking an org to get the correct org_id.",
    schema: findOrgsInputSchema,
    risk: "read",
    needsApproval: false,
  },
  {
    toolName: "memory_create_person",
    slug: "system:create-person",
    description:
      "Create a person in Memory. Requires name or email. Dedupes by email within the workspace.",
    schema: createPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_person",
    slug: "system:update-person",
    description: "Update fields on an existing person. Requires person_id from memory_find_people.",
    schema: updatePersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_classify_person",
    slug: "system:classify-person",
    description:
      "Set relationship type (client, prospect, vendor, etc.) on a person.",
    schema: classifyPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_person",
    slug: "system:archive-person",
    description:
      "Archive a person (soft delete — never hard-delete). Requires user approval.",
    schema: archivePersonInputSchema,
    risk: "mutating",
    needsApproval: true,
  },
  {
    toolName: "memory_create_org",
    slug: "system:create-org",
    description:
      "Create an organization in Memory. Requires name or domain. Dedupes by domain.",
    schema: createOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_org",
    slug: "system:update-org",
    description: "Update fields on an existing organization.",
    schema: updateOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_org",
    slug: "system:archive-org",
    description: "Archive an organization. Requires user approval.",
    schema: archiveOrgInputSchema,
    risk: "mutating",
    needsApproval: true,
  },
  {
    toolName: "memory_create_work",
    slug: "system:create-work",
    description: "Create a work/project item in Memory.",
    schema: createWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_update_work",
    slug: "system:update-work",
    description: "Update fields on existing work.",
    schema: updateWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_archive_work",
    slug: "system:archive-work",
    description: "Archive work/project. Requires user approval.",
    schema: archiveWorkInputSchema,
    risk: "mutating",
    needsApproval: true,
  },
  {
    toolName: "memory_link_person_org",
    slug: "system:link-person-org",
    description: "Link a person to an organization.",
    schema: linkPersonOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_org",
    slug: "system:unlink-person-org",
    description: "Remove link between a person and an organization.",
    schema: linkPersonOrgInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_work",
    slug: "system:link-person-work",
    description: "Link a person to a work/project.",
    schema: linkPersonWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_work",
    slug: "system:unlink-person-work",
    description: "Remove link between a person and work.",
    schema: linkPersonWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_person",
    slug: "system:link-person-person",
    description: "Link two people in Memory.",
    schema: linkPersonPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_person",
    slug: "system:unlink-person-person",
    description: "Remove link between two people.",
    schema: linkPersonPersonInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_person_space",
    slug: "system:link-person-space",
    description: "Link a person to a space.",
    schema: linkPersonSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_person_space",
    slug: "system:unlink-person-space",
    description: "Remove link between a person and a space.",
    schema: linkPersonSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_org_work",
    slug: "system:link-org-work",
    description: "Link an organization to work/project.",
    schema: linkOrgWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_org_work",
    slug: "system:unlink-org-work",
    description: "Remove link between org and work.",
    schema: linkOrgWorkInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_link_work_space",
    slug: "system:link-work-space",
    description: "Link work/project to a space.",
    schema: linkWorkSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_unlink_work_space",
    slug: "system:unlink-work-space",
    description: "Remove link between work and space.",
    schema: linkWorkSpaceInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
  {
    toolName: "memory_create_note",
    slug: "system:create-note",
    description: "Add a note attached to a person, org, work, or space.",
    schema: createNoteInputSchema,
    risk: "mutating",
    needsApproval: false,
  },
];

/** Lookup tools are separate from play slugs — keyed by toolName. */
export const LOOKUP_TOOL_NAMES = ["memory_find_people", "memory_find_orgs"] as const;

export function getSystemPlayToolSpecByName(
  toolName: string,
): SystemPlayToolSpec | undefined {
  return SYSTEM_PLAY_TOOL_SPECS.find((spec) => spec.toolName === toolName);
}
