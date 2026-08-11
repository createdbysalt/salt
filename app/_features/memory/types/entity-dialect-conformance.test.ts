/**
 * Dialect conformance guard (Phase 0, registry-wiring plan).
 *
 * The `20260810150000_rename_files_to_resources` migration rebuilt CHECK
 * constraints on nine tables so they only accept the singular `'resource'`
 * spelling: entity_links (source_type/target_type), entity_source_history,
 * entity_evidence, pending_evidence, profile_field_provenance,
 * lifecycle_events, salt_learnings, correction_events (entity_type), and
 * workspace_tags (scope). Any writer still emitting `'file'` fails at the
 * database; any reader filtering only `'file'` misses new rows.
 *
 * New code must route through `toDbEntityType`/`fromDbEntityType`
 * (`./entity-type.ts`) or the learning-dialect adapters
 * (`_lib/learning/entity-type.ts`). Readers dual-read legacy `'file'` rows
 * with `.in(["resource", "file"])` until the backfill is verified complete.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = join(__dirname, "../../..");
const REPO_ROOT = join(APP_ROOT, "..");

/**
 * Files allowed to reference the legacy `'file'` spelling because they ARE
 * the normalization layer (or mirror a DB enum that still contains it).
 * Everything else must speak `'resource'`.
 */
const ALLOWLIST = new Set([
  // Short-dialect adapter: legacy 'file' -> 'resource' mapping lives here.
  "app/_features/memory/types/entity-type.ts",
  // Learning-dialect adapter: dual-reads legacy 'file' rows.
  "app/_lib/learning/entity-type.ts",
]);

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\bsource_type:\s*"file"/,
    reason: `entity_links writes must use source_type: "resource"`,
  },
  {
    pattern: /\btarget_type:\s*"file"/,
    reason: `entity_links writes must use target_type: "resource"`,
  },
  {
    pattern: /\bentity_type:\s*"file"/,
    reason: `entity_type writes must use "resource" (route through toDbEntityType)`,
  },
  {
    pattern: /\bscope:\s*"file"/,
    reason: `workspace_tags.scope writes must use "resource"`,
  },
  {
    pattern: /\.eq\(\s*"(?:source_type|target_type|entity_type|scope)"\s*,\s*"file"/,
    reason:
      `single-spelling reads miss post-rename rows; dual-read with ` +
      `.in(["resource", "file"]) or normalize via fromDbEntityType`,
  },
  {
    pattern: /\bp_entity_type:\s*"file"/,
    reason: `RPC entity-type args must use "resource"`,
  },
];

/** Renamed satellite tables (resource_tag_assignments, resource_activities)
 *  use `resource_id`; a `file_id` reference in the same module is a stale
 *  pre-rename column name. */
const RENAMED_TABLE_PATTERN = /\.from\(\s*"resource_(?:tag_assignments|activities)"\s*\)/;
const STALE_COLUMN_PATTERN = /\bfile_id\b/;

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("resource dialect conformance", () => {
  it("no writer emits the legacy 'file' dialect into the nine renamed tables", () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(APP_ROOT)) {
      const rel = relative(REPO_ROOT, file);
      if (ALLOWLIST.has(rel)) continue;
      if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) continue;
      if (rel.endsWith("database.types.ts")) continue;

      const source = readFileSync(file, "utf8");

      for (const { pattern, reason } of FORBIDDEN) {
        const match = source.match(pattern);
        if (match) {
          violations.push(`${rel}: ${reason}\n    found: \`${match[0]}\``);
        }
      }

      if (RENAMED_TABLE_PATTERN.test(source) && STALE_COLUMN_PATTERN.test(source)) {
        violations.push(
          `${rel}: references resource_tag_assignments/resource_activities ` +
            `but still uses the pre-rename \`file_id\` column (now \`resource_id\`)`
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
