import { expect } from "vitest";
import { PERSON_SIGNAL_KEYS } from "@/app/_features/capture/services/system-plays/person-signals";
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
}

export function runAdapterConformance(
  adapter: CaptureAdapter,
  fixtures: readonly AdapterFixture[],
): void {
  // triggerSlugs may be empty for reconciliation-only sources (no Composio
  // trigger coverage, or slugs pending verification against the live
  // triggers_types API) — those adapters ingest via backfill + the 3.6 cron.
  expect(Array.isArray(adapter.triggerSlugs)).toBe(true);

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
  }
}
