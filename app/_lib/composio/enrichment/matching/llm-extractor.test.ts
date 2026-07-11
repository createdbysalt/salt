import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/ai", () => ({
  sendLlm: vi.fn(),
}));

import { sendLlm } from "@/app/_lib/ai";
import {
  extractFieldsWithLlm,
  extractSignatureFields,
  extractFromUnstructured,
} from "./llm-extractor";

const mockSendLlm = vi.mocked(sendLlm);

describe("extractFieldsWithLlm", () => {
  beforeEach(() => {
    mockSendLlm.mockClear();
  });

  it("extracts fields from LLM response", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "John Smith", confidence: 0.95, evidence: "John Smith" },
        { field: "email", value: "john@example.com", confidence: 0.90, evidence: "john@example.com" },
      ])
    );

    const results = await extractFieldsWithLlm(
      "John Smith\njohn@example.com",
      { targetFields: ["name", "email", "phone"] },
      "test-user"
    );

    expect(results).toHaveLength(2);
    expect(results[0].field).toBe("name");
    expect(results[0].value).toBe("John Smith");
    expect(results[0].rawConfidence).toBe(0.95);
    expect(results[0].calibratedConfidence).toBeLessThan(0.95);
  });

  it("filters out fields not in targetFields", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "John", confidence: 0.9, evidence: "John" },
        { field: "unknown", value: "xyz", confidence: 0.9, evidence: "xyz" },
      ])
    );

    const results = await extractFieldsWithLlm(
      "John",
      { targetFields: ["name"] },
      "test-user"
    );

    expect(results).toHaveLength(1);
    expect(results[0].field).toBe("name");
  });

  it("filters out low confidence extractions", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "John", confidence: 0.9, evidence: "John" },
        { field: "phone", value: "maybe", confidence: 0.3, evidence: "?" },
      ])
    );

    const results = await extractFieldsWithLlm(
      "John maybe",
      { targetFields: ["name", "phone"] },
      "test-user"
    );

    expect(results).toHaveLength(1);
    expect(results[0].field).toBe("name");
  });

  it("returns empty array for empty input", async () => {
    const results = await extractFieldsWithLlm(
      "",
      { targetFields: ["name"] },
      "test-user"
    );

    expect(results).toHaveLength(0);
    expect(mockSendLlm).not.toHaveBeenCalled();
  });

  it("returns empty array when LLM returns null", async () => {
    mockSendLlm.mockResolvedValueOnce(null);

    const results = await extractFieldsWithLlm(
      "some text",
      { targetFields: ["name"] },
      "test-user"
    );

    expect(results).toHaveLength(0);
  });

  it("handles malformed JSON gracefully", async () => {
    mockSendLlm.mockResolvedValueOnce("not valid json");

    const results = await extractFieldsWithLlm(
      "some text",
      { targetFields: ["name"] },
      "test-user"
    );

    expect(results).toHaveLength(0);
  });

  it("extracts JSON from mixed response", async () => {
    mockSendLlm.mockResolvedValueOnce(
      `Here are the extracted fields:
[{"field": "name", "value": "Jane", "confidence": 0.85, "evidence": "Jane"}]
That's all I found.`
    );

    const results = await extractFieldsWithLlm(
      "Jane",
      { targetFields: ["name"] },
      "test-user"
    );

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe("Jane");
  });
});

describe("extractSignatureFields", () => {
  beforeEach(() => {
    mockSendLlm.mockClear();
  });

  it("extracts common signature fields", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "Alice Brown", confidence: 0.95, evidence: "Alice Brown" },
        { field: "title", value: "CEO", confidence: 0.90, evidence: "CEO | Company" },
        { field: "organization", value: "Company", confidence: 0.85, evidence: "CEO | Company" },
      ])
    );

    const results = await extractSignatureFields(
      "Alice Brown\nCEO | Company",
      "test-user"
    );

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.field === "name")?.value).toBe("Alice Brown");
    expect(results.find((r) => r.field === "title")?.value).toBe("CEO");
    expect(results.find((r) => r.field === "organization")?.value).toBe("Company");
  });
});

describe("extractFromUnstructured", () => {
  beforeEach(() => {
    mockSendLlm.mockClear();
  });

  it("returns map of field to best result", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "Bob", confidence: 0.8, evidence: "Bob" },
        { field: "email", value: "bob@test.com", confidence: 0.9, evidence: "bob@test.com" },
      ])
    );

    const results = await extractFromUnstructured(
      { text: "Bob bob@test.com", source: "email", entityType: "person" },
      ["name", "email"],
      "test-user"
    );

    expect(results.size).toBe(2);
    expect(results.get("name")?.value).toBe("Bob");
    expect(results.get("email")?.value).toBe("bob@test.com");
  });

  it("keeps highest confidence when duplicates", async () => {
    mockSendLlm.mockResolvedValueOnce(
      JSON.stringify([
        { field: "name", value: "Bob", confidence: 0.7, evidence: "Bob" },
        { field: "name", value: "Robert", confidence: 0.9, evidence: "Robert" },
      ])
    );

    const results = await extractFromUnstructured(
      { text: "Bob Robert", source: "email", entityType: "person" },
      ["name"],
      "test-user"
    );

    expect(results.size).toBe(1);
    expect(results.get("name")?.value).toBe("Robert");
  });
});
