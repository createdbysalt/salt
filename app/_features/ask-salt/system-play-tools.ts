import "server-only";

import { revalidatePath } from "next/cache";
import { tool, type ToolSet } from "ai";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { reportError } from "@/app/_lib/errors";
import { executeSystemPlay } from "@/app/_features/capture/services/system-plays/executor";
import { findOrgs, findPeople } from "@/app/_features/capture/services/system-plays/lookups";
import {
  classifyEntity,
  completePersonFields,
  evaluateAdmission,
  resolveIdentity,
  type ExistingPersonCandidate,
  type RecordsDecision,
} from "@/app/_features/people/records-engine";
import { loadPeopleProfilePlaybook } from "@/app/_features/plays/playbooks/profile/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/profile/write-provenance";
import { extractNameFromEmail } from "@/app/_features/capture/services/system-plays/person-resolver";
import {
  SYSTEM_PLAY_TOOL_SPECS,
  type SystemPlayToolSpec,
} from "@/app/_features/capture/services/system-plays/schemas";
import type { SystemPlaySlug } from "@/app/_features/capture/services/system-plays/types";
import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";

export interface BuildSystemPlayToolsOptions {
  workspaceId: string;
  userId?: string;
}

type SafeToolFailure = {
  success: false;
  ok: false;
  error: string;
  message: string;
  errorId: string;
};

function isSafeToolFailure(value: unknown): value is SafeToolFailure {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.success === false && typeof record.errorId === "string";
}

function actionForSystemPlay(slug: SystemPlaySlug): string {
  if (slug.includes("create-work")) return "while creating that work item";
  if (slug.includes("create-person")) return "while creating that person";
  if (slug.includes("create-org")) return "while creating that organization";
  if (slug.includes("update")) return "while updating that memory item";
  if (slug.includes("archive")) return "while archiving that memory item";
  if (slug.includes("link")) return "while linking those memory items";
  return "while running that Salt action";
}

function toSafeToolFailure(input: {
  scope: string;
  error: unknown;
  workspaceId: string;
  userId?: string;
  toolSlug?: string;
  action?: string;
  errorId?: string;
}): SafeToolFailure {
  const report = reportError({
    scope: input.scope,
    error: input.error,
    action: input.action,
    errorId: input.errorId,
    context: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      toolSlug: input.toolSlug,
    },
  });

  return {
    success: false,
    ok: false,
    error: report.userMessage,
    message: report.userMessage,
    errorId: report.errorId,
  };
}

function toSafeToolFailureFromResult(input: {
  result: { error?: string; error_id?: string };
  scope: string;
  workspaceId: string;
  userId?: string;
  toolSlug: string;
  action?: string;
}): SafeToolFailure {
  if (input.result.error_id && input.result.error) {
    return {
      success: false,
      ok: false,
      error: input.result.error,
      message: input.result.error,
      errorId: input.result.error_id,
    };
  }

  return toSafeToolFailure({
    scope: input.scope,
    error: new Error(input.result.error ?? "System play failed"),
    workspaceId: input.workspaceId,
    userId: input.userId,
    toolSlug: input.toolSlug,
    action: input.action,
  });
}

function domainToOrgName(domain: string): string {
  const baseName = domain.split(".")[0] ?? domain;
  return baseName
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

type CreatePersonInputArgs = {
  name?: string;
  email?: string;
  relationship_type?: string;
  title?: string;
  org_id?: string;
  organization_name?: string;
  domain?: string;
  user_insists_person?: boolean;
};

function normalizeCreatePersonInput(input: CreatePersonInputArgs | null | undefined): {
  name: string;
  email?: string;
  relationship_type?: string;
  title?: string;
  org_id?: string;
  organization_name?: string;
  domain?: string;
  user_insists_person?: boolean;
} {
  const safe = input ?? {};
  const email = safe.email?.trim().toLowerCase();
  const name = safe.name?.trim() || (email ? extractNameFromEmail(email) : "");
  if (!name) {
    throw new Error("Provide name or email to create a person");
  }
  return {
    name,
    email,
    relationship_type: safe.relationship_type,
    title: safe.title?.trim() || undefined,
    org_id: safe.org_id,
    organization_name: safe.organization_name?.trim() || undefined,
    domain: safe.domain?.trim().toLowerCase() || undefined,
    user_insists_person: safe.user_insists_person,
  };
}

function normalizeCreateOrgInput(
  input: { name?: string; domain?: string } | null | undefined,
): { name: string; domain?: string } {
  const safe = input ?? {};
  const domain = safe.domain?.trim().toLowerCase();
  const name = safe.name?.trim() || (domain ? domainToOrgName(domain) : "");
  if (!name) {
    throw new Error("Provide name or domain to create an organization");
  }
  return { name, domain };
}

async function runLookupTool(
  toolName: string,
  workspaceId: string,
  input: unknown,
): Promise<unknown> {
  if (toolName === "memory_find_people") {
    const parsed = input as { query?: string; limit?: number };
    return findPeople(workspaceId, parsed.query ?? "", parsed.limit ?? 10);
  }
  if (toolName === "memory_find_orgs") {
    const parsed = input as { query?: string; limit?: number };
    return findOrgs(workspaceId, parsed.query ?? "", parsed.limit ?? 10);
  }
  throw new Error(`Unknown lookup tool: ${toolName}`);
}

function toExistingPersonCandidates(value: unknown): ExistingPersonCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") return [];
    return [
      {
        id: record.id,
        name: record.name,
        email: typeof record.email === "string" ? record.email : null,
        title: typeof record.title === "string" ? record.title : null,
        organizationName:
          typeof record.organizationName === "string"
            ? record.organizationName
            : typeof record.organization_name === "string"
              ? record.organization_name
              : null,
        organizationDomain:
          typeof record.organizationDomain === "string"
            ? record.organizationDomain
            : typeof record.organization_domain === "string"
              ? record.organization_domain
              : null,
      },
    ];
  });
}

