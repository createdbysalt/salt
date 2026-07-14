import { describe, expect, it } from "vitest";
import { detectResourceFromUrl, canBeLive, isExternalResource } from "./url-detector";

describe("detectResourceFromUrl", () => {
  describe("GitHub URLs", () => {
    it("detects GitHub repository", () => {
      const result = detectResourceFromUrl("https://github.com/vercel/next.js");
      expect(result).toMatchObject({
        resourceType: "github_repo",
        category: "code",
        resourceId: "vercel/next.js",
        supportsLive: true,
      });
      expect(result?.extractedMetadata).toEqual({ owner: "vercel", repo: "next.js" });
    });

    it("detects GitHub repository with trailing slash", () => {
      const result = detectResourceFromUrl("https://github.com/vercel/next.js/");
      expect(result?.resourceType).toBe("github_repo");
    });

    it("detects GitHub pull request", () => {
      const result = detectResourceFromUrl("https://github.com/vercel/next.js/pull/123");
      expect(result).toMatchObject({
        resourceType: "github_pr",
        category: "code",
        resourceId: "vercel/next.js/pull/123",
      });
      expect(result?.extractedMetadata).toEqual({
        owner: "vercel",
        repo: "next.js",
        prNumber: 123,
      });
    });

    it("detects GitHub issue", () => {
      const result = detectResourceFromUrl("https://github.com/vercel/next.js/issues/456");
      expect(result).toMatchObject({
        resourceType: "github_issue",
        category: "code",
        resourceId: "vercel/next.js/issues/456",
      });
    });

    it("detects GitHub branch", () => {
      const result = detectResourceFromUrl("https://github.com/vercel/next.js/tree/canary");
      expect(result).toMatchObject({
        resourceType: "github_branch",
        category: "code",
      });
      expect(result?.extractedMetadata).toEqual({
        owner: "vercel",
        repo: "next.js",
        branch: "canary",
      });
    });

    it("detects GitHub organization", () => {
      const result = detectResourceFromUrl("https://github.com/vercel");
      expect(result).toMatchObject({
        resourceType: "github_org",
        category: "code",
      });
    });
  });

  describe("Figma URLs", () => {
    it("detects Figma file", () => {
      const result = detectResourceFromUrl("https://figma.com/file/abc123/My-Design");
      expect(result).toMatchObject({
        resourceType: "figma_file",
        category: "design",
        resourceId: "abc123",
        supportsLive: true,
      });
    });

    it("detects Figma design URL", () => {
      const result = detectResourceFromUrl("https://www.figma.com/design/xyz789/Homepage-Redesign");
      expect(result).toMatchObject({
        resourceType: "figma_file",
        category: "design",
      });
      expect(result?.suggestedName).toBe("Homepage Redesign");
    });

    it("detects Figma prototype", () => {
      const result = detectResourceFromUrl("https://figma.com/proto/abc123");
      expect(result).toMatchObject({
        resourceType: "figma_prototype",
        category: "design",
      });
    });
  });

  describe("Linear URLs", () => {
    it("detects Linear issue", () => {
      const result = detectResourceFromUrl("https://linear.app/acme/issue/ACM-123");
      expect(result).toMatchObject({
        resourceType: "linear_issue",
        category: "project_management",
        resourceId: "ACM-123",
        supportsLive: true,
      });
    });

    it("detects Linear project", () => {
      const result = detectResourceFromUrl("https://linear.app/acme/project/my-project");
      expect(result).toMatchObject({
        resourceType: "linear_project",
        category: "project_management",
      });
    });
  });

  describe("Google URLs", () => {
    it("detects Google Doc", () => {
      const result = detectResourceFromUrl(
        "https://docs.google.com/document/d/1ABC123xyz/edit"
      );
      expect(result).toMatchObject({
        resourceType: "gdrive_doc",
        category: "documents",
        supportsLive: true,
      });
    });

    it("detects Google Sheet", () => {
      const result = detectResourceFromUrl(
        "https://docs.google.com/spreadsheets/d/1ABC123xyz/edit"
      );
      expect(result).toMatchObject({
        resourceType: "gdrive_sheet",
        category: "documents",
      });
    });

    it("detects Google Slides", () => {
      const result = detectResourceFromUrl(
        "https://docs.google.com/presentation/d/1ABC123xyz/edit"
      );
      expect(result).toMatchObject({
        resourceType: "gdrive_slide",
        category: "documents",
      });
    });

    it("detects Google Drive folder", () => {
      const result = detectResourceFromUrl(
        "https://drive.google.com/drive/folders/1ABC123xyz"
      );
      expect(result).toMatchObject({
        resourceType: "gdrive_folder",
        category: "documents",
      });
    });
  });

  describe("Notion URLs", () => {
    it("detects Notion page with ID", () => {
      const result = detectResourceFromUrl(
        "https://notion.so/workspace/abc12345678901234567890123456789"
      );
      expect(result).toMatchObject({
        resourceType: "notion_page",
        category: "project_management",
      });
    });
  });

  describe("Slack URLs", () => {
    it("detects Slack channel", () => {
      const result = detectResourceFromUrl("https://acme.slack.com/archives/C01234567");
      expect(result).toMatchObject({
        resourceType: "slack_channel",
        category: "communication",
        supportsLive: true,
      });
    });
  });

  describe("LinkedIn URLs", () => {
    it("detects LinkedIn profile", () => {
      const result = detectResourceFromUrl("https://linkedin.com/in/john-doe");
      expect(result).toMatchObject({
        resourceType: "linkedin_profile",
        category: "social",
        supportsLive: false,
      });
      expect(result?.suggestedName).toBe("john doe");
    });

    it("detects LinkedIn company", () => {
      const result = detectResourceFromUrl("https://www.linkedin.com/company/acme-corp");
      expect(result).toMatchObject({
        resourceType: "linkedin_company",
        category: "social",
      });
    });
  });

  describe("Video URLs", () => {
    it("detects Loom video", () => {
      const result = detectResourceFromUrl("https://loom.com/share/abc123def456");
      expect(result).toMatchObject({
        resourceType: "loom_video",
        category: "media",
      });
    });

    it("detects YouTube video (watch URL)", () => {
      const result = detectResourceFromUrl("https://youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toMatchObject({
        resourceType: "youtube_video",
        category: "media",
      });
    });

    it("detects YouTube video (short URL)", () => {
      const result = detectResourceFromUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result).toMatchObject({
        resourceType: "youtube_video",
        category: "media",
      });
    });
  });

  describe("Scheduling URLs", () => {
    it("detects Calendly link", () => {
      const result = detectResourceFromUrl("https://calendly.com/john-doe/30min");
      expect(result).toMatchObject({
        resourceType: "calendly_link",
        category: "scheduling",
      });
    });

    it("detects Cal.com link", () => {
      const result = detectResourceFromUrl("https://cal.com/jane-doe");
      expect(result).toMatchObject({
        resourceType: "calcom_link",
        category: "scheduling",
      });
    });
  });

  describe("Generic URLs", () => {
    it("detects generic website", () => {
      const result = detectResourceFromUrl("https://example.com/some/page");
      expect(result).toMatchObject({
        resourceType: "website",
        category: "generic",
        supportsLive: false,
      });
      expect(result?.suggestedName).toBe("example.com");
    });

    it("returns null for empty string", () => {
      expect(detectResourceFromUrl("")).toBeNull();
    });

    it("returns null for invalid URL", () => {
      expect(detectResourceFromUrl("not a url")).toBeNull();
    });
  });
});

describe("canBeLive", () => {
  it("returns true for live-eligible types", () => {
    expect(canBeLive("github_repo")).toBe(true);
    expect(canBeLive("figma_file")).toBe(true);
    expect(canBeLive("linear_issue")).toBe(true);
    expect(canBeLive("slack_channel")).toBe(true);
  });

  it("returns false for static-only types", () => {
    expect(canBeLive("file")).toBe(false);
    expect(canBeLive("linkedin_profile")).toBe(false);
    expect(canBeLive("website")).toBe(false);
    expect(canBeLive("calendly_link")).toBe(false);
  });
});

describe("isExternalResource", () => {
  it("returns false for file type", () => {
    expect(isExternalResource("file")).toBe(false);
  });

  it("returns true for external types", () => {
    expect(isExternalResource("github_repo")).toBe(true);
    expect(isExternalResource("figma_file")).toBe(true);
    expect(isExternalResource("website")).toBe(true);
  });
});
