import { describe, it, expect } from "vitest";
import { createMessagingCategoryAdapter, getMessagingAdapter } from "./communication";
import { runAdapterConformance } from "../adapter-conformance";
import {
  SLACK_TRIGGER_CHANNEL_MESSAGE,
  SLACK_TRIGGER_THREADED_REPLY,
  SLACK_TRIGGER_DIRECT_MESSAGE,
  SLACK_TRIGGER_BOT_MESSAGE,
  SLACK_MALFORMED,
} from "../__fixtures__/slack-payloads";

describe("messaging category adapter", () => {
  describe("getMessagingAdapter", () => {
    it("returns adapter for slack", () => {
      const adapter = getMessagingAdapter("slack");
      expect(adapter.sourceType).toBe("slack");
    });
  });

  describe("slack trigger payloads (user is a string member ID)", () => {
    const adapter = createMessagingCategoryAdapter("slack");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "channel message",
          payload: SLACK_TRIGGER_CHANNEL_MESSAGE,
          expectExternalId: "C0123456789:1754407800.000200",
        },
        {
          name: "threaded reply",
          payload: SLACK_TRIGGER_THREADED_REPLY,
          expectExternalId: "C0123456789:1754409000.000350",
        },
        {
          name: "direct message",
          payload: SLACK_TRIGGER_DIRECT_MESSAGE,
          expectExternalId: "D0987654321:1754410500.000101",
        },
        { name: "bot message", payload: SLACK_TRIGGER_BOT_MESSAGE, expectExternalId: null },
        { name: "missing ts", payload: SLACK_MALFORMED, expectExternalId: null },
      ]);
    });

    it("preserves the sender member ID without inventing participants", () => {
      const envelope = adapter.normalize(SLACK_TRIGGER_CHANNEL_MESSAGE);
      expect(envelope?.participants).toHaveLength(0);
      expect(envelope?.extracted.sender_id).toBe("U0AB12CD3");
      expect(envelope?.extracted.channel_type).toBe("channel");
      expect(envelope?.extracted.team_id).toBe("T0XY98ZW7");
    });

    it("derives occurredAt from the ts epoch", () => {
      const envelope = adapter.normalize(SLACK_TRIGGER_CHANNEL_MESSAGE);
      expect(envelope?.occurredAt).toBe(
        new Date(1754407800.0002 * 1000).toISOString(),
      );
    });

    it("groups threaded replies by thread_ts", () => {
      const envelope = adapter.normalize(SLACK_TRIGGER_THREADED_REPLY);
      expect(envelope?.threadId).toBe("1754407800.000200");
    });

    it("still accepts enriched payloads where user is an object with email", () => {
      const envelope = adapter.normalize({
        channel: "C0123456789",
        ts: "1754407800.000200",
        text: "hello",
        user: { id: "U0AB12CD3", email: "Ada@northwind.com", real_name: "Ada" },
      });
      expect(envelope?.participants[0]?.email).toBe("ada@northwind.com");
      expect(envelope?.extracted.sender_email).toBe("ada@northwind.com");
    });
  });

  describe("generic messaging extraction", () => {
    const adapter = createMessagingCategoryAdapter("discord");

    it("unwraps one level of nesting and provides noise input", () => {
      const envelope = adapter.normalize({
        message: { id: "m-1", content: "hey there" },
      });
      expect(envelope?.externalId).toBe("m-1");
      expect(envelope?.title).toBe("hey there");
      expect(envelope?.noise).not.toBeNull();
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });
});