async function buildCreatePersonDecision(
  workspaceId: string,
  rawInput: unknown,
): Promise<{
  input: ReturnType<typeof normalizeCreatePersonInput>;
  decision: RecordsDecision;
}> {
  const input = normalizeCreatePersonInput(rawInput as CreatePersonInputArgs | null | undefined);
  const recordsInput = {
    name: input.name,
    email: input.email,
    relationshipType: input.relationship_type as RelationshipType | undefined,
    title: input.title ?? null,
    organizationName: input.organization_name,
    domain: input.domain,
    explicitRequest: true,
    userInsistsPerson: input.user_insists_person,
  };
  const classification = classifyEntity(recordsInput);
  const lookupQuery = input.email ?? input.name;
  const candidates = toExistingPersonCandidates(await findPeople(workspaceId, lookupQuery, 10));
  const duplicates = resolveIdentity({ recordsInput, candidates });
  const decision = evaluateAdmission({ recordsInput, classification, duplicates });

  return { input, decision };
}

function firstOrgId(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return null;
}

async function resolveOrganizationId(input: {
  workspaceId: string;
  orgId?: string;
  organizationName?: string;
  domain?: string;
}): Promise<string | null> {
  if (input.orgId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.orgId)
      .is("deleted_at", null)
      .maybeSingle();
    return data?.id ?? null;
  }

  const query = input.domain ?? input.organizationName;
  if (!query) return null;
  return firstOrgId(await findOrgs(input.workspaceId, query, 5));
}

async function linkPersonToOrganizationIfPossible(input: {
  workspaceId: string;
  personId: string;
  orgId?: string;
  organizationName?: string;
  domain?: string;
  title?: string;
}) {
  const organizationId = await resolveOrganizationId({
    workspaceId: input.workspaceId,
    orgId: input.orgId,
    organizationName: input.organizationName,
    domain: input.domain,
  });
  if (!organizationId) return;

  const admin = createAdminClient();
  await admin.from("organization_people").upsert(
    {
      organization_id: organizationId,
      person_id: input.personId,
      role: input.title ?? null,
      is_primary: true,
    },
    { onConflict: "organization_id,person_id" },
  );
}

function shouldCreateAfterDecision(decision: RecordsDecision): boolean {
  return decision.action === "create" || decision.action === "needs_confirmation";
}

async function applyProfileFieldsForPerson(input: {
  workspaceId: string;
  personId: string;
  email: string;
  title?: string;
}) {
  const profilePlaybook = await loadPeopleProfilePlaybook(input.workspaceId);
  const profileEvaluation = completePersonFields({
    email: input.email,
    extractedTitle: input.title ?? null,
    systemRules: profilePlaybook.systemRules,
    settings: profilePlaybook.settings,
    blueprintVersion: profilePlaybook.blueprintVersion,
  });

  await applyProfileFieldResults({
    workspaceId: input.workspaceId,
    personId: input.personId,
    results: profileEvaluation.results,
    blueprintSlug: profileEvaluation.blueprintSlug,
    blueprintVersion: profileEvaluation.blueprintVersion,
  });
}

