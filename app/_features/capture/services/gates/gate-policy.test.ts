import { describe, expect, it } from "vitest";
import {
  DEFAULT_GATE_POLICY,
  resolveGatePolicy,
  type ResolvedGatePolicy,
} from "./gate-policy";

describe("resolveGatePolicy", () => {
  it("resolves null/undefined/garbage to the defaults", () => {
    expect(resolveGatePolicy(null)).toEqual(DEFAULT_GATE_POLICY);
    expect(resolveGatePolicy(undefined)).toEqual(DEFAULT_GATE_POLICY);
    expect(resolveGatePolicy("watched")).toEqual(DEFAULT_GATE_POLICY);
    expect(resolveGatePolicy(42)).toEqual(DEFAULT_GATE_POLICY);
    expect(resolveGatePolicy([])).toEqual(DEFAULT_GATE_POLICY);
  });

  it("defaults match behavior at ship time: automated dropped, strangers watched", () => {
    expect(DEFAULT_GATE_POLICY).toEqual({
      email: { automatedSenders: "dropped", strangers: "watched" },
    });
  });

  it("resolves a full valid policy", () => {
    expect(
      resolveGatePolicy({
        email: { automated_senders: "let_in", strangers: "dropped" },
      }),
    ).toEqual({
      email: { automatedSenders: "let_in", strangers: "dropped" },
    });
  });

  it("fills missing keys with defaults (partial policy)", () => {
    expect(resolveGatePolicy({ email: { strangers: "let_in" } })).toEqual({
      email: { automatedSenders: "dropped", strangers: "let_in" },
    });
    expect(resolveGatePolicy({ email: {} })).toEqual(DEFAULT_GATE_POLICY);
    expect(resolveGatePolicy({})).toEqual(DEFAULT_GATE_POLICY);
  });

  it("drops invalid values back to the default for that key", () => {
    const resolved = resolveGatePolicy({
      email: { automated_senders: "obliterated", strangers: null },
    });
    expect(resolved.email.automatedSenders).toBe("dropped");
    expect(resolved.email.strangers).toBe("watched");
  });

  it("ignores a non-object email section", () => {
    expect(resolveGatePolicy({ email: "everything" })).toEqual(
      DEFAULT_GATE_POLICY,
    );
  });

  it("never returns a shared mutable default instance", () => {
    const a: ResolvedGatePolicy = resolveGatePolicy(null);
    a.email.strangers = "dropped";
    expect(resolveGatePolicy(null).email.strangers).toBe("watched");
  });
});
