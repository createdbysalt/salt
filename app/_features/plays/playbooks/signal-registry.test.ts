import { describe, expect, it } from "vitest";
import {
  SIGNAL_REGISTRY,
  isValidSignalKey,
  getSignalDefinition,
  getActingTriggerSignals,
  getSignalsForSurface,
  ALL_SIGNAL_KEYS,
} from "./signal-registry";
import { PROFILE_SIGNAL_KEYS } from "./records-engine/types";

describe("Signal Registry", () => {
  it("contains all profile signal keys", () => {
    for (const key of PROFILE_SIGNAL_KEYS) {
      expect(isValidSignalKey(key)).toBe(true);
    }
  });

  it("has descriptions for all signals", () => {
    for (const signal of SIGNAL_REGISTRY) {
      expect(signal.description).toBeTruthy();
      expect(signal.firesWhen).toBeTruthy();
      expect(typeof signal.canTriggerActing).toBe("boolean");
    }
  });

  it("isValidSignalKey returns false for unknown keys", () => {
    expect(isValidSignalKey("unknown_signal")).toBe(false);
    expect(isValidSignalKey("")).toBe(false);
  });

  it("getSignalDefinition returns definition for valid keys", () => {
    const def = getSignalDefinition("has_payment_received");
    expect(def).not.toBeNull();
    expect(def?.surface).toBe("person");
    expect(def?.canTriggerActing).toBe(true);
  });

  it("getActingTriggerSignals returns only acting-capable signals", () => {
    const acting = getActingTriggerSignals();
    expect(acting.length).toBeGreaterThan(0);
    for (const signal of acting) {
      expect(signal.canTriggerActing).toBe(true);
    }
  });

  it("getSignalsForSurface filters by surface", () => {
    const personSignals = getSignalsForSurface("person");
    expect(personSignals.length).toBeGreaterThan(0);
    for (const signal of personSignals) {
      expect(signal.surface).toBe("person");
    }
  });

  it("ALL_SIGNAL_KEYS matches PROFILE_SIGNAL_KEYS", () => {
    expect(ALL_SIGNAL_KEYS.size).toBe(PROFILE_SIGNAL_KEYS.length);
    for (const key of PROFILE_SIGNAL_KEYS) {
      expect(ALL_SIGNAL_KEYS.has(key)).toBe(true);
    }
  });
});
