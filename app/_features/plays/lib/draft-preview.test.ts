import { describe, expect, it } from "vitest";
import {
  draftAddresseeLabel,
  ensureDraftSignOff,
  extractGreetingName,
  formatDraftToLabel,
  looksLikeRecordCode,
  markdownEmailBlocks,
  markdownEmailToHtml,
  markInboxDraftStale,
  prepareInboxDraftArgs,
  resolveEmailSubject,
  prepareStoredDraft,
  splitDraftSubject,
} from "./draft-preview";

describe("resolveEmailSubject", () => {
  it("prefers the approval subject over a peeled body line", () => {
    expect(
      resolveEmailSubject({
        draftBody: "Subject: From the letter\n\nHi Frank,",
        approvalSubject: "Payment Reminder - Invoice INV-2026-1589 ($50.00)",
      })
    ).toBe("Payment Reminder - Invoice INV-2026-1589 ($50.00)");
  });

  it("peels Subject from the letter when approval has none", () => {
    expect(
      resolveEmailSubject({
        draftBody: "**Subject:** Overdue invoice\n\nHi Dana,",
      })
    ).toBe("Overdue invoice");
  });

  it("does not fall back to a play title", () => {
    expect(resolveEmailSubject({ draftBody: "Hi Frank,\n\nPlease pay." })).toBe(
      null
    );
  });
});

describe("splitDraftSubject", () => {
  it("peels a markdown subject line", () => {
    expect(
      splitDraftSubject(
        "**Subject:** Payment Reminder - Invoice INV-2026-1589 ($50.00)\n\nHi Frank,"
      )
    ).toEqual({
      subject: "Payment Reminder - Invoice INV-2026-1589 ($50.00)",
      body: "Hi Frank,",
    });
  });

  it("peels a plain Subject: line", () => {
    expect(splitDraftSubject("Subject: Overdue invoice\n\nHi Dana,")).toEqual({
      subject: "Overdue invoice",
      body: "Hi Dana,",
    });
  });

  it("leaves body-only drafts alone", () => {
    expect(splitDraftSubject("Hi Priya,\n\nJust a reminder.")).toEqual({
      subject: null,
      body: "Hi Priya,\n\nJust a reminder.",
    });
  });

  it("does not treat a bold total line as a subject", () => {
    const body = "Hi Frank,\n\n**Total Outstanding: $50.00**";
    expect(splitDraftSubject(body)).toEqual({ subject: null, body });
  });
});

describe("draftAddresseeLabel", () => {
  it("keeps a person's name", () => {
    expect(
      draftAddresseeLabel({ recipientLabel: "Frank", draftText: "Hi Frank," })
    ).toBe("Frank");
  });

  it("does not say the draft is to an invoice number", () => {
    expect(looksLikeRecordCode("INV-2026-1589")).toBe(true);
    expect(
      draftAddresseeLabel({
        recipientLabel: "INV-2026-1589",
        draftText: "**Subject:** Payment reminder\n\nHi Frank,\n\nThe invoice",
      })
    ).toBe("Frank");
  });

  it("falls back to Draft when there is no person", () => {
    expect(
      formatDraftToLabel({
        recipientLabel: "INV-2026-1589",
        draftText: "The invoice is overdue.",
      })
    ).toBe("Draft");
  });

  it("reads a greeting after a subject line", () => {
    expect(extractGreetingName("**Subject:** Hello\n\nDear Maya Chen,\n\nThanks")).toBe(
      "Maya Chen"
    );
  });
});

describe("prepareStoredDraft", () => {
  it("peels the Subject line and signs the letter in the stored body", () => {
    expect(
      prepareStoredDraft({
        subject: "Payment reminder — invoice INV-2026-1589",
        body: [
          "**Subject:** Payment Reminder - Invoice INV-2026-1589 ($50.00)",
          "",
          "Hi Frank,",
          "",
          "Please send payment.",
          "",
          "Best regards,",
        ].join("\n"),
        senderName: "Gabriella Martins",
      })
    ).toEqual({
      subject: "Payment Reminder - Invoice INV-2026-1589 ($50.00)",
      body: "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins",
    });
  });
});

