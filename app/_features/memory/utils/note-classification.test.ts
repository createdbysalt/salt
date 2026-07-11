import { describe, it, expect } from "vitest";
import { classifyTags, shouldAutoPin, classifyRoute } from "./note-classification";

describe("classifyTags", () => {
  it("adds meeting tag for meeting source", () => {
    const tags = classifyTags({
      content: "Some meeting notes",
      sourceType: "meeting",
    });
    expect(tags).toContain("meeting");
  });

  it("adds email tag for email source", () => {
    const tags = classifyTags({
      content: "From their email",
      sourceType: "email",
    });
    expect(tags).toContain("email");
  });

  it("detects follow-up keywords", () => {
    expect(classifyTags({ content: "Need to follow up next week" })).toContain("follow-up");
    expect(classifyTags({ content: "Circle back on this" })).toContain("follow-up");
    expect(classifyTags({ content: "Check in with them" })).toContain("follow-up");
  });

  it("detects waiting keywords", () => {
    expect(classifyTags({ content: "Waiting on their approval" })).toContain("waiting");
    expect(classifyTags({ content: "Pending their response" })).toContain("waiting");
    expect(classifyTags({ content: "Ball is in their court" })).toContain("waiting");
  });

  it("detects blocked keywords", () => {
    expect(classifyTags({ content: "Blocked by missing info" })).toContain("blocked");
    expect(classifyTags({ content: "Stuck on the integration" })).toContain("blocked");
    expect(classifyTags({ content: "Can't proceed without sign-off" })).toContain("blocked");
  });

  it("detects budget keywords", () => {
    expect(classifyTags({ content: "Budget is $50,000" })).toContain("budget");
    expect(classifyTags({ content: "Discussed pricing" })).toContain("budget");
    expect(classifyTags({ content: "Rate is $150/hour" })).toContain("budget");
  });

  it("detects timeline keywords", () => {
    expect(classifyTags({ content: "Deadline is Friday" })).toContain("timeline");
    expect(classifyTags({ content: "Due by March 15" })).toContain("timeline");
    expect(classifyTags({ content: "Timeline is tight" })).toContain("timeline");
  });

  it("detects preference keywords", () => {
    expect(classifyTags({ content: "Prefers morning meetings" })).toContain("preference");
    expect(classifyTags({ content: "Likes to get updates via Slack" })).toContain("preference");
    expect(classifyTags({ content: "Always wants detailed briefs" })).toContain("preference");
  });

  it("detects birthday keywords", () => {
    expect(classifyTags({ content: "Birthday on June 15" })).toContain("birthday");
    expect(classifyTags({ content: "Turns 40 next month" })).toContain("birthday");
    expect(classifyTags({ content: "Work anniversary coming up" })).toContain("birthday");
  });

  it("detects family keywords", () => {
    expect(classifyTags({ content: "Has two kids" })).toContain("family");
    expect(classifyTags({ content: "Spouse works at Google" })).toContain("family");
  });

  it("detects intro keywords", () => {
    expect(classifyTags({ content: "Met at the conference" })).toContain("intro");
    expect(classifyTags({ content: "Introduced by Sarah" })).toContain("intro");
    expect(classifyTags({ content: "Referred by a colleague" })).toContain("intro");
  });

  it("applies multiple tags when appropriate", () => {
    const tags = classifyTags({
      content: "Budget discussion from email - deadline is Friday, waiting on approval",
      sourceType: "email",
    });
    expect(tags).toContain("email");
    expect(tags).toContain("budget");
    expect(tags).toContain("timeline");
    expect(tags).toContain("waiting");
  });

  it("returns empty array for unclassifiable content", () => {
    const tags = classifyTags({ content: "Just a simple note" });
    expect(tags).toEqual([]);
  });
});

describe("shouldAutoPin", () => {
  const baseInput = {
    tags: [] as ReturnType<typeof classifyTags>,
    noteKind: "general" as const,
    confidence: 85,
    createdAt: new Date(),
  };

  it("pins blocked notes", () => {
    expect(shouldAutoPin({ ...baseInput, tags: ["blocked"] })).toBe(true);
  });

  it("pins follow-up notes without linked task", () => {
    expect(shouldAutoPin({ ...baseInput, tags: ["follow-up"], hasLinkedTask: false })).toBe(true);
  });

  it("does not pin follow-up notes with linked task", () => {
    expect(shouldAutoPin({ ...baseInput, tags: ["follow-up"], hasLinkedTask: true })).toBe(false);
  });

  it("pins flag kind notes", () => {
    expect(shouldAutoPin({ ...baseInput, noteKind: "flag" })).toBe(true);
  });

  it("does not pin low-confidence notes", () => {
    expect(shouldAutoPin({ ...baseInput, tags: ["blocked"], confidence: 50 })).toBe(false);
  });

  it("does not re-pin user unpinned notes", () => {
    expect(shouldAutoPin({ ...baseInput, tags: ["blocked"], userUnpinned: true })).toBe(false);
  });

  it("pins stale waiting notes (>7 days)", () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    expect(shouldAutoPin({ ...baseInput, tags: ["waiting"], createdAt: oldDate })).toBe(true);
  });

  it("does not pin fresh waiting notes", () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(shouldAutoPin({ ...baseInput, tags: ["waiting"], createdAt: recentDate })).toBe(false);
  });
});

describe("classifyRoute", () => {
  const baseInput = {
    content: "Some note content",
    anchorEntityType: "person" as const,
    anchorEntityId: "person-123",
  };

  it("routes meeting transcripts to meeting entity", () => {
    const result = classifyRoute({
      ...baseInput,
      sourceType: "meeting",
      sourceMeetingId: "meeting-456",
    });
    expect(result.entityType).toBe("meeting");
    expect(result.entityId).toBe("meeting-456");
  });

  it("routes project-specific content to work", () => {
    const result = classifyRoute({
      ...baseInput,
      content: "Project scope expanded to include mobile app",
      sourceWorkId: "work-789",
    });
    expect(result.entityType).toBe("work");
    expect(result.entityId).toBe("work-789");
  });

  it("routes billing content to billing", () => {
    const result = classifyRoute({
      ...baseInput,
      content: "Invoice #123 was paid yesterday",
      sourceBillingId: "billing-111",
    });
    expect(result.entityType).toBe("billing");
    expect(result.entityId).toBe("billing-111");
  });

  it("falls back to anchor entity when no match", () => {
    const result = classifyRoute({
      ...baseInput,
      content: "Just a personal note about them",
    });
    expect(result.entityType).toBe("person");
    expect(result.entityId).toBe("person-123");
  });
});
