import { describe, expect, it } from "vitest";
import type { CaptureEnvelope } from "./types";
import { ruleMatchCandidatesForEnvelope } from "./rule-match-candidates";

/**
 * Rule match candidates (S5 vocabulary expansion): the per-capture strings
 * the new entity types match against — subjects, titles, keywords, file
 * names, attendee/participant emails. Extracted once from the normalized
 * envelope, so every category adapter participates without new code.
 */

function envelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "x-1",
    title: null,
    occurredAt: null,
    participants: [],
    threadId: null,
    extracted: {},
    raw: {},
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

describe("ruleMatchCandidatesForEnvelope", () => {
  it("email: subject_pattern candidate comes from extracted.subject", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({ extracted: { subject: "Invoice #42 attached" } }),
    );
    expect(candidates.subject_pattern).toEqual(["Invoice #42 attached"]);
  });

  it("calendar: title_pattern candidate prefers extracted title/summary", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({
        sourceType: "googlecalendar",
        captureType: "meeting",
        title: "Lunch with Sam",
        extracted: { summary: "Lunch with Sam" },
      }),
    );
    expect(candidates.title_pattern).toEqual(["Lunch with Sam"]);
  });

  it("messaging: keyword candidate comes from extracted.text", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({
        sourceType: "slack",
        extracted: { text: "please unsubscribe me" },
      }),
    );
    expect(candidates.keyword).toEqual(["please unsubscribe me"]);
  });

  it("storage: name_pattern candidate comes from extracted.file_name", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({
        sourceType: "googledrive",
        captureType: "file",
        extracted: { file_name: "Brand Template v2.psd" },
      }),
    );
    expect(candidates.name_pattern).toEqual(["Brand Template v2.psd"]);
  });

  it("attendee + participant candidates are the capture's people emails, lowercased", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({
        sourceType: "googlecalendar",
        captureType: "meeting",
        participants: [
          { email: "Bob@Acme.com", name: "Bob", role: "attendee" },
          { email: "sam@acme.com", name: "Sam", role: "organizer" },
          { email: null, name: "No Email", role: "attendee" },
        ],
      }),
    );
    expect(candidates.attendee).toEqual(["bob@acme.com", "sam@acme.com"]);
    expect(candidates.participant).toEqual(["bob@acme.com", "sam@acme.com"]);
  });

  it("meetings: extracted.participants emails join the people candidates", () => {
    const candidates = ruleMatchCandidatesForEnvelope(
      envelope({
        sourceType: "fireflies",
        captureType: "meeting",
        extracted: { participants: ["Carol@X.com", "Dan"] },
      }),
    );
    expect(candidates.participant).toEqual(["carol@x.com"]);
  });

  it("omits candidates the envelope does not carry", () => {
    const candidates = ruleMatchCandidatesForEnvelope(envelope());
    expect(candidates).toEqual({});
  });
});
