import "server-only";

/**
 * Boundary validation (connector-platform 5.5.2, fresh-context Phase 2).
 *
 * The synced catalog schema (refreshed from Composio) is the source of truth
 * for argument SHAPE — it reflects the vendor API as it exists today, so the
 * model gets corrected against reality instead of a hand-written snapshot.
 *
 * Hand-written pinned Zod schemas remain layered on top when present, because
 * some encode safety invariants the vendor schema doesn't (e.g.
 * STRIPE_CREATE_INVOICE pins auto_advance to false — Salt only ever creates
 * draft invoices). When no synced schema exists, the pinned schema is the
 * fallback. No schema anywhere = cannot execute (fail closed).
 */

import { composioToolInputSchemas } from "./tool-policy";
import { getSyncedToolSchema } from "./input-schema-store";
import { validateArgsAgainstJsonSchema } from "./json-schema-validate";

export async function validateToolInputBoundary(
  toolSlug: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  const synced = await getSyncedToolSchema(toolSlug);
  const pinned = composioToolInputSchemas[toolSlug];

  if (!synced && !pinned) {
    throw new Error(
      `Tool ${toolSlug} has no input schema (pinned or synced) — cannot execute`,
    );
  }

  let validated: Record<string, unknown> | null = null;

  if (synced) {
    validated = validateArgsAgainstJsonSchema(input, synced.inputSchema, toolSlug);
  }

  if (pinned) {
    const result = pinned.safeParse(input);
    if (!result.success) {
      throw new Error(
        `Invalid input for ${toolSlug}: ${result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    validated = result.data as Record<string, unknown>;
  }

  return validated ?? (input as Record<string, unknown>);
}
