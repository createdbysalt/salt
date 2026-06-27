import { describe, it, expect } from "vitest";
import { checkForDuplicate, findMergeCandidates, type ExistingTag } from "./dedupe";

const EXISTING_TAGS: ExistingTag[] = [
  { id: "1", slug: "vip", label: "VIP", isArchived: false },
  { id: "2", slug: "startup", label: "Startup", isArchived: false },
  { id: "3", slug: "enterprise", label: "Enterprise", isArchived: false },
  { id: "4", slug: "agency", label: "Agency", isArchived: true },
  { id: "5", slug: "at-risk", label: "At Risk", isArchived: false },
];

describe("checkForDuplicate", () => {
  it("detects exact match", () => {
    const result = checkForDuplicate("vip", EXISTING_TAGS);
    expect(result.action).toBe("reuse");
    expect(result.existingTag?.id).toBe("1");
  });

  it("detects exact match on archived tag", () => {
    const result = checkForDuplicate("agency", EXISTING_TAGS);
    expect(result.action).toBe("unarchive");
    expect(result.existingTag?.id).toBe("4");
  });

  it("detects alias match", () => {
    const result = checkForDuplicate("important", EXISTING_TAGS);
    expect(result.action).toBe("reuse");
    expect(result.existingTag?.slug).toBe("vip");
  });

  it("detects fuzzy match", () => {
    const result = checkForDuplicate("start-up", EXISTING_TAGS);
    expect(result.action).toBe("reuse");
    expect(result.existingTag?.slug).toBe("startup");
  });

  it("allows new tag when no match", () => {
    const result = checkForDuplicate("totally-new-tag", EXISTING_TAGS);
    expect(result.action).toBe("create");
    expect(result.existingTag).toBeUndefined();
  });

  it("allows new tag when similarity is below threshold", () => {
    const result = checkForDuplicate("xyz-completely-different", EXISTING_TAGS);
    expect(result.action).toBe("create");
  });
});

describe("findMergeCandidates", () => {
  it("finds similar tags", () => {
    const tags: ExistingTag[] = [
      { id: "1", slug: "client", label: "Client", isArchived: false },
      { id: "2", slug: "clients", label: "Clients", isArchived: false },
      { id: "3", slug: "prospect", label: "Prospect", isArchived: false },
    ];

    const candidates = findMergeCandidates(tags);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].tagA.slug).toBe("client");
    expect(candidates[0].tagB.slug).toBe("clients");
  });

  it("returns empty for dissimilar tags", () => {
    const tags: ExistingTag[] = [
      { id: "1", slug: "alpha", label: "Alpha", isArchived: false },
      { id: "2", slug: "beta", label: "Beta", isArchived: false },
      { id: "3", slug: "gamma", label: "Gamma", isArchived: false },
    ];

    const candidates = findMergeCandidates(tags);
    expect(candidates.length).toBe(0);
  });

  it("sorts by similarity score descending", () => {
    const tags: ExistingTag[] = [
      { id: "1", slug: "startup", label: "Startup", isArchived: false },
      { id: "2", slug: "startups", label: "Startups", isArchived: false },
      { id: "3", slug: "start-up", label: "Start Up", isArchived: false },
    ];

    const candidates = findMergeCandidates(tags);
    expect(candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });
});
