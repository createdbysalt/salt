import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunCareForSignal = vi.fn();

let emailCount = 0;
const mockFrom = vi.fn(() => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    then: (resolve: (value: { count: number }) => void) =>
      resolve({ count: emailCount }),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));

import { produceEmailActivityRollup } from "./email-activity-producer";

describe("produceEmailActivityRollup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailCount = 0;
    mockRunCareForSignal.mockResolvedValue([]);
  });

  it("dispatches email_count_gte_5 when the 90-day count clears the bar", async () => {
    emailCount = 7;

    const result = await produceEmailActivityRollup({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "gmail",
    });

    expect(result.emailCount).toBe(7);
    expect(result.dispatched).toBe(true);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        entityType: "person",
        entityId: "person-1",
        signalKey: "email_count_gte_5",
        evidence: expect.objectContaining({
          source: "gmail",
          signalValues: { email_count_gte_5: true },
        }),
      }),
    );
  });

  it("stays quiet below the bar", async () => {
    emailCount = 4;

    const result = await produceEmailActivityRollup({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "gmail",
    });

    expect(result.dispatched).toBe(false);
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("counts exactly at the bar", async () => {
    emailCount = 5;

    const result = await produceEmailActivityRollup({
      workspaceId: "ws-1",
      personId: "person-1",
      source: "gmail",
    });

    expect(result.dispatched).toBe(true);
  });
});
