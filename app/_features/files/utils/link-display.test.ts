import { describe, expect, it } from "vitest";
import { fileLinkOpenLabel, fileLinkPlatformLabel } from "./link-display";
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
  it("uses a friendly platform name for long preview hosts", () => {
    expect(fileLinkOpenLabel(linkFile())).toBe("Open in Lovable");
    expect(fileLinkPlatformLabel(linkFile())).toBe("Lovable");
  });

  it("uses provider labels for known integrations", () => {
    expect(
      fileLinkOpenLabel(
        linkFile({
          provider: "figma",
          domain: "www.figma.com",
          url: "https://www.figma.com/file/abc",
        }),
      ),
    ).toBe("Open in Figma");
  });

  it("falls back to Open link for long generic domains", () => {
    expect(
      fileLinkOpenLabel(
        linkFile({
          provider: "web",
          domain: "some-really-long-custom-domain.example.com",
          url: "https://some-really-long-custom-domain.example.com/path",
        }),
      ),
    ).toBe("Open link");
  });
});
