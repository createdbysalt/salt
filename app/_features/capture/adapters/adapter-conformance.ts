import { expect } from "vitest";
import { PERSON_SIGNAL_KEYS } from "@/app/_features/capture/services/system-plays/person-signals";
import { PERSON_FIELD_SIGNAL_KEYS } from "@/app/_features/capture/services/producers/person-field-types";
import {
  MEETING_FIELD_SIGNAL_KEYS,
  ORG_FIELD_SIGNAL_KEYS,
  WORK_FIELD_SIGNAL_KEYS,
} from "@/app/_features/capture/services/producers/record-field-types";
import type { CaptureAdapter, CaptureEnvelope } from "./types";

/**
 * Conformance harness (connector-platform Phase 3.2): every capture adapter
 * must pass these asserts against golden payload fixtures before it ships.
 * The generic ingestor only ever sees the envelope contract, so a conformant
 * adapter cannot break the downstream capture/records engine.
 */
export interface AdapterFixture {
  name: string;
  payload: unknown;
  /** null = the adapter should decline to ingest this payload. */
  expectExternalId: string | null;
  /**
   * Detail-contract keys (docs/architecture/capture-detail-contract.md) that
   * this payload must populate in envelope.extracted — present and non-null.
   * List only what the payload actually carries: pointer-only trigger shapes
   * assert `needs_hydration` instead of content fields.
   */
  expectContractFields?: readonly string[];
}

