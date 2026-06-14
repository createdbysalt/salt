import { describe, expect, it } from "vitest";
import { extractCalendarInviteFromPayload } from "./calendar-attachment-parser";

describe("extractCalendarInviteFromPayload", () => {
  it("parses text/calendar attachment from nested MIME", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Monthly training session",
      "DTSTART:20260612T180000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const payload = {
      payload: {
        mimeType: "multipart/mixed",
        parts: [
          {
            mimeType: "text/calendar",
            body: {
              data: Buffer.from(ics).toString("base64url"),
            },
          },
        ],
      },
    };

    const parsed = extractCalendarInviteFromPayload(payload);
    expect(parsed?.title).toBe("Monthly training session");
    expect(parsed?.start_at).toContain("2026-06-12");
  });
});