async function runPolicyAwareCreatePerson(
  workspaceId: string,
  userId: string | undefined,
  rawInput: unknown,
): Promise<unknown> {
  const { input, decision } = await buildCreatePersonDecision(workspaceId, rawInput);

  if (decision.action === "skip" || decision.action === "suggest_org") {
    return {
      success: true,
      action: decision.action,
      entity_type: decision.entityType,
      decision,
      message:
        decision.action === "suggest_org"
          ? "This looks more like an organization or shared alias than a person."
          : "This does not qualify as a person record.",
    };
  }

  if (decision.action === "suggest_merge") {
    return {
      success: true,
      action: "suggest_merge",
      entity_type: "person",
      decision,
      message:
        "Possible duplicate person found. Confirm with the user before creating or merging.",
    };
  }

  if (decision.action === "update_existing") {
    const existing = decision.duplicates[0];
    if (existing?.id && decision.normalizedEmail) {
      await applyProfileFieldsForPerson({
        workspaceId,
        personId: existing.id,
        email: decision.normalizedEmail,
        title: input.title,
      });
      await linkPersonToOrganizationIfPossible({
        workspaceId,
        personId: existing.id,
        orgId: input.org_id,
        organizationName: input.organization_name,
        domain: input.domain ?? decision.domain ?? undefined,
        title: input.title,
      });
    }
    return {
      success: true,
      action: "update_existing",
      entity_id: existing?.id,
      entity_type: "person",
      decision,
    };
  }

  if (!shouldCreateAfterDecision(decision)) {
    return { success: true, action: decision.action, decision };
  }

  const result = await executeSystemPlay(
    workspaceId,
    "system:create-person",
    {
      name: decision.suggestedName ?? input.name,
      email: decision.normalizedEmail ?? input.email,
      relationship_type: decision.suggestedRelationshipType,
      title: input.title,
      created_via: "ask_salt",
    },
    userId,
  );

  if (!result.success) {
    return toSafeToolFailureFromResult({
      result,
      scope: "ask-salt.system-play",
      workspaceId,
      userId,
      toolSlug: "system:create-person",
      action: actionForSystemPlay("system:create-person"),
    });
  }

  if (result.entity_id && decision.normalizedEmail) {
    await applyProfileFieldsForPerson({
      workspaceId,
      personId: result.entity_id,
      email: decision.normalizedEmail,
      title: input.title,
    });
    await linkPersonToOrganizationIfPossible({
      workspaceId,
      personId: result.entity_id,
      orgId: input.org_id,
      organizationName: input.organization_name,
      domain: input.domain ?? decision.domain ?? undefined,
      title: input.title,
    });
  }

  return { ...result, action: decision.action, decision };
}

async function runPlayTool(
  slug: SystemPlaySlug,
  workspaceId: string,
  userId: string | undefined,
  input: unknown,
): Promise<unknown> {
  let playInput = input;

  if (slug === "system:create-person") {
    return runPolicyAwareCreatePerson(workspaceId, userId, input);
  } else if (slug === "system:create-org") {
    playInput = normalizeCreateOrgInput(input as { name?: string; domain?: string });
  }

  const result = await executeSystemPlay(workspaceId, slug, playInput, userId);
  if (!result.success) {
    return toSafeToolFailureFromResult({
      result,
      scope: "ask-salt.system-play",
      workspaceId,
      userId,
      toolSlug: slug,
      action: actionForSystemPlay(slug),
    });
  }
  return result;
}

function wrapSpec(
  spec: SystemPlayToolSpec,
  options: BuildSystemPlayToolsOptions,
): ToolSet[string] {
  const { workspaceId, userId } = options;

  const baseTool = tool({
    description: spec.description,
    inputSchema: spec.schema,
    execute: async (input) => {
      try {
        const output = spec.slug
          ? await runPlayTool(spec.slug, workspaceId, userId, input)
          : await runLookupTool(spec.toolName, workspaceId, input);

        if (isSafeToolFailure(output)) {
          void logToolExecution({
            workspaceId,
            toolSlug: spec.toolName,
            risk: spec.risk,
            source: "ask_salt",
            status: "error",
            userId: userId ?? null,
            args: input,
            error: output.error,
          });
          return output;
        }

        void logToolExecution({
          workspaceId,
          toolSlug: spec.toolName,
          risk: spec.risk,
          source: "ask_salt",
          status: "success",
          userId: userId ?? null,
          approvedBy: spec.needsApproval ? userId ?? null : null,
          args: input,
        });

        if (
          spec.slug === "system:create-person" ||
          spec.slug === "system:update-person" ||
          spec.slug === "system:classify-person"
        ) {
          revalidatePath("/people");
        }
        if (
          spec.slug === "system:create-org" ||
          spec.slug === "system:update-org"
        ) {
          revalidatePath("/orgs");
        }
        if (
          spec.slug === "system:create-work" ||
          spec.slug === "system:update-work"
        ) {
          revalidatePath("/work");
        }

        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Execution failed";
        const safeFailure = toSafeToolFailure({
          scope: "ask-salt.tool",
          error,
          workspaceId,
          userId,
          toolSlug: spec.toolName,
          action: "while running that Salt action",
        });
        void logToolExecution({
          workspaceId,
          toolSlug: spec.toolName,
          risk: spec.risk,
          source: "ask_salt",
          status: "error",
          userId: userId ?? null,
          args: input,
          error: message,
        });
        return safeFailure;
      }
    },
  });

  if (spec.needsApproval) {
    return { ...baseTool, needsApproval: true };
  }

  return baseTool;
}

/**
 * Build Ask Salt tools for Memory system plays (people, orgs, work, links, notes).
 * Workspace id must come from verified tenant context — never from LLM args.
 */
export function buildSystemPlayTools(options: BuildSystemPlayToolsOptions): ToolSet {
  const tools: ToolSet = {};

  for (const spec of SYSTEM_PLAY_TOOL_SPECS) {
    tools[spec.toolName] = wrapSpec(spec, options);
  }

  return tools;
}
