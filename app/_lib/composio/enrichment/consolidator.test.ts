import { describe, expect, it } from "vitest";
import { consolidateResults } from "./consolidator";
import type { ExtractorResult } from "./types";

describe("consolidateResults", () => {
  it("returns empty result when no extractors return data", () => {
    const results: ExtractorResult[] = [
      { source: "gmail", fields: {}, hasData: false },
      { source: "calendar", fields: {}, hasData: false },
    ];

    const result = consolidateResults("person", results);

    expect(result.entityType).toBe("person");
    expect(result.fields).toEqual({});
    expect(result.sourcesQueried).toEqual(["gmail", "calendar"]);
    expect(result.sourcesWithData).toEqual([]);
  });

  it("consolidates fields from multiple sources", () => {
    const results: ExtractorResult[] = [
      {
        source: "gmail",
        fields: {
          name: { value: "Jane Smith", confidence: 0.9 },
          phone: { value: "+1-555-0123", confidence: 0.7 },
        },
        hasData: true,
      },
      {
        source: "stripe",
        fields: {
          phone: { value: "+1-555-0456", confidence: 0.95 },
          billing_email: { value: "billing@acme.com", confidence: 1.0 },
        },
        hasData: true,
      },
    ];

    const result = consolidateResults("person", results);

    expect(result.fields.name).toEqual({
      value: "Jane Smith",
      confidence: 0.9,
      source: "gmail",
    });
    expect(result.fields.phone).toEqual({
      value: "+1-555-0456",
      confidence: 0.95,
      source: "stripe",
    });
    expect(result.fields.billing_email).toEqual({
      value: "billing@acme.com",
      confidence: 1.0,
      source: "stripe",
    });
    expect(result.sourcesWithData).toEqual(["gmail", "stripe"]);
  });

  it("higher confidence wins for the same field", () => {
    const results: ExtractorResult[] = [
      {
        source: "gmail",
        fields: { title: { value: "VP of Marketing", confidence: 0.8 } },
        hasData: true,
      },
      {
        source: "crm",
        fields: { title: { value: "VP Marketing", confidence: 0.6 } },
        hasData: true,
      },
    ];

    const result = consolidateResults("person", results);

    expect(result.fields.title.value).toBe("VP of Marketing");
    expect(result.fields.title.source).toBe("gmail");
  });

  it("deduplicates org connections by name or domain", () => {
    const results: ExtractorResult[] = [
      {
        source: "gmail",
        fields: {},
        connections: {
          orgs: [{ name: "Acme Corp", domain: "acme.com" }],
        },
        hasData: true,
      },
      {
        source: "calendar",
        fields: {},
        connections: {
          orgs: [
            { name: "Acme Corp", domain: "acme.com" },
            { name: "Other Inc" },
          ],
        },
        hasData: true,
      },
    ];

    const result = consolidateResults("person", results);

    expect(result.connections.orgs).toHaveLength(2);
    expect(result.connections.orgs?.[0].name).toBe("Acme Corp");
    expect(result.connections.orgs?.[1].name).toBe("Other Inc");
  });

  it("aggregates notes from all sources", () => {
    const results: ExtractorResult[] = [
      {
        source: "gmail",
        fields: {},
        notes: [{ content: "Email thread: Project discussion" }],
        hasData: true,
      },
      {
        source: "fireflies",
        fields: {},
        notes: [{ content: "Meeting note: Discussed Q3 goals" }],
        hasData: true,
      },
    ];

    const result = consolidateResults("person", results);

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].content).toBe("Email thread: Project discussion");
    expect(result.notes[0].source).toBe("gmail");
    expect(result.notes[1].content).toBe("Meeting note: Discussed Q3 goals");
    expect(result.notes[1].source).toBe("fireflies");
  });
});