export function runAdapterConformance(
  adapter: CaptureAdapter,
  fixtures: readonly AdapterFixture[],
): void {
  // triggerSlugs may be empty for reconciliation-only sources (no Composio
  // trigger coverage, or slugs pending verification against the live
  // triggers_types API) — those adapters ingest via backfill + the 3.6 cron.
  expect(Array.isArray(adapter.triggerSlugs)).toBe(true);

  // Entity extraction (Connector Rules & Learning, Phase 2): every adapter
  // implements the single feedbackEntity derivation; results are null or a
  // well-formed { type, key }.
  expect(typeof adapter.extractFeedbackEntity).toBe("function");

  // Signal derivation (Phase 5.1): declared signals ⊆ registry set.
  if (adapter.deriveSignals) {
    const envelopes = fixtures
      .map((fixture) => adapter.normalize(fixture.payload))
      .filter((envelope): envelope is CaptureEnvelope => envelope !== null);
    const derived = adapter.deriveSignals(envelopes, { userEmail: null });
    const registrySet = new Set<string>(PERSON_SIGNAL_KEYS);
    for (const [email, signals] of derived) {
      expect(email.includes("@")).toBe(true);
      for (const key of Object.keys(signals)) {
        expect(registrySet.has(key), `signal '${key}' not in registry set`).toBe(true);
      }
    }
  }

  // Field-signal derivation (registry-wiring Phase 4): declared field
  // signals ⊆ PERSON_FIELD_SIGNAL_KEYS.
  if (adapter.deriveFieldSignals) {
    const envelopes = fixtures
      .map((fixture) => adapter.normalize(fixture.payload))
      .filter((envelope): envelope is CaptureEnvelope => envelope !== null);
    const derived = adapter.deriveFieldSignals(envelopes, { userEmail: null });
    const fieldSignalSet = new Set<string>(PERSON_FIELD_SIGNAL_KEYS);
    for (const [email, fields] of derived) {
      expect(email.includes("@")).toBe(true);
      for (const key of Object.keys(fields.signalValues)) {
        expect(
          fieldSignalSet.has(key),
          `field signal '${key}' not in registry set`
        ).toBe(true);
      }
    }
  }

  // Record-signal derivation (CRM org + deal producer): declared signals ⊆
  // ORG_FIELD_SIGNAL_KEYS / WORK_FIELD_SIGNAL_KEYS, org keys carry the
  // domain:/name: resolution prefix.
  if (adapter.deriveRecordSignals) {
    const envelopes = fixtures
      .map((fixture) => adapter.normalize(fixture.payload))
      .filter((envelope): envelope is CaptureEnvelope => envelope !== null);
    const derived = adapter.deriveRecordSignals(envelopes, { userEmail: null });
    const orgSignalSet = new Set<string>(ORG_FIELD_SIGNAL_KEYS);
    const workSignalSet = new Set<string>(WORK_FIELD_SIGNAL_KEYS);
    for (const [key, fields] of derived.orgs) {
      expect(
        key.startsWith("domain:") || key.startsWith("name:"),
        `org key '${key}' needs a domain: or name: resolution prefix`,
      ).toBe(true);
      for (const signal of Object.keys(fields.signalValues)) {
        expect(
          orgSignalSet.has(signal),
          `org signal '${signal}' not in registry set`,
        ).toBe(true);
      }
    }
    for (const [, fields] of derived.deals) {
      for (const signal of Object.keys(fields.signalValues)) {
        expect(
          workSignalSet.has(signal),
          `work signal '${signal}' not in registry set`,
        ).toBe(true);
      }
    }
    const meetingSignalSet = new Set<string>(MEETING_FIELD_SIGNAL_KEYS);
    for (const [externalId, fields] of derived.meetings ?? []) {
      expect(
        externalId.length > 0,
        "meeting record signals need the provider transcript id as key",
      ).toBe(true);
      for (const signal of Object.keys(fields.signalValues)) {
        expect(
          meetingSignalSet.has(signal),
          `meeting signal '${signal}' not in registry set`,
        ).toBe(true);
      }
    }
  }

  for (const fixture of fixtures) {
    const envelope = adapter.normalize(fixture.payload);

    if (fixture.expectExternalId === null) {
      expect(envelope, `${fixture.name}: expected decline`).toBeNull();
      continue;
    }

    expect(envelope, `${fixture.name}: expected an envelope`).not.toBeNull();
    if (!envelope) continue;

    // Identity + dedupe stability
    expect(envelope.externalId).toBe(fixture.expectExternalId);
    const second = adapter.normalize(fixture.payload);
    expect(second?.externalId, `${fixture.name}: dedupe key must be stable`).toBe(
      envelope.externalId,
    );

    // Source integrity
    expect(envelope.sourceType).toBe(adapter.sourceType);

    // Contract shape
    expect(Array.isArray(envelope.participants)).toBe(true);
    for (const participant of envelope.participants) {
      expect(participant.email === null || participant.email.includes("@")).toBe(
        true,
      );
    }
    if (envelope.occurredAt !== null) {
      expect(Number.isNaN(Date.parse(envelope.occurredAt))).toBe(false);
    }

    // Envelope retention: raw payload stays thin (pointer + headers, no
    // mirrored bodies). 4KB is generous for headers; full content is
    // hydrated on demand.
    expect(JSON.stringify(envelope.raw).length).toBeLessThan(4096);

    // Message-like captures must consult the noise gate
    if (envelope.captureType === "message") {
      expect(envelope.noise, `${fixture.name}: messages need noise input`).not.toBeNull();
      expect(envelope.noise?.sourceType).toBe(adapter.sourceType);
    }

    const entity = adapter.extractFeedbackEntity(envelope);
    if (entity !== null) {
      expect(
        entity.type.length > 0 && entity.key.length > 0,
        `${fixture.name}: feedbackEntity needs non-empty type and key`,
      ).toBe(true);
    }

    // Detail contract (capture-detail-contract.md): declared fields must be
    // populated — undefined means the adapter never wrote the key, null means
    // it wrote it but extracted nothing. Both fail.
    if (fixture.expectContractFields) {
      const extracted = envelope.extracted as Record<string, unknown>;
      for (const field of fixture.expectContractFields) {
        const value = extracted[field];
        expect(
          value !== undefined && value !== null,
          `${fixture.name}: contract field '${field}' is ${value === undefined ? "missing" : "null"}`,
        ).toBe(true);
        if (Array.isArray(value)) {
          expect(
            value.length,
            `${fixture.name}: contract field '${field}' is an empty array`,
          ).toBeGreaterThan(0);
        }
      }
    }
  }
}
