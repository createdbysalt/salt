import { describe, expect, it } from "vitest";
import { slugifyProjectName } from "./project-fields";

describe("slugifyProjectName", () => {
  it("creates a url-safe slug from a project name", () => {
    expect(slugifyProjectName("Photon Website")).toBe("photon-website");
  });

  it("falls back when the name has no slug characters", () => {
    expect(slugifyProjectName("---")).toBe("work");
  });
});
