import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../../../adapters/types";

const threadsUpserted: Array<Record<string, unknown>> = [];
const threadsUpdated: Array<Record<string, unknown>> = [];
const messagesInserted: Array<Record<string, unknown>> = [];

const dbControl: {
  threadRow: { id: string; person_id: string | null } | null;
  threadError: { message: string } | null;
  messageError: { code?: string; message: string } | null;
} = {
  threadRow: { id: "thread-1", person_id: null },
  threadError: null,
  messageError: null,
};

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({}) }),
}));

const findPersonIdsMock = vi.fn(async (..._args: unknown[]): Promise<string[]> => []);
vi.mock("@/app/_features/memory/records/person-emails", () => ({
  findPersonIdsByEmail: (...args: unknown[]) => findPersonIdsMock(...args),
}));

import {
  MESSAGE_BODY_CAP,
  persistMessageStage,
  resolveThreadsForBornPerson,
} from "./message-store";

/** Minimal admin-client stub shaped to the stage's query chains. */
function makeAdmin() {
  return {
    from: (table: string) => {
      if (table === "conversation_threads") {
        return {
          upsert: (row: Record<string, unknown>) => {
            threadsUpserted.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: dbControl.threadRow,
                  error: dbControl.threadError,
                }),
              }),
            };
          },
          update: (row: Record<string, unknown>) => {
            threadsUpdated.push(row);
            return {
              eq: () => ({
                is: () => ({
                  eq: async () => ({ error: null }),
                }),
              }),
              is: () => ({
                eq: async () => ({ error: null }),
              }),
            };
          },
        };
      }
      if (table === "conversation_messages") {
        return {
          insert: async (row: Record<string, unknown>) => {
            messagesInserted.push(row);
            return { error: dbControl.messageError };
          },
          select: () => ({
            eq: async () => ({ count: messagesInserted.length }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as never;
}

function envelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "msg-1",
    title: "Pricing question",
    occurredAt: "2026-09-10T10:00:00Z",
    participants: [
      { email: "client@acme.com", name: "Client Person", role: "from" },
      { email: "me@myco.com", name: "Me", role: "to" },
    ],
    threadId: "gmail-thread-9",
    extracted: {
      sender_email: "client@acme.com",
      snippet: "What would this cost?",
      isSentByUser: false,
    },
    raw: {},
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

beforeEach(() => {
  threadsUpserted.length = 0;
  threadsUpdated.length = 0;
  messagesInserted.length = 0;
  dbControl.threadRow = { id: "thread-1", person_id: null };
  dbControl.threadError = null;
  dbControl.messageError = null;
  findPersonIdsMock.mockReset();
  findPersonIdsMock.mockResolvedValue([]);
});

describe("persistMessageStage", () => {
  it("stores a threaded message with the transient body for inbound mail", async () => {
    const env = envelope({ bodyText: "  Full body here.  " });

    const result = await persistMessageStage(
      makeAdmin(),
      "ws-1",
      "cap-1",
      env,
      "me@myco.com",
    );

    expect(result.stored).toBe(true);
    expect(result.threadId).toBe("thread-1");

    expect(threadsUpserted).toHaveLength(1);
    const thread = threadsUpserted[0];
    expect(thread.workspace_id).toBe("ws-1");
    expect(thread.provider).toBe("gmail");
    expect(thread.channel).toBe("email");
    expect(thread.external_thread_id).toBe("gmail-thread-9");
    expect(thread.counterparty_email).toBe("client@acme.com");

    expect(messagesInserted).toHaveLength(1);
    const message = messagesInserted[0];
    expect(message.thread_id).toBe("thread-1");
    expect(message.capture_event_id).toBe("cap-1");
    expect(message.direction).toBe("in");
    expect(message.author_email).toBe("client@acme.com");
    expect(message.body_text).toBe("Full body here.");
    expect(typeof message.body_expires_at).toBe("string");
  });

  it("falls back to the snippet when no transient body rides the envelope", async () => {
    const result = await persistMessageStage(
      makeAdmin(),
      "ws-1",
      "cap-1",
      envelope(),
      "me@myco.com",
    );

    expect(result.stored).toBe(true);
    expect(messagesInserted[0].body_text).toBe("What would this cost?");
  });

  it("caps bodies at MESSAGE_BODY_CAP", async () => {
    const env = envelope({ bodyText: "x".repeat(MESSAGE_BODY_CAP + 500) });

    await persistMessageStage(makeAdmin(), "ws-1", "cap-1", env, "me@myco.com");

    expect((messagesInserted[0].body_text as string).length).toBe(MESSAGE_BODY_CAP);
  });

  it("resolves the counterparty from recipients for outbound mail", async () => {
    const env = envelope({
      participants: [
        { email: "me@myco.com", name: "Me", role: "from" },
        { email: "client@acme.com", name: "Client Person", role: "to" },
      ],
      extracted: { isSentByUser: true, to: ["client@acme.com"] },
    });

    const result = await persistMessageStage(
      makeAdmin(),
      "ws-1",
      "cap-1",
      env,
      "me@myco.com",
    );

    expect(result.stored).toBe(true);
    expect(threadsUpserted[0].counterparty_email).toBe("client@acme.com");
    expect(messagesInserted[0].direction).toBe("out");
    expect(messagesInserted[0].author_email).toBe("me@myco.com");
  });

  it("links the thread to a known person and backfills person-null threads", async () => {
    findPersonIdsMock.mockResolvedValue(["person-7"]);

    await persistMessageStage(makeAdmin(), "ws-1", "cap-1", envelope(), "me@myco.com");

    expect(threadsUpserted[0].person_id).toBe("person-7");
    // Existing thread row had no person — the stage links it.
    expect(threadsUpdated.some((r) => r.person_id === "person-7")).toBe(true);
  });

  it("falls back to a per-counterparty thread id when the provider gives none", async () => {
    const env = envelope({ threadId: null });

    await persistMessageStage(makeAdmin(), "ws-1", "cap-1", env, "me@myco.com");

    expect(threadsUpserted[0].external_thread_id).toBe("email:client@acme.com");
  });

  it("treats duplicate delivery as an idempotent no-op", async () => {
    dbControl.messageError = { code: "23505", message: "duplicate key" };

    const result = await persistMessageStage(
      makeAdmin(),
      "ws-1",
      "cap-1",
      envelope(),
      "me@myco.com",
    );

    expect(result.stored).toBe(false);
    expect(result.reason).toBe("duplicate");
  });

  it("skips non-message captures", async () => {
    const env = envelope({ captureType: "file" });

    const result = await persistMessageStage(
      makeAdmin(),
      "ws-1",
      "cap-1",
      env,
      "me@myco.com",
    );

    expect(result.stored).toBe(false);
    expect(result.reason).toBe("not_a_message");
    expect(messagesInserted).toHaveLength(0);
  });
});

describe("resolveThreadsForBornPerson", () => {
  it("links person-null threads matching the new person's email", async () => {
    await resolveThreadsForBornPerson(
      makeAdmin(),
      "ws-1",
      "person-7",
      "Client@Acme.com",
    );

    expect(threadsUpdated).toHaveLength(1);
    expect(threadsUpdated[0].person_id).toBe("person-7");
  });

  it("no-ops without an email", async () => {
    await resolveThreadsForBornPerson(makeAdmin(), "ws-1", "person-7", null);
    expect(threadsUpdated).toHaveLength(0);
  });
});
