import { describe, expect, it } from "vitest";
import { projectRecordingUrl } from "./recording-projection";

/**
 * meetings transcript recording_url becomes a projection of attached
 * Resources (Phase 7): the column wins while it exists (read-compat), and
 * recording-type artifact Resources fill the gap when it doesn't.
 */
describe("projectRecordingUrl", () => {
  it("prefers the transcript column when set (read-compat)", () => {
    expect(
      projectRecordingUrl("https://cdn.example.com/rec.mp4", [
        { externalUrl: "https://app.fireflies.ai/view/x::1", resourceType: "fireflies_transcript" },
      ]),
    ).toBe("https://cdn.example.com/rec.mp4");
  });

  it("projects a fireflies/otter artifact when the column is empty", () => {
    expect(
      projectRecordingUrl(null, [
        { externalUrl: "https://docs.google.com/document/d/abc/edit", resourceType: "gdrive_doc" },
        { externalUrl: "https://otter.ai/u/abc123", resourceType: "otter_transcript" },
      ]),
    ).toBe("https://otter.ai/u/abc123");
  });

  it("ignores non-recording artifacts", () => {
    expect(
      projectRecordingUrl(null, [
        { externalUrl: "https://docs.google.com/document/d/abc/edit", resourceType: "gdrive_doc" },
      ]),
    ).toBeUndefined();
  });

  it("returns undefined when there is nothing to project", () => {
    expect(projectRecordingUrl(null, [])).toBeUndefined();
    expect(projectRecordingUrl(undefined, undefined)).toBeUndefined();
  });

  it("skips artifacts without a URL", () => {
    expect(
      projectRecordingUrl(null, [
        { externalUrl: null, resourceType: "fireflies_transcript" },
        { externalUrl: "https://app.fireflies.ai/view/y::2", resourceType: "fireflies_transcript" },
      ]),
    ).toBe("https://app.fireflies.ai/view/y::2");
  });
});
