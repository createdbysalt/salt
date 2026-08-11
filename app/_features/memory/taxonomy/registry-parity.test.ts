/**
 * Registry parity conformance (Phase 3 of
 * .cursor/plans/2026-08-10-registry-wiring-record-sourcing.md).
 *
 * Locks the registry to reality in four directions:
 *
 * 1. Signal producers — every fillRule signal has at least one producer in
 *    app/ code (computed in get-facts, emitted in capture/system-play code,
 *    or produced by a playbook). Gaps must be explicitly whitelisted in
 *    SIGNALS_AWAITING_PRODUCER with the phase that will add the producer —
 *    and the whitelist is a ratchet: once a producer lands, the stale entry
 *    fails CI until removed.
 * 2. Care coverage — every care_auto field has fillRules (something must
 *    drive the automatic write the policy promises).
 * 3. Customize card coverage — every non-readonly field of a Customize
 *    entity type lands in exactly one Zone 1 chip group (auto-filled,
 *    suggested, never touched). A field that falls through renders nowhere.
 * 4. Reference-field connection parity — every fieldType:"reference" field
 *    declares its graph projection (or an exemption) in
 *    connections/reference-projections.ts, and the projection mechanism is
 *    still present in connections/queries.ts. Behavioral proof lives in
 *    connections/reference-projections.test.ts.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_CONTRACT_FIELDS,
  getFieldsForEntity,
  getWritePolicy,
} from "./field-registry";
import {
  MEMORY_CUSTOMIZE_ENTITY_TYPES,
  defaultGuidanceForType,
} from "../customize/default-guidance";
import {
  REFERENCE_FIELD_PROJECTIONS,
  REFERENCE_FIELD_EXEMPTIONS,
} from "@/app/_features/connections/reference-projections";

const APP_ROOT = join(__dirname, "..", "..", "..");

/** Declaration sites — a signal name appearing here is not a producer. */
const DECLARATION_DIRS = [join("app", "_features", "memory", "taxonomy")];

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(path, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.tsx?$/.test(entry.name)
    ) {
      out.push(path);
    }
  }
  return out;
}

function producerCorpus(): string[] {
  return collectSourceFiles(APP_ROOT)
    .filter(
      (path) =>
        !DECLARATION_DIRS.some((decl) => path.includes(decl))
    )
    .map((path) => readFileSync(path, "utf8"));
}

const ALL_FILL_RULE_SIGNALS = [
  ...new Set(
    ALL_CONTRACT_FIELDS.flatMap((field) =>
      (field.fillRules ?? []).map((rule) => rule.signal)
    )
  ),
].sort();

/**
 * Declared signals nothing produces yet. Each entry names the phase of the
 * registry-wiring plan that adds the producer. This list is the Phase 4/5
 * punch list — it only shrinks. A stale entry (producer exists) fails the
 * parity test below.
 */
const SIGNALS_AWAITING_PRODUCER: Record<string, string> = {
  // Phase 4 — People producers for the sourcing matrix
  person_observation_detected: "Phase 4: people producers",
  email_count_gte_5: "Phase 4: people producers",
  // Phase 5 — Orgs
  org_address_extracted: "Phase 5: org producers",
  org_tax_id_extracted: "Phase 5: org producers",
  // Phase 5 — Work
  work_type_inferred: "Phase 5: work producers",
  work_stage_inferred: "Phase 5: work producers",
  work_value_extracted: "Phase 5: work producers",
  work_timeline_mentioned: "Phase 5: work producers",
  // Phase 5/7 — Billing (artifact-first resources track)
  billing_invoice_parsed: "Phase 7: artifact-first billing producers",
  billing_stripe_synced: "Phase 7: artifact-first billing producers",
  // Phase 5/7 — Resources (artifact-first track)
  file_category_inferred: "Phase 7: artifact-first resource producers",
  file_document_type_inferred: "Phase 7: artifact-first resource producers",
  file_amount_extracted: "Phase 7: artifact-first resource producers",
  file_date_extracted: "Phase 7: artifact-first resource producers",
  // Phase 5 — Meetings
  meeting_type_inferred: "Phase 5: meeting producers",
  meeting_attendees_extracted: "Phase 5: meeting producers",
  // Phase 5+ — Tag-fit producers for non-person record types (the person
  // tag-fit producer shipped in Phase 4; these follow the same pattern)
  org_tag_fit_detected: "Phase 5+: tag-fit producers for orgs",
  work_tag_fit_detected: "Phase 5+: tag-fit producers for work",
  billing_tag_fit_detected: "Phase 5+: tag-fit producers for billing",
  resource_tag_fit_detected: "Phase 5+: tag-fit producers for resources",
  // Me (operator profile) — producers ship with the Me surface, outside
  // the Phase 4/5 record-type tracks.
  email_signoff_name_detected: "Me surface: operator producers",
  linkedin_profile_scanned: "Me surface: operator producers",
  linkedin_industry_detected: "Me surface: operator producers",
  operator_signature_has_title: "Me surface: operator producers",
  operator_phone_extracted: "Me surface: operator producers",
  operator_address_extracted: "Me surface: operator producers",
  operator_bio_extracted: "Me surface: operator producers",
  calendar_timezone_detected: "Me surface: operator producers",
  timezone_location_inferred: "Me surface: operator producers",
  workspace_website_found: "Me surface: operator producers",
  workspace_legal_name_extracted: "Me surface: operator producers",
  invoice_industry_pattern: "Me surface: operator producers",
  invoice_business_type_pattern: "Me surface: operator producers",
};

