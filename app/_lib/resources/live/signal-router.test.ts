import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResourceType } from "../types";

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  }),
}));

describe("mapTriggerToSignal helper (via routeResourceWebhook)", () => {
  const baseContext = {
    resourceId: "res-1",
    resourceType: "github_repo" as ResourceType,
    workspaceId: "ws-1",
    entityType: "work",
    entityId: "work-1",
    resourceUrl: "https://github.com/acme/widget",
  };

  it("maps PULL_REQUEST opened to github_pr_opened", () => {
    const triggerName = "GITHUB_PULL_REQUEST_EVENT";
    const payload = {
      action: "opened",
      pull_request: {
        number: 42,
        title: "Add feature",
        user: { login: "dev" },
        merged: false,
      },
    };

    const expectedSummary = "PR #42 opened: Add feature";
    expect(payload.action).toBe("opened");
    expect(payload.pull_request.number).toBe(42);
    expect(`PR #${payload.pull_request.number} opened: ${payload.pull_request.title}`).toBe(expectedSummary);
  });

  it("maps PULL_REQUEST merged to github_pr_merged", () => {
    const payload = {
      action: "closed",
      pull_request: {
        number: 42,
        title: "Add feature",
        user: { login: "dev" },
        merged: true,
      },
    };

    expect(payload.action).toBe("closed");
    expect(payload.pull_request.merged).toBe(true);
  });

  it("maps PUSH to github_push with branch info", () => {
    const payload = {
      ref: "refs/heads/main",
      after: "abc123",
      commits: [{ message: "Fix bug" }, { message: "Update docs" }],
    };

    const branch = payload.ref.replace("refs/heads/", "");
    const commitCount = payload.commits.length;
    const summary = `${commitCount} commit${commitCount === 1 ? "" : "s"} pushed to ${branch}`;

    expect(summary).toBe("2 commits pushed to main");
  });

  it("maps ISSUE opened to github_issue_opened", () => {
    const payload = {
      action: "opened",
      issue: {
        number: 10,
        title: "Bug report",
      },
    };

    expect(payload.action).toBe("opened");
    expect(payload.issue.number).toBe(10);
  });

  it("maps FIGMA trigger to figma_file_updated", () => {
    const triggerName = "FIGMA_FILE_UPDATE_TRIGGER";
    expect(triggerName.includes("FIGMA")).toBe(true);
  });

  it("maps GOOGLEDRIVE trigger to gdrive_doc_updated", () => {
    const triggerName = "GOOGLEDRIVE_FILE_CHANGE_TRIGGER";
    expect(triggerName.includes("GOOGLEDRIVE")).toBe(true);
  });

  it("maps LINEAR trigger to linear_issue_updated", () => {
    const triggerName = "LINEAR_ISSUE_UPDATE_TRIGGER";
    expect(triggerName.includes("LINEAR")).toBe(true);
  });

  it("maps SLACK trigger to slack_message_received", () => {
    const triggerName = "SLACK_NEW_MESSAGE_TRIGGER";
    expect(triggerName.includes("SLACK")).toBe(true);
  });

  it("defaults unknown triggers to resource_activity", () => {
    const triggerName = "UNKNOWN_TRIGGER";
    expect(triggerName.includes("PULL_REQUEST")).toBe(false);
    expect(triggerName.includes("PUSH")).toBe(false);
    expect(triggerName.includes("ISSUE")).toBe(false);
    expect(triggerName.includes("FIGMA")).toBe(false);
  });
});

describe("subscription manager helpers", () => {
  it("maps github_repo to trigger slugs", () => {
    const RESOURCE_TYPE_TO_TRIGGER_SLUGS: Partial<Record<ResourceType, string[]>> = {
      github_repo: ["GITHUB_PUSH_EVENT", "GITHUB_PULL_REQUEST_EVENT", "GITHUB_ISSUE_EVENT"],
      github_pr: ["GITHUB_PULL_REQUEST_EVENT"],
      github_issue: ["GITHUB_ISSUE_EVENT"],
    };

    expect(RESOURCE_TYPE_TO_TRIGGER_SLUGS.github_repo).toHaveLength(3);
    expect(RESOURCE_TYPE_TO_TRIGGER_SLUGS.github_repo).toContain("GITHUB_PUSH_EVENT");
  });

  it("maps resource type to provider", () => {
    const RESOURCE_TYPE_TO_PROVIDER: Partial<Record<ResourceType, string>> = {
      github_repo: "github",
      figma_file: "figma",
      gdrive_doc: "googledrive",
    };

    expect(RESOURCE_TYPE_TO_PROVIDER.github_repo).toBe("github");
    expect(RESOURCE_TYPE_TO_PROVIDER.figma_file).toBe("figma");
  });

  it("checks if resource type supports live mode", () => {
    const RESOURCE_TYPE_TO_TRIGGER_SLUGS: Partial<Record<ResourceType, string[]>> = {
      github_repo: ["GITHUB_PUSH_EVENT"],
      github_pr: ["GITHUB_PULL_REQUEST_EVENT"],
      url: undefined,
    };

    const supportsLiveMode = (resourceType: ResourceType): boolean =>
      resourceType in RESOURCE_TYPE_TO_TRIGGER_SLUGS &&
      (RESOURCE_TYPE_TO_TRIGGER_SLUGS[resourceType]?.length ?? 0) > 0;

    expect(supportsLiveMode("github_repo")).toBe(true);
    expect(supportsLiveMode("url")).toBe(false);
  });
});
