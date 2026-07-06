/**
 * Vocabulary triple-equality tests (keeper-field-contracts, Layer 3).
 *
 * For each controlled vocabulary: registry slugs === DB value set === UI
 * select options. The DB side comes from two sources:
 * - Postgres ENUMs: `Constants.public.Enums` in the generated Supabase types
 *   (regenerated from the live linked project — trustworthy introspection).
 * - CHECK constraints: db-vocabulary-fixture.ts (refreshed on migration).
 *
 * UI selects read from getVocabularyOptions since Phase 3, so the UI side is
 * asserted through the same option builders the components use — including
 * scope filtering (org relationship hides person-only values). Currency is
 * a single uppercase ISO-4217 canon shared by registry, DB CHECKs, and UI.
 *
 * The three-relationship-vocabularies bug class cannot recur while these
 * are green.
 */

import { describe, expect, it } from "vitest";
import { Constants } from "@/app/_lib/supabase/database.types";
import { DB_CHECK_VOCABULARIES } from "./db-vocabulary-fixture";
import {
  RELATIONSHIP_TYPES,
  VOCABULARY_REGISTRY,
  getVocabularyOptions,
} from "./registry";

function registrySlugs(vocabularyKey: string): string[] {
  return (VOCABULARY_REGISTRY[vocabularyKey]?.values ?? []).map((v) => v.slug);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("registry === DB CHECK constraints", () => {
  it("relationship_type matches the shared people/orgs CHECK set", () => {
    expect(sorted(registrySlugs("relationship_type"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.relationship_type),
    );
    expect(sorted(RELATIONSHIP_TYPES)).toEqual(
      sorted(DB_CHECK_VOCABULARIES.relationship_type),
    );
  });

  it("work_status matches the projects.status CHECK set", () => {
    expect(sorted(registrySlugs("work_status"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.work_status),
    );
  });

  it("meeting_type matches the meetings CHECK set", () => {
    expect(sorted(registrySlugs("meeting_type"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.meeting_type),
    );
  });

  it("meeting_status matches the meetings CHECK set", () => {
    expect(sorted(registrySlugs("meeting_status"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.meeting_status),
    );
  });

  it("meeting_location_type matches the meetings CHECK set", () => {
    expect(sorted(registrySlugs("meeting_location_type"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.meeting_location_type),
    );
  });

  it("record_status matches the people/orgs CHECK set", () => {
    expect(sorted(registrySlugs("record_status"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.record_status),
    );
  });

  it("registry currency slugs match the billing_records CHECK set exactly", () => {
    // Uppercase ISO-4217 canon (20260703180000): billing CHECK === registry
    // currency vocabulary, no case conversion.
    expect(sorted(registrySlugs("currency"))).toEqual(
      sorted(DB_CHECK_VOCABULARIES.billing_currency),
    );
  });
});

describe("registry === DB enums (generated types)", () => {
  it("billing_status matches the billing_status enum", () => {
    expect(sorted(registrySlugs("billing_status"))).toEqual(
      sorted(Constants.public.Enums.billing_status),
    );
  });

  it("billing_direction matches the billing_direction enum", () => {
    expect(sorted(registrySlugs("billing_direction"))).toEqual(
      sorted(Constants.public.Enums.billing_direction),
    );
  });

  it("billing_category matches the billing_category enum", () => {
    expect(sorted(registrySlugs("billing_category"))).toEqual(
      sorted(Constants.public.Enums.billing_category),
    );
  });

  it("payment_terms matches the work_payment_terms enum", () => {
    expect(sorted(registrySlugs("payment_terms"))).toEqual(
      sorted(Constants.public.Enums.work_payment_terms),
    );
  });

  it("work_type matches the work_type enum", () => {
    expect(sorted(registrySlugs("work_type"))).toEqual(
      sorted(Constants.public.Enums.work_type),
    );
  });

  it("file_category matches the file_category enum", () => {
    expect(sorted(registrySlugs("file_category"))).toEqual(
      sorted(Constants.public.Enums.file_category),
    );
  });
});

describe("UI option builders === registry", () => {
  it("person relationship options expose all nine canon values", () => {
    const options = getVocabularyOptions("relationship_type", "person").map((o) => o.value);
    expect(sorted(options)).toEqual(sorted(registrySlugs("relationship_type")));
  });

  it("org relationship options hide exactly the person-only values", () => {
    const options = getVocabularyOptions("relationship_type", "org").map((o) => o.value);
    const expected = registrySlugs("relationship_type").filter(
      (slug) => slug !== "team" && slug !== "personal",
    );
    expect(sorted(options)).toEqual(sorted(expected));
  });

  it("currency select options match the DB CHECK set", () => {
    const options = getVocabularyOptions("currency").map((o) => o.value);
    expect(sorted(options)).toEqual(sorted(DB_CHECK_VOCABULARIES.billing_currency));
  });

  it("every vocabulary referenced by a field descriptor yields options", () => {
    for (const key of Object.keys(VOCABULARY_REGISTRY)) {
      expect(getVocabularyOptions(key).length).toBeGreaterThan(0);
    }
  });
});
