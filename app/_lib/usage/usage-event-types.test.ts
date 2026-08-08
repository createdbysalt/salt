import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { USAGE_EVENT_TYPES } from "./types";

/**
 * The DB enforces usage_events.event_type with a CHECK constraint; the app
 * enforces it with the UsageEventType union. When they drift, ledger writes
 * for the missing type fail the constraint and are SWALLOWED (the ledger is
 * non-fatal by design) — metering goes silently dead, and unit tests cannot
 * see it because they mock the database. This happened with composio_action
 * (caught by live staging verification, 2026-08-08). This test pins the two
 * lists together: add a type without a migration and CI fails loudly.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const CONSTRAINT = "usage_events_event_type_check";

function latestConstraintDefinition(): { file: string; types: string[] } {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let latest: { file: string; types: string[] } | null = null;
  for (const file of files) {
    const source = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    if (!source.includes(CONSTRAINT)) continue;
    const match = source.match(
      /ADD CONSTRAINT usage_events_event_type_check\s+CHECK \(event_type IN \(([\s\S]*?)\)\s*\)/,
    );
    if (!match) continue;
    const types = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    latest = { file, types };
  }

  if (!latest) {
    throw new Error(
      `no migration defines ${CONSTRAINT} — if the constraint was dropped, delete this test deliberately`,
    );
  }
  return latest;
}

describe("usage event types stay in lockstep with the DB constraint", () => {
  it("USAGE_EVENT_TYPES matches the newest usage_events_event_type_check migration", () => {
    const { file, types } = latestConstraintDefinition();
    expect(
      [...types].sort(),
      `TS USAGE_EVENT_TYPES and the CHECK list in ${file} must be identical — ` +
        `a type on one side only means silently-swallowed ledger writes. ` +
        `Add the missing side (new migration re-creating the constraint, or ` +
        `the TS entry) before merging.`,
    ).toEqual([...USAGE_EVENT_TYPES].sort());
  });
});