describe("prepareInboxDraftArgs", () => {
  const gmailWrap =
    'font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.5;color:#222222';
  const outlookWrap =
    'font-family:Calibri,Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;color:#000000';

  it("writes Gmail-native HTML (divs, bold, lists)", () => {
    expect(
      prepareInboxDraftArgs({
        subject: "Payment reminder — invoice INV-2026-1589",
        body: [
          "**Subject:** Payment Reminder - Invoice INV-2026-1589 ($50.00)",
          "",
          "Hi Frank,",
          "",
          "**Outstanding Invoice:**",
          "- INV-2026-1589: $50.00 (38 days overdue)",
          "",
          "**Total Outstanding: $50.00**",
        ].join("\n"),
      })
    ).toEqual({
      subject: "Payment Reminder - Invoice INV-2026-1589 ($50.00)",
      is_html: true,
      body:
        `<div dir="ltr" style="${gmailWrap}">` +
        "<div>Hi Frank,</div>" +
        "<div><br></div>" +
        "<div><b>Outstanding Invoice:</b></div>" +
        "<div><br></div>" +
        '<ul style="margin:8px 0 8px 20px;padding:0"><li>INV-2026-1589: $50.00 (38 days overdue)</li></ul>' +
        "<div><br></div>" +
        "<div><b>Total Outstanding: $50.00</b></div>" +
        "</div>",
    });
  });

  it("writes Outlook-native HTML with Calibri 12pt", () => {
    const result = prepareInboxDraftArgs({
      subject: "Follow-up",
      body: "Hi Dana,\n\nJust checking in.",
      inbox: "outlook",
    });
    expect(result.is_html).toBe(true);
    expect(result.body).toContain(outlookWrap);
    expect(result.body).toContain("<div>Hi Dana,</div>");
    expect(result.body).not.toContain("<p>");
  });

  it("keeps the playbook subject when the body has no Subject line", () => {
    expect(
      prepareInboxDraftArgs({
        subject: "Follow-up",
        body: "Hi Dana,\n\nJust checking in.",
      })
    ).toEqual({
      subject: "Follow-up",
      is_html: true,
      body:
        `<div dir="ltr" style="${gmailWrap}">` +
        "<div>Hi Dana,</div>" +
        "<div><br></div>" +
        "<div>Just checking in.</div>" +
        "</div>",
    });
  });

  it("puts the sender name after a hanging Best regards", () => {
    expect(
      prepareInboxDraftArgs({
        subject: "Payment reminder",
        body: "Hi Frank,\n\nPlease send payment.\n\nBest regards,",
        senderName: "Gabriella Martins",
      })
    ).toEqual({
      subject: "Payment reminder",
      is_html: true,
      body:
        `<div dir="ltr" style="${gmailWrap}">` +
        "<div>Hi Frank,</div>" +
        "<div><br></div>" +
        "<div>Please send payment.</div>" +
        "<div><br></div>" +
        "<div>Best regards,<br>Gabriella Martins</div>" +
        "</div>",
    });
  });
});

