import { describe, it, expect } from "vitest";
import { buildLearningStory, formatFieldLabel } from "./learning-story";
import type {
  GroupedLearningEvidence,
  LearningField,
} from "../queries/learning-evidence";

function makeField(overrides: Partial<LearningField> = {}): LearningField {
  return {
    fieldPath: "relationship_type",
    proposedValue: "client",
    confidence: 95,
    sourceCount: 2,
    sources: ["email", "stripe"],
    latestAt: "2026-08-06T12:00:00Z",
    evidenceIds: ["e1"],
    items: [],
    topReason: null,
    metaCandidate: null,
    ...overrides,
  };
}

function makeEvidence(
  fields: LearningField[],
  overrides: Partial<GroupedLearningEvidence> = {},
): GroupedLearningEvidence {
  return {
    entityType: "person",
    entityId: "p1",
    entityLabel: "Jane Example",
    entityHref: "/people/p1",
    fields,
    totalConfidence: Math.max(...fields.map((f) => f.confidence)),
    latestAt: "2026-08-06T12:00:00Z",
    ...overrides,
  };
}

describe("buildLearningStory", () => {
  it("turns a relationship_type suggestion into a human sentence", () => {
    const story = buildLearningStory(makeEvidence([makeField()]));
    expect(story.kind).toBe("fields");
    expect(story.primarySentence).toBe("I think Lisa is a client.");
    expect(story.acceptLabel).toBe("That's right");
    expect(story.dismissLabel).toBe("Not this");
  });

  it("uses 'an' before vowel sounds", () => {
    const story = buildLearningStory(
      makeEvidence([makeField({ fieldPath: "role", proposedValue: "advisor" })]),
    );
    expect(story.primarySentence).toBe("I think Lisa is an advisor.");
  });

  it("turns company into a works-at sentence", () => {
    const story = buildLearningStory(
      makeEvidence([makeField({ fieldPath: "company", proposedValue: "Acme Co" })]),
    );
    expect(story.primarySentence).toBe("I think Lisa works at Acme Co.");
  });

  it("turns location into a based-in sentence", () => {
    const story = buildLearningStory(
      makeEvidence([makeField({ fieldPath: "location", proposedValue: "Austin, TX" })]),
    );
    expect(story.primarySentence).toBe("I think Lisa is based in Austin, TX.");
  });

  it("falls back to a possessive sentence for unknown fields", () => {
    const story = buildLearningStory(
      makeEvidence([makeField({ fieldPath: "department", proposedValue: "Design" })]),
    );
    expect(story.primarySentence).toBe("I think Lisa's department is Design.");
  });

  it("never leaks raw JSON into a sentence", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({
          fieldPath: "preferences",
          proposedValue: '{"channel":"email"}',
        }),
      ]),
    );
    expect(story.primarySentence).not.toContain("{");
    expect(story.primarySentence).toBe("I have a suggestion about Lisa's preferences.");
  });

  it("uses the full label for organizations", () => {
    const story = buildLearningStory(
      makeEvidence([makeField()], {
        entityType: "organization",
        entityLabel: "Acme Co",
        entityHref: "/orgs/o1",
      }),
    );
    expect(story.primarySentence).toBe("I think Acme Co is a client.");
  });

  it("speaks in second person for the me record", () => {
    const story = buildLearningStory(
      makeEvidence(
        [makeField({ fieldPath: "pricing_model", proposedValue: "retainer" })],
        { entityType: "me", entityLabel: "Your Profile", entityHref: "/me" },
      ),
    );
    expect(story.primarySentence).toBe("I think your pricing model is retainer.");
  });

  it("softens unknown people to 'this person'", () => {
    const story = buildLearningStory(
      makeEvidence([makeField()], { entityLabel: "Unknown Person" }),
    );
    expect(story.primarySentence).toBe("I think this person is a client.");
  });

  it("renders merge candidates as a same-person sentence with merge actions", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({
          fieldPath: "_merge_candidate",
          proposedValue: '{"targetId":"p2","targetName":"Lisa T.","signal":"same_email"}',
          metaCandidate: { kind: "merge", targetId: "p2", targetName: "Lisa T." },
        }),
      ]),
    );
    expect(story.kind).toBe("merge");
    expect(story.primarySentence).toBe(
      "I think Jane Example and Lisa T. might be the same person.",
    );
    expect(story.mergeTargetName).toBe("Lisa T.");
    expect(story.acceptLabel).toBe("Merge them");
    expect(story.dismissLabel).toBe("Keep both");
  });

  it("renders archive candidates as inactivity copy", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({
          fieldPath: "_archive_candidate",
          proposedValue: '{"reason":"stale","daysSinceActivity":210}',
          metaCandidate: { kind: "archive" },
          topReason: "No activity in 210 days",
        }),
      ]),
    );
    expect(story.kind).toBe("archive");
    expect(story.primarySentence).toBe(
      "I haven't seen any activity around Jane Example in a while.",
    );
    expect(story.acceptLabel).toBe("Archive");
    expect(story.dismissLabel).toBe("Keep");
    expect(story.reason).toBe("No activity in 210 days");
  });

  it("renders link candidates as connection copy", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({
          fieldPath: "_link_candidate",
          proposedValue: '{"reason":"orphan","suggestedAction":"connect_org"}',
          metaCandidate: { kind: "link" },
        }),
      ]),
    );
    expect(story.kind).toBe("link");
    expect(story.primarySentence).toBe(
      "I couldn't connect Jane Example to an organization yet.",
    );
  });

  it("picks the reason from the highest-confidence field that has one", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({ confidence: 97, topReason: null }),
        makeField({
          fieldPath: "company",
          proposedValue: "Acme Co",
          confidence: 88,
          topReason: "3 paid invoices this month",
        }),
      ]),
    );
    expect(story.reason).toBe("3 paid invoices this month");
  });

  it("shows at most two secondary sentences and counts the rest", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({ confidence: 95 }),
        makeField({ fieldPath: "company", proposedValue: "Acme Co", confidence: 90 }),
        makeField({ fieldPath: "role", proposedValue: "CEO", confidence: 85 }),
        makeField({ fieldPath: "location", proposedValue: "Austin, TX", confidence: 80 }),
      ]),
    );
    expect(story.primarySentence).toBe("I think Lisa is a client.");
    expect(story.secondarySentences).toEqual([
      "I think Lisa works at Acme Co.",
      "I think Lisa is a CEO.",
    ]);
    expect(story.hiddenCount).toBe(1);
  });

  it("summarizes sources in plain language", () => {
    const story = buildLearningStory(
      makeEvidence([
        makeField({ sourceCount: 3, sources: ["email", "calendar"] }),
        makeField({
          fieldPath: "company",
          proposedValue: "Acme Co",
          sourceCount: 2,
          sources: ["stripe", "email"],
        }),
      ]),
    );
    expect(story.sourceSummary).toBe(
      "Based on 5 things I saw across Email, Calendar, and Stripe.",
    );
  });

  it("uses singular wording for a single signal", () => {
    const story = buildLearningStory(
      makeEvidence([makeField({ sourceCount: 1, sources: ["email"] })]),
    );
    expect(story.sourceSummary).toBe("Based on something I saw in Email.");
  });
});

describe("formatFieldLabel", () => {
  it("maps known fields to friendly labels", () => {
    expect(formatFieldLabel("relationship_type")).toBe("Relationship");
  });

  it("humanizes unknown snake_case fields", () => {
    expect(formatFieldLabel("preferred_channel")).toBe("Preferred Channel");
  });
});
