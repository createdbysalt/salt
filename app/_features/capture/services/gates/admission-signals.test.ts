import { describe, expect, it } from "vitest";
import { extractAdmissionSignals } from "./admission-signals";

describe("extractAdmissionSignals", () => {
  it("reads the category-adapter shape (isSentByUser / is_reply)", () => {
    const signals = extractAdmissionSignals({
      thread_id: "conv-1",
      isSentByUser: true,
      is_reply: true,
    });

    expect(signals.threadId).toBe("conv-1");
    expect(signals.youInitiated).toBe(true);
    expect(signals.isReply).toBe(true);
  });

  it("still reads the legacy shape (you_initiated / in_reply_to)", () => {
    const signals = extractAdmissionSignals({
      thread_id: "t-2",
      you_initiated: true,
      in_reply_to: "<msg-id@mail>",
    });

    expect(signals.youInitiated).toBe(true);
    expect(signals.isReply).toBe(true);
  });

  it("returns falsy signals for inbound first-touch mail", () => {
    const signals = extractAdmissionSignals({
      thread_id: "conv-3",
      isSentByUser: false,
      is_reply: false,
    });

    expect(signals.youInitiated).toBe(false);
    expect(signals.isReply).toBe(false);
  });

  it("handles null/empty extracted data", () => {
    expect(extractAdmissionSignals(null)).toEqual({
      threadId: null,
      youInitiated: false,
      isReply: false,
    });
    expect(extractAdmissionSignals({})).toEqual({
      threadId: null,
      youInitiated: false,
      isReply: false,
    });
  });

  it("ignores non-boolean/non-string junk values", () => {
    const signals = extractAdmissionSignals({
      thread_id: 42,
      isSentByUser: "yes",
      in_reply_to: 7,
    });

    expect(signals.threadId).toBeNull();
    expect(signals.youInitiated).toBe(false);
    expect(signals.isReply).toBe(false);
  });
});
