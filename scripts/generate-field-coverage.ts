/**
 * Field-contract coverage matrix generator (keeper-field-contracts,
 * verification Layer 1).
 *
 * Walks FIELD_REGISTRY and emits docs/reference/memory-field-coverage.md:
 * one table per memory type with a row for every contracted field. Rows
 * flagged NO-WRITE-PATH (editable but no dbColumn) are visible gaps —
 * "done" for a phase means zero flagged rows for its types.
 *
 * Run: pnpm coverage:fields
 */

import fs from "node:fs";
import path from "node:path";
import {
  FIELD_REGISTRY,
  getWritePolicy,
  type FieldDescriptor,
} from "../app/_features/memory/taxonomy/field-registry";

const OUT_PATH = path.join(process.cwd(), "docs/reference/memory-field-coverage.md");

const TYPE_ORDER = ["person", "org", "work", "billing", "file", "meeting", "me", "all"];

function groupByEntity(): Map<string, FieldDescriptor[]> {
  const groups = new Map<string, FieldDescriptor[]>();
  for (const key of Object.keys(FIELD_REGISTRY)) {
    const field = FIELD_REGISTRY[key];
    const entity = field.entityType;
    if (!groups.has(entity)) groups.set(entity, []);
    groups.get(entity)!.push(field);
  }
  return groups;
}

/**
 * Fields whose write path is a junction table rather than a column on the
 * entity's own table. Keyed by `entityType:key`.
 */
const JUNCTION_WRITE_PATHS: Record<string, string> = {
  "org:primaryContact": "organization_people.is_primary",
};

function coverageFlag(field: FieldDescriptor): string {
  if (field.isReadonly || getWritePolicy(field) === "system_derived") return "derived";
  if (JUNCTION_WRITE_PATHS[`${field.entityType}:${field.key}`]) return "junction";
  if (!field.dbColumn) return "**NO-WRITE-PATH**";
  return "ok";
}

function renderTable(fields: FieldDescriptor[]): string {
  const header =
    "| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |\n" +
    "|-------|------|------------|-----------|--------------|--------|--------|----------|";
  const rows = fields.map((f) =>
    [
      "",
      f.key,
      f.fieldType,
      f.vocabulary ?? "—",
      f.dbColumn ?? JUNCTION_WRITE_PATHS[`${f.entityType}:${f.key}`] ?? "—",
      getWritePolicy(f),
      f.formatRule ?? "—",
      f.dedupeRole ?? "—",
      coverageFlag(f),
      "",
    ].join(" | ").trim()
  );
  return [header, ...rows].join("\n");
}

function main() {
  const groups = groupByEntity();
  const orderedEntities = [
    ...TYPE_ORDER.filter((t) => groups.has(t)),
    ...[...groups.keys()].filter((t) => !TYPE_ORDER.includes(t)),
  ];

  let totalFields = 0;
  let totalGaps = 0;

  const sections = orderedEntities.map((entity) => {
    const fields = groups.get(entity)!;
    totalFields += fields.length;
    const gaps = fields.filter((f) => coverageFlag(f).includes("NO-WRITE-PATH")).length;
    totalGaps += gaps;
    return [
      `## ${entity} (${fields.length} fields${gaps ? `, ${gaps} uncovered` : ""})`,
      "",
      renderTable(fields),
    ].join("\n");
  });

  const doc = [
    "# Memory field coverage matrix",
    "",
    "> GENERATED — do not edit. Run `pnpm coverage:fields` to refresh.",
    "> Source: `app/_features/memory/taxonomy/field-registry.ts` (the field-contract registry).",
    "> A **NO-WRITE-PATH** row is an editable contracted field with no backing column — a visible gap.",
    "",
    `**${totalFields} contracted fields · ${totalGaps} uncovered.**`,
    "",
    ...sections,
    "",
  ].join("\n\n");

  fs.writeFileSync(OUT_PATH, doc);
  console.log(`Wrote ${OUT_PATH} — ${totalFields} fields, ${totalGaps} uncovered.`);
}

main();
