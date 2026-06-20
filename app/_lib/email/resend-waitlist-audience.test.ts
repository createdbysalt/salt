import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockContactsCreate = vi.fn();

vi.mock("@/app/_lib/email/resend", () => ({
  getResendClient: () => ({
    contacts: {
      create: mockContactsCreate,
    },
  }),
}));

import { syncCompleteWaitlistLeadsToResendAudience } from "./resend-waitlist-audience";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockFilter = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe("syncCompleteWaitlistLeadsToResendAudience", () => {
  beforeEach(() => {
    process.env.RESEND_WAITLIST_AUDIENCE_ID = "aud_test";
    mockContactsCreate.mockResolvedValue({ data: { id: "contact_1" }, error: null });
    mockRange.mockReset();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ filter: mockFilter });
    mockFilter.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ range: mockRange });
  });

  afterEach(() => {
    delete process.env.RESEND_WAITLIST_AUDIENCE_ID;
    vi.clearAllMocks();
  });

  it("syncs only completed leads and dedupes emails", async () => {
    mockRange.mockResolvedValueOnce({
      data: [
        { email: "a@example.com", metadata: { status: "complete" } },
        { email: "A@example.com", metadata: { status: "complete" } },
      ],
      error: null,
    });
    mockRange.mockResolvedValueOnce({ data: [], error: null });

    const result = await syncCompleteWaitlistLeadsToResendAudience();

    expect(result.total).toBe(1);
    expect(result.synced).toBe(1);
    expect(mockContactsCreate).toHaveBeenCalledTimes(1);
    expect(mockContactsCreate).toHaveBeenCalledWith({
      audienceId: "aud_test",
      email: "a@example.com",
      unsubscribed: false,
    });
  });

  it("dry run does not call Resend", async () => {
    mockRange.mockResolvedValueOnce({
      data: [{ email: "done@example.com", metadata: { status: "complete" } }],
      error: null,
    });
    mockRange.mockResolvedValueOnce({ data: [], error: null });

    const result = await syncCompleteWaitlistLeadsToResendAudience({
      dryRun: true,
    });

    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockContactsCreate).not.toHaveBeenCalled();
  });
});
