#!/usr/bin/env tsx
/**
 * check-migration-grants — every table created by a migration must be
 * granted to an API role somewhere in the migration history.
 *
 * Why: default privileges do not cover migration-created tables in our
 * Supabase projects, so a missing GRANT means every PostgREST read fails
 * with 42501 "permission denied for table" — service_role included. Three
 * same-day repairs on 2026-08-29 (tool_capabilities, correction_events,
 * playbook_definitions) made the pattern undeniable. See supabase/CLAUDE.md
 * "GRANT Rule" — the rule is same-file; this check verifies coverage
 * anywhere so repair migrations count.
 *
 * Scope: public-schema tables only (PostgREST-exposed). Migrations older
 * than the rule date are grandfathered — they predate the failure mode.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Rule learned 2026-08-29; older migrations are not retrofitted. */
const RULE_EPOCH = "20260829000000";

const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\s*\.\s*)?"?([a-z0-9_]+)"?/gi;
const GRANT_RE =
  /GRANT\s+[A-Z,\s]+?\s+ON\s+(?:(\w+)\s*\.\s*)?"?([a-z0-9_]+)"?\s+TO/gi;

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// Pass 1: every public table granted anywhere in history.
const grantedAnywhere = new Set<string>();
for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
  for (const match of sql.matchAll(GRANT_RE)) {
    const schema = match[1] ?? "public";
    if (schema === "public") grantedAnywhere.add(match[2]);
  }
}

// Pass 2: tables created by post-rule migrations must be covered.
const violations: Array<{ file: string; table: string }> = [];
for (const file of files) {
  if (file < RULE_EPOCH) continue;
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
  for (const match of sql.matchAll(CREATE_TABLE_RE)) {
    const schema = match[1] ?? "public";
    const table = match[2];
    if (schema !== "public") continue;
    if (!grantedAnywhere.has(table)) {
      violations.push({ file, table });
    }
  }
}

if (violations.length > 0) {
  console.error("Migrations creating tables without GRANTs:\n");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.table}`);
  }
  console.error(
    `\nAdd GRANT ... ON public.<table> TO authenticated/service_role in the same file.`
  );
  console.error(`See supabase/CLAUDE.md — "GRANT Rule".`);
  process.exit(1);
}

console.log(`check-migration-grants: ${files.length} migrations clean.`);
