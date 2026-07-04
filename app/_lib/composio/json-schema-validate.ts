/**
 * Minimal JSON-schema argument validation (connector-platform Phase 5.5.2).
 *
 * Boundary check for long-tail connector tools whose input schemas live in
 * the synced catalog (connector_tools.input_schema) rather than Salt's
 * hand-written Zod registry. Deliberately structural, not exhaustive:
 * required fields present, no unknown top-level fields, primitive types
 * match. Composio validates fully server-side and errors loudly; this layer
 * exists so obviously-malformed model output never leaves Salt.
 */

export interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, { type?: string | string[] } | undefined>;
  required?: string[];
  additionalProperties?: boolean | Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isRecord(value);
    case "null":
      return value === null;
    default:
      // Unknown type keyword — don't reject what we can't check.
      return true;
  }
}

/**
 * Validate args against a catalog input schema. Throws with a
 * model-actionable message on the first violation.
 */
export function validateArgsAgainstJsonSchema(
  args: unknown,
  schema: unknown,
  toolSlug: string,
): Record<string, unknown> {
  if (!isRecord(args)) {
    throw new Error(`Arguments for ${toolSlug} must be a JSON object`);
  }
  if (!isRecord(schema)) {
    // No usable schema on the catalog row — fail closed; the catalog sync
    // should always store one for approved tools.
    throw new Error(`No input schema available for ${toolSlug} — cannot validate arguments`);
  }

  const shape = schema as JsonSchemaLike;
  const properties = isRecord(shape.properties) ? shape.properties : {};

  for (const key of shape.required ?? []) {
    if (args[key] === undefined || args[key] === null) {
      throw new Error(`Missing required argument '${key}' for ${toolSlug}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const property = properties[key];
    if (!property) {
      // Unknown fields are dropped silently only when the schema allows
      // additional properties; otherwise reject so the model corrects itself.
      if (shape.additionalProperties === false) {
        throw new Error(`Unknown argument '${key}' for ${toolSlug}`);
      }
      continue;
    }
    if (value === undefined || value === null) continue;
    const declared = property.type;
    if (typeof declared === "string" && !matchesType(value, declared)) {
      throw new Error(
        `Argument '${key}' for ${toolSlug} must be of type ${declared}`,
      );
    }
    if (Array.isArray(declared) && !declared.some((t) => matchesType(value, t))) {
      throw new Error(
        `Argument '${key}' for ${toolSlug} must be one of types ${declared.join(", ")}`,
      );
    }
  }

  return args;
}