describe("ensureDraftSignOff", () => {
  it("appends the sender name after a hanging closing", () => {
    expect(
      ensureDraftSignOff("Hi Frank,\n\nPlease send payment.\n\nBest regards,", {
        senderName: "Gabriella Martins",
      })
    ).toBe("Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins");
  });

  it("does not add a second name when the letter is already signed", () => {
    const signed = "Hi Frank,\n\nThanks.\n\nBest regards,\nGabriella Martins";
    expect(ensureDraftSignOff(signed, { senderName: "Gabriella Martins" })).toBe(
      signed
    );
  });

  it("adds a closing and name when the letter has neither", () => {
    expect(
      ensureDraftSignOff("Hi Frank,\n\nPlease send payment.", {
        senderName: "Gabriella Martins",
      })
    ).toBe("Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins");
  });

  it("prefers a saved email signature over a generated closing", () => {
    expect(
      ensureDraftSignOff("Hi Frank,\n\nPlease send payment.\n\nBest regards,", {
        senderName: "Gabriella Martins",
        emailSignature: "Gabriella Martins\nFounder, Salt",
      })
    ).toBe(
      "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins\nFounder, Salt"
    );
  });

  it("puts a comma after Best regards when the name is already there", () => {
    expect(
      ensureDraftSignOff(
        "Hi Frank,\n\nPlease send payment.\n\nBest regards\nGabriella Martins",
        { senderName: "Gabriella Martins" }
      )
    ).toBe(
      "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins"
    );
  });

  it("splits a same-line Best regards name into closing, then name", () => {
    expect(
      ensureDraftSignOff("Hi Frank,\n\nPlease send payment.\n\nBest regards Gabriella Martins", {
        senderName: "Gabriella Martins",
      })
    ).toBe(
      "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins"
    );
  });
});

describe("markdownEmailToHtml", () => {
  it("escapes raw HTML in the letter", () => {
    expect(markdownEmailToHtml('Hi <script>alert("x")</script>')).toContain(
      "Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("keeps a sign-off and name on separate lines", () => {
    expect(markdownEmailToHtml("Best regards,\nGabriella Martins")).toContain(
      "Best regards,<br>Gabriella Martins"
    );
  });

  it("renders invoice bullets as a list", () => {
    const html = markdownEmailToHtml(
      "**Outstanding Invoice:**\n- INV-2026-1589: $50.00 (38 days overdue)"
    );
    expect(html).toContain("<b>Outstanding Invoice:</b>");
    expect(html).toContain("<li>INV-2026-1589: $50.00 (38 days overdue)</li>");
  });

  it("renders a found pay URL as a button, not a raw stripe link", () => {
    const html = markdownEmailToHtml(
      "Hi Frank,\n\nPlease send payment.\n\nPay invoice: https://invoice.stripe.com/i/acct_test/in_1Frank\n\nBest regards,\nGabriella"
    );
    expect(html).toContain('href="https://invoice.stripe.com/i/acct_test/in_1Frank"');
    expect(html).toContain("Pay invoice");
    expect(html).toContain("background:#111111");
    expect(html).not.toContain("Pay invoice: https://invoice.stripe.com");
  });
});

describe("markdownEmailBlocks", () => {
  it("separates paragraphs the way Gmail does", () => {
    expect(markdownEmailBlocks("Hi Frank,\n\nPlease pay.")).toBe(
      "<div>Hi Frank,</div><div><br></div><div>Please pay.</div>"
    );
  });
});

describe("markInboxDraftStale", () => {
  it("clears the inbox write so Open or Send can rewrite Gmail", () => {
    const result = markInboxDraftStale(
      {
        inbox_draft_prepared: true,
        inbox_draft_letter: "Old letter",
        inbox_draft_url: "https://mail.google.com/mail/#inbox?compose=1",
      },
      {
        tool_slug: "GMAIL_CREATE_EMAIL_DRAFT",
        args: { body: "Old letter" },
        step_index: 4,
        inbox_draft_written: true,
      },
      "Edited letter"
    );
    expect(result.metadata.inbox_draft_prepared).toBeUndefined();
    expect(result.metadata.inbox_draft_letter).toBeUndefined();
    expect(result.metadata.inbox_draft_url).toBe(
      "https://mail.google.com/mail/#inbox?compose=1"
    );
    expect(result.approval_context?.inbox_draft_written).toBe(false);
    expect(result.approval_context?.args.body).toBe("Edited letter");
  });
});
