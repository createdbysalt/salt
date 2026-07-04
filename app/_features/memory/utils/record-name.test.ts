import { describe, expect, it } from "vitest";
import {
  isPlaceholderRecordName,
  validateFileLinkUrl,
  validateRecordName,
} from "./record-name";

describe("validateRecordName", () => {
  it("accepts a real name", () => {
    expect(validateRecordName("  Acme Corp  ")).toEqual({ ok: true, name: "Acme Corp" });
  });

  it("rejects empty names", () => {
    expect(validateRecordName("   ")).toEqual({ ok: false, message: "Name is required" });
  });

  it("rejects blank-record placeholders", () => {
    expect(validateRecordName("Untitled")).toEqual({
      ok: false,
      message: "Replace the placeholder with a real name",
    });
    expect(isPlaceholderRecordName("Untitled work")).toBe(true);
  });
});

describe("validateFileLinkUrl", () => {
  it("rejects the pending placeholder URL", () => {
    expect(validateFileLinkUrl("https://pending.usesalt.io")).toEqual({
      ok: false,
      message: "Replace the placeholder link with a real URL",
    });
  });

  it("accepts a valid URL", () => {
    expect(validateFileLinkUrl("https://example.com/doc.pdf")).toEqual({
      ok: true,
      url: "https://example.com/doc.pdf",
    });
  });
});