describe("registry parity: fillRule signals have producers", () => {
  const corpus = producerCorpus();

  it.each(ALL_FILL_RULE_SIGNALS.map((s) => [s] as const))(
    "signal %s is produced or explicitly whitelisted",
    (signal) => {
      const produced = corpus.some((source) => source.includes(signal));
      const whitelisted = signal in SIGNALS_AWAITING_PRODUCER;
      if (produced && whitelisted) {
        throw new Error(
          `Signal "${signal}" now has a producer — remove the stale whitelist entry (${SIGNALS_AWAITING_PRODUCER[signal]})`
        );
      }
      if (!produced && !whitelisted) {
        throw new Error(
          `Signal "${signal}" is referenced by a fillRule but nothing produces it. ` +
            `Add a producer or whitelist it in SIGNALS_AWAITING_PRODUCER with the owning phase.`
        );
      }
    }
  );

  it("whitelist only names signals the registry actually uses", () => {
    for (const signal of Object.keys(SIGNALS_AWAITING_PRODUCER)) {
      expect(
        ALL_FILL_RULE_SIGNALS,
        `whitelisted signal "${signal}" is not referenced by any fillRule`
      ).toContain(signal);
    }
  });
});

describe("registry parity: care policies are backed by rules", () => {
  it("every care_auto field has at least one fillRule", () => {
    const gaps = ALL_CONTRACT_FIELDS.filter(
      (field) =>
        !field.isReadonly &&
        getWritePolicy(field) === "care_auto" &&
        (!field.fillRules || field.fillRules.length === 0)
    ).map((field) => `${field.entityType}.${field.key}`);
    expect(gaps).toEqual([]);
  });

  it("every care_ask field has at least one fillRule", () => {
    const gaps = ALL_CONTRACT_FIELDS.filter(
      (field) =>
        !field.isReadonly &&
        getWritePolicy(field) === "care_ask" &&
        (!field.fillRules || field.fillRules.length === 0)
    ).map((field) => `${field.entityType}.${field.key}`);
    expect(gaps).toEqual([]);
  });
});

describe("registry parity: Customize card covers every field", () => {
  it.each(MEMORY_CUSTOMIZE_ENTITY_TYPES.map((t) => [t] as const))(
    "%s fields each land in exactly one Zone 1 group",
    (entityType) => {
      const guidance = defaultGuidanceForType(entityType);
      const groups = guidance.fieldGroups;
      if (!groups) {
        throw new Error(`No fieldGroups rendered for ${entityType}`);
      }
      const covered = new Map<string, number>();
      for (const label of [
        ...groups.autoFilled,
        ...groups.suggested,
        ...groups.neverTouched,
      ]) {
        covered.set(label, (covered.get(label) ?? 0) + 1);
      }

      const fields = getFieldsForEntity(entityType).filter(
        (field) => !field.isReadonly
      );
      const uncovered = fields
        .filter((field) => !covered.has(field.label))
        .map((field) => field.key);
      const duplicated = [...covered.entries()]
        .filter(([, count]) => count > 1)
        .map(([label]) => label);

      expect(uncovered, "fields rendering in no group").toEqual([]);
      expect(duplicated, "labels rendering in multiple groups").toEqual([]);
    }
  );
});

describe("registry parity: reference fields are connections", () => {
  const referenceFields = ALL_CONTRACT_FIELDS.filter(
    (field) => field.fieldType === "reference"
  );

  it("every reference field declares a projection or an exemption", () => {
    const projected = new Set(
      REFERENCE_FIELD_PROJECTIONS.map((p) => `${p.entityType}.${p.fieldKey}`)
    );
    const exempted = new Set(
      REFERENCE_FIELD_EXEMPTIONS.map((e) => `${e.entityType}.${e.fieldKey}`)
    );

    for (const field of referenceFields) {
      const id = `${field.entityType}.${field.key}`;
      const declared = projected.has(id) || exempted.has(id);
      expect(
        declared,
        `reference field ${id} has no projection or exemption in connections/reference-projections.ts`
      ).toBe(true);
    }
  });

  it("projection/exemption entries name real registry reference fields", () => {
    const real = new Set(
      referenceFields.map((field) => `${field.entityType}.${field.key}`)
    );
    for (const entry of [
      ...REFERENCE_FIELD_PROJECTIONS.map((p) => `${p.entityType}.${p.fieldKey}`),
      ...REFERENCE_FIELD_EXEMPTIONS.map((e) => `${e.entityType}.${e.fieldKey}`),
    ]) {
      expect(
        real,
        `${entry} is declared in reference-projections.ts but is not a registry reference field`
      ).toContain(entry);
    }
  });

  it("each projection mechanism still exists in connections/queries.ts", () => {
    const queriesSource = readFileSync(
      join(
        APP_ROOT,
        "_features",
        "connections",
        "queries.ts"
      ),
      "utf8"
    );
    for (const projection of REFERENCE_FIELD_PROJECTIONS) {
      expect(
        queriesSource.includes(projection.mechanism),
        `${projection.entityType}.${projection.fieldKey} projection mechanism "${projection.mechanism}" is gone from connections/queries.ts`
      ).toBe(true);
    }
  });
});
