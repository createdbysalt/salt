import { describe, expect, it } from "vitest";
import { summarizeToolArgs } from "./execution-log";

describe("summarizeToolArgs", () => {
  it("keeps short values intact (recipients, subjects, ids)", () => {
    const summary = summarizeToolArgs({
      to: "client@example.com",
      cc: "partner@example.com",
      subject: "Invoice follow-up",
      maxResults: 10,
    });

    expect(summary).toEqual({
      to: "client@example.com",
      cc: "partner@example.com",
      subject: "Invoice follow-up",
      maxResults: 10,
    });
  });

  it("truncates long strings so full email bodies are never persisted", () => {
    const body = "a".repeat(5000);
    const summary = summarizeToolArgs({ body });

    expect(summary?.body).toMatch(/… \(5000 chars\)$/);
    expect(String(summary?.body).length).toBeLessThan(250);
  });

  it("summarizes nested objects (calendar event start/end)", () => {
    const summary = summarizeToolArgs({
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });

    expect(summary).toEqual({
      summary: "Kickoff",
      start: { dateTime: "2026-06-12T10:00:00Z" },
    });
  });

  it("returns null for non-object args", () => {
    expect(summarizeToolArgs(null)).toBeNull();
    expect(summarizeToolArgs("text")).toBeNull();
    expect(summarizeToolArgs(["a"])).toBeNull();
  });
});
