import { describe, expect, it } from "vitest";
import {
  readFreshNarrative,
  RECORD_NARRATIVE_TTL_MS,
  type CachedRecordNarrativeRow,
} from "./record-narrative-cache";

const NOW = new Date("2026-06-27T12:00:00.000Z").getTime();
const HASH = "deadbeef";

function row(overrides: Partial<CachedRecordNarrativeRow> = {}): CachedRecordNarrativeRow {
  return {
    ai_summary: "Jane is a client.",
    ai_worth_attention: "Follow up on the open invoice.",
    ai_worth_attention_play: "Send a reminder",
    ai_summary_inputs_hash: HASH,
    ai_summary_model: "openai/gpt-4o-mini",
    ai_summary_generated_at: new Date(NOW - 1000).toISOString(),
    ...overrides,
  };
}

describe("readFreshNarrative", () => {
  it("returns the cached narrative when fresh and hash matches", () => {
    const result = readFreshNarrative(row(), HASH, { now: NOW });
    expect(result).toEqual({
      summary: "Jane is a client.",
      worthAttention: { reason: "Follow up on the open invoice.", suggestedPlay: "Send a reminder" },
      model: "openai/gpt-4o-mini",
      generatedAt: new Date(NOW - 1000).toISOString(),
    });
  });

  it("returns null when the row is missing", () => {
    expect(readFreshNarrative(null, HASH, { now: NOW })).toBeNull();
    expect(readFreshNarrative(undefined, HASH, { now: NOW })).toBeNull();
  });

  it("returns null when there is no summary", () => {
    expect(readFreshNarrative(row({ ai_summary: null }), HASH, { now: NOW })).toBeNull();
    expect(readFreshNarrative(row({ ai_summary: "   " }), HASH, { now: NOW })).toBeNull();
  });

  it("returns null when the inputs hash differs (signals changed)", () => {
    expect(readFreshNarrative(row({ ai_summary_inputs_hash: "other" }), HASH, { now: NOW })).toBeNull();
    expect(readFreshNarrative(row({ ai_summary_inputs_hash: null }), HASH, { now: NOW })).toBeNull();
  });

  it("returns null when past the TTL", () => {
    const stale = row({
      ai_summary_generated_at: new Date(NOW - RECORD_NARRATIVE_TTL_MS - 1).toISOString(),
    });
    expect(readFreshNarrative(stale, HASH, { now: NOW })).toBeNull();
  });

  it("returns null when generated_at is missing or invalid", () => {
    expect(readFreshNarrative(row({ ai_summary_generated_at: null }), HASH, { now: NOW })).toBeNull();
    expect(readFreshNarrative(row({ ai_summary_generated_at: "not-a-date" }), HASH, { now: NOW })).toBeNull();
  });

  it("tolerates empty worth-attention fields", () => {
    const result = readFreshNarrative(
      row({ ai_worth_attention: null, ai_worth_attention_play: null }),
      HASH,
      { now: NOW },
    );
    expect(result?.worthAttention).toEqual({ reason: "", suggestedPlay: "" });
  });
});
