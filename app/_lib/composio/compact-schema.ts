/**
 * Compact JSON Schema projection for LLM context.
 *
 * Full vendor input schemas are far too large to inline into tool-search
 * results or step prompts — but without them the model guesses argument
 * names. This projects a schema to a token-cheap shape: top-level properties
 * with type, required flag, truncated description, and enum values (the
 * things models hallucinate most). Nested structures collapse to their type.
 */

export interface CompactSchemaField {
  type: string;
  required: boolean;
  description?: string;
  enum?: unknown[];
}

const MAX_PROPERTIES = 20;
const MAX_DESCRIPTION = 120;
const MAX_ENUM_VALUES = 10;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function fieldType(definition: Record<string, unknown>): string {
  const type = definition.type;
  if (typeof type === "string") return type;
  if (Array.isArray(type)) return type.filter((t) => t !== "null").join("|") || "any";
  if (Array.isArray(definition.enum)) return "string";
  return "any";
}

/**
 * Project a JSON Schema to its compact form, or null when there is no
 * object shape to project (caller omits the field entirely).
 */
export function compactInputSchema(
  schema: unknown,
): Record<string, CompactSchemaField> | null {
  const root = asRecord(schema);
  if (!root || root.type !== "object") return null;

  const properties = asRecord(root.properties);
  if (!properties || Object.keys(properties).length === 0) return null;

  const required = new Set(
    Array.isArray(root.required)
      ? root.required.filter((r): r is string => typeof r === "string")
      : [],
  );

  const compact: Record<string, CompactSchemaField> = {};
  for (const [name, rawDefinition] of Object.entries(properties).slice(
    0,
    MAX_PROPERTIES,
  )) {
    const definition = asRecord(rawDefinition);
    if (!definition) {
      compact[name] = { type: "any", required: required.has(name) };
      continue;
    }

    const field: CompactSchemaField = {
      type: fieldType(definition),
      required: required.has(name),
    };

    if (typeof definition.description === "string" && definition.description) {
      field.description =
        definition.description.length > MAX_DESCRIPTION
          ? `${definition.description.slice(0, MAX_DESCRIPTION - 1)}…`
          : definition.description;
    }

    if (Array.isArray(definition.enum) && definition.enum.length > 0) {
      field.enum = definition.enum.slice(0, MAX_ENUM_VALUES);
    }

    compact[name] = field;
  }

  return compact;
}
