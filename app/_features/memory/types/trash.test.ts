import { describe, expect, it } from "vitest";
import {
  computePurgeAt,
  daysUntilPurge,
  TRASH_RETENTION_DAYS,
} from "./trash";

describe("computePurgeAt", () => {
  it("adds retention days to deleted_at", () => {
    const deletedAt = "2026-01-01T12:00:00.000Z";
    const purgeAt = computePurgeAt(deletedAt);
    const expected = new Date(deletedAt);
    expected.setUTCDate(expected.getUTCDate() + TRASH_RETENTION_DAYS);
    expect(purgeAt).toBe(expected.toISOString());
  });
});

describe("daysUntilPurge", () => {
  it("returns remaining days until purge", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const deletedAt = "2026-06-10T12:00:00.000Z";
    expect(daysUntilPurge(deletedAt, now)).toBe(20);
  });

  it("returns 0 when purge date has passed", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const deletedAt = "2026-06-01T12:00:00.000Z";
    expect(daysUntilPurge(deletedAt, now)).toBe(0);
  });
});
