import { describe, expect, it } from "vitest";
import { fileLinkHref, fileLinkOpenLabel, fileLinkPlatformLabel, resolveFileRecordUrl } from "./link-display";
import type { MemoryFile } from "../data";

function linkFile(overrides: Partial<MemoryFile> = {}): MemoryFile {
  return {
    id: "file-1",
    name: "Example",
    kind: "link",
    category: "other",
    updatedAt: "2026-06-25T00:00:00Z",
    linkedTo: { kind: "person", id: "person-1", name: "Gabi" },
    source: "user",
    tags: [],
    provider: "web",
    domain: "preview--sparkle-dash-play.lovable.app",
    url: "https://preview--sparkle-dash-play.lovable.app/",
    ...overrides,
  };
}

describe("fileLinkOpenLabel", () => {
  it("uses the asset kind label", () => {
    expect(fileLinkOpenLabel(linkFile())).toBe("Open Link");
    expect(
      fileLinkOpenLabel(
        linkFile({
          kind: "document",
        }),
      ),
    ).toBe("Open Document");
  });
});

describe("resolveFileRecordUrl", () => {
  it("prefers external_url over app_url", () => {
    expect(
      resolveFileRecordUrl({
        externalUrl: "https://example.com/link",
        appUrl: "https://drive.google.com/file/abc",
      }),
    ).toBe("https://example.com/link");
  });
});

describe("fileLinkHref", () => {
  it("normalizes bare domains to https", () => {
    expect(fileLinkHref("example.com")).toBe("https://example.com");
    expect(fileLinkHref("https://example.com")).toBe("https://example.com");
  });
});

describe("fileLinkPlatformLabel", () => {
  it("still resolves known platforms for other callers", () => {
    expect(fileLinkPlatformLabel(linkFile())).toBe("Lovable");
    expect(
      fileLinkPlatformLabel(
        linkFile({
          provider: "figma",
          domain: "www.figma.com",
          url: "https://www.figma.com/file/abc",
        }),
      ),
    ).toBe("Figma");
  });
});
