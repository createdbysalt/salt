import { createHash } from "node:crypto";

/**
 * Stable schema hashing for catalog-sync drift comparison. Kept in its own
 * module (no server-only import) so it is unit-testable; catalog-sync.ts is
 * the only runtime consumer.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function schemaHash(input: unknown, output: unknown): string {
  return createHash("sha256")
    .update(stableStringify({ input, output }))
    .digest("hex");
}


