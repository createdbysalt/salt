/**
 * Memory → Customize — write-time validation (Phase M4).
 *
 * Instructions that conflict with never-touch field tiers are refused with
 * a plain-language explanation: a customization that tells Salt to fill a
 * `user_only` field could never compile to a real mechanism, so accepting
 * it would be a lie (the honesty constraint). Deliberately small in v1 —
 * the check is a deterministic label match against the field registry, the
 * same source Zone 1 renders from.
 *
 * Pure module: no server-only imports.
 */

import {
  getFieldsForEntity,
  getWritePolicy,
} from "../taxonomy/field-registry";
import {
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
  MEMORY_CUSTOMIZE_GENERAL_SCOPE,
  type MemoryCustomizeScope,
} from "./default-guidance";

const WRITE_INTENT =
  /\b(fill|fill in|update|change|set|write|edit|overwrite|complete|correct)\b/i;

/** camelCase → "camel case" so "billingModel" matches "billing model". */
function keyToWords(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

/**
 * The label of the never-touch field the instruction conflicts with, or
 * null when the entry is acceptable. Only fires on write intent — "my
 * billing email is wrong, ask me first" names the field without demanding
 * Salt write it. The general scope checks every record type's never-touch
 * fields, since its lines steer all of them.
 */
export function findNeverTouchConflict(
  entityType: MemoryCustomizeScope,
  body: string,
): string | null {
  if (!WRITE_INTENT.test(body)) return null;
  const lower = body.toLowerCase();

  const fields =
    entityType === MEMORY_CUSTOMIZE_GENERAL_SCOPE
      ? MEMORY_CUSTOMIZE_ENTITY_TYPES.flatMap((type) =>
          getFieldsForEntity(type),
        )
      : getFieldsForEntity(entityType);

  for (const field of fields) {
    if (getWritePolicy(field) !== "user_only") continue;
    const label = field.label.toLowerCase();
    const words = keyToWords(field.key);
    if (
      (label.length > 3 && lower.includes(label)) ||
      (words.length > 3 && lower.includes(words))
    ) {
      return field.label;
    }
  }
  return null;
}
