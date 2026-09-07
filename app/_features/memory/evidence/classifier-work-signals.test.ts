import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Work-birth signals (audit: "work" candidates).
 *
 * - `meeting_title_project_pattern` requires a substantive project title
 *   (generic ceremony titles like standups/syncs never emit) AND an
 *   external participant (a non-operator attendee or organizer).
 * - `email_subject_project_pattern` and `thread_discusses_scope` emit from
 *   the email classifier, anchored to known contacts — a stranger's
 *   "project" subject is cold outreach, not the operator's work.
 */

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => {
  const state = { tables: {} as Record<string, unknown[]> };
  return { state };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "not", "in", "is"]) {
        builder[method] = () => builder;
      }
      builder.then = (
        resolve: (value: { data: unknown[]; error: null }) => void,
      ) => resolve({ data: h.state.tables[table] ?? [], error: null });
      return builder;
    },
  }),
}));

import { classifyEmailCapture, classifyMeetingCapture } from "./classifier";
import type {
  DetectedSignal,
  EmailCaptureData,
  MeetingCaptureData,
} from "./classifier";

const OPERATOR_TABLES = {
  workspace_members: [{ email: "me@studio.com", user_id: null }],
  workspaces: [],
  profiles: [],
};

const KNOWN_CLIENT_TABLES = {
  ...OPERATOR_TABLES,
  people: [{ email: "client@acme.com" }],
  organizations: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  h.state.tables = {};
});

function workSignals(signals: DetectedSignal[]) {
  return signals.filter((s) => s.entityType === "work");
}

describe("classifyMeetingCapture — meeting_title_project_pattern", () => {
  const standup: MeetingCaptureData = {
    title: "Weekly stand-up",
    attendees: ["me@studio.com"],
    organizer: "me@studio.com",
    startTime: "2026-08-10T14:00:00.000Z",
    externalId: "evt-standup",
    provider: "googlecalendar",
  };

  it("does not emit a work signal for an operator-only standup", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyMeetingCapture("ws-1", standup, "cap-1");

    expect(workSignals(signals)).toHaveLength(0);
  });

  it("never emits for a generic ceremony title, even with a client attending", async () => {
    // Memory full autonomy: with the worthiness gate gone, classifier
    // quality is the garbage control. A standup names a ritual, not client
    // work — agencies invite clients to standups all the time.
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...standup, attendees: ["me@studio.com", "client@acme.com"] },
      "cap-1",
    );

    expect(workSignals(signals)).toHaveLength(0);
  });

  it("never emits for a generic ceremony title, even with an external organizer", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...standup, title: "stand-up meeting", organizer: "client@acme.com" },
      "cap-1",
    );

    expect(workSignals(signals)).toHaveLength(0);
  });

  it("emits for a substantive project title with an external participant", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyMeetingCapture(
      "ws-1",
      {
        ...standup,
        title: "Acme website redesign kickoff",
        attendees: ["me@studio.com", "client@acme.com"],
      },
      "cap-1",
    );

    const work = workSignals(signals);
    expect(work).toHaveLength(1);
    expect(work[0].signal).toBe("meeting_title_project_pattern");
  });

  it("does not emit for a substantive title without an external participant", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...standup, title: "Acme website redesign kickoff" },
      "cap-1",
    );

    expect(workSignals(signals)).toHaveLength(0);
  });
});

describe("classifyEmailCapture — email_subject_project_pattern", () => {
  const projectEmail: EmailCaptureData = {
    from: "client@acme.com",
    to: ["me@studio.com"],
    subject: "Website redesign kickoff",
    body: "Looking forward to getting started.",
  };

  it("emits for a known contact's project-pattern subject", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture("ws-1", projectEmail, "cap-1");

    const work = workSignals(signals);
    expect(work).toHaveLength(1);
    expect(work[0].signal).toBe("email_subject_project_pattern");
    expect(work[0].identifier).toBe(
      "work:client@acme.com:website redesign kickoff",
    );
    expect(work[0].extractedData.name).toBe("Website redesign kickoff");
  });

  it("strips reply prefixes so thread replies stack on one evidence row", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture(
      "ws-1",
      { ...projectEmail, subject: "RE: Website redesign kickoff", isReply: true },
      "cap-2",
    );

    const work = workSignals(signals);
    expect(work[0]?.identifier).toBe(
      "work:client@acme.com:website redesign kickoff",
    );
    expect(work[0]?.extractedData.name).toBe("Website redesign kickoff");
  });

  it("does not emit for an unknown sender — cold outreach is not work", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyEmailCapture("ws-1", projectEmail, "cap-1");

    expect(workSignals(signals)).toHaveLength(0);
  });
});

describe("classifyEmailCapture — thread_discusses_scope", () => {
  const scopeReply: EmailCaptureData = {
    from: "client@acme.com",
    to: ["me@studio.com"],
    subject: "RE: Website redesign",
    body: "Let's confirm the scope and the deliverables. The timeline works for us.",
    isReply: true,
    threadId: "thread-1",
  };

  it("emits when a known contact's reply discusses scope vocabulary", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture("ws-1", scopeReply, "cap-1");

    const work = workSignals(signals);
    expect(work.map((s) => s.signal)).toContain("thread_discusses_scope");
  });

  it("stacks on the same evidence row as the subject-pattern signal", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture("ws-1", scopeReply, "cap-1");

    const work = workSignals(signals);
    const identifiers = new Set(work.map((s) => s.identifier));
    expect(identifiers.size).toBe(1);
    expect(work.map((s) => s.signal)).toEqual(
      expect.arrayContaining([
        "email_subject_project_pattern",
        "thread_discusses_scope",
      ]),
    );
  });

  it("does not emit outside a thread", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture(
      "ws-1",
      { ...scopeReply, isReply: false, threadId: undefined },
      "cap-1",
    );

    expect(
      workSignals(signals).map((s) => s.signal),
    ).not.toContain("thread_discusses_scope");
  });

  it("requires at least two scope terms", async () => {
    h.state.tables = KNOWN_CLIENT_TABLES;

    const signals = await classifyEmailCapture(
      "ws-1",
      { ...scopeReply, body: "Thanks — the timeline works for us." },
      "cap-1",
    );

    expect(
      workSignals(signals).map((s) => s.signal),
    ).not.toContain("thread_discusses_scope");
  });

  it("does not emit for an unknown sender", async () => {
    h.state.tables = OPERATOR_TABLES;

    const signals = await classifyEmailCapture("ws-1", scopeReply, "cap-1");

    expect(workSignals(signals)).toHaveLength(0);
  });
});
