import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_features/memory/records", () => ({ resolvePerson: vi.fn() }));

import { extractSignalsGeneric } from "./generic-signal-extractor";
import type { CaptureEnvelope } from "../adapters/types";

const ENVELOPE: CaptureEnvelope = {
  sourceType: "slack",
  captureType: "message",
  externalId: "msg-1",
  title: "Project update",
  occurredAt: "2026-07-01T12:00:00.000Z",
  participants: [
    { email: "ada@northwind.com", name: "Ada Lovelace", role: "from" },
    { email: "you@usesalt.io", name: "You", role: "to" },
  ],
  threadId: null,
  extracted: { text: "Can we review the homepage tomorrow?" },
  raw: { id: "msg-1" },
  noise: null,
};

const CTX = { userEmail: "you@usesalt.io" };

describe("extractSignalsGeneric", () => {
  it("keeps only registry keys with correct types", async () => {
    const llm = vi.fn().mockResolvedValue(
      JSON.stringify({
        contacts: [
          {
            email: "ada@northwind.com",
            signals: {
              is_bidirectional_thread: true,
              email_count: 3.7,
              last_email_date: "2026-07-01T12:00:00Z",
              made_up_signal: true,
              has_calendar_meeting: "yes",
            },
          },
        ],
      }),
    );

    const result = await extractSignalsGeneric([ENVELOPE], CTX, llm);
    expect(result.get("ada@northwind.com")).toEqual({
      is_bidirectional_thread: true,
      email_count: 3,
      last_email_date: "2026-07-01T12:00:00.000Z",
    });
  });

  it("drops hallucinated contacts not present in the envelopes", async () => {
    const llm = vi.fn().mockResolvedValue(
      JSON.stringify({
        contacts: [
          { email: "ghost@example.com", signals: { you_initiated: true } },
          { email: "you@usesalt.io", signals: { you_initiated: true } },
        ],
      }),
    );

    const result = await extractSignalsGeneric([ENVELOPE], CTX, llm);
    expect(result.size).toBe(0);
  });

  it("fails closed on unparseable output", async () => {
    const llm = vi.fn().mockResolvedValue("I think Ada is probably a client!");
    const result = await extractSignalsGeneric([ENVELOPE], CTX, llm);
    expect(result.size).toBe(0);
  });

  it("skips the LLM entirely when no contacts are observable", async () => {
    const llm = vi.fn();
    const result = await extractSignalsGeneric(
      [{ ...ENVELOPE, participants: [{ email: "you@usesalt.io", name: "You", role: "to" }] }],
      CTX,
      llm,
    );
    expect(result.size).toBe(0);
    expect(llm).not.toHaveBeenCalled();
  });
});
