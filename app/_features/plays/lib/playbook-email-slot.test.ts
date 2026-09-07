import { describe, expect, it } from "vitest";
import {
  collectEmailToolSiblings,
  constrainPlaybookAppSelections,
  remapEmailToolArgs,
  resolvePlaybookToolAllowlist,
  resolvePlaybookToolSlug,
  selectedEmailProvider,
  selectedProvidersFromSets,
} from "./playbook-email-slot";

describe("constrainPlaybookAppSelections", () => {
  it("keeps the last email inbox and leaves billing alone", () => {
    expect(
      constrainPlaybookAppSelections(["stripe", "gmail", "outlook"])
    ).toEqual(["stripe", "outlook"]);
  });

  it("keeps a single inbox", () => {
    expect(constrainPlaybookAppSelections(["gmail", "stripe"])).toEqual([
      "stripe",
      "gmail",
    ]);
  });

  it("returns non-email providers unchanged", () => {
    expect(constrainPlaybookAppSelections(["stripe", "quickbooks"])).toEqual([
      "stripe",
      "quickbooks",
    ]);
  });
});

describe("resolvePlaybookToolSlug", () => {
  it("swaps Gmail draft to Outlook when Outlook is the inbox", () => {
    expect(
      resolvePlaybookToolSlug("GMAIL_CREATE_EMAIL_DRAFT", ["stripe", "outlook"])
    ).toBe("OUTLOOK_CREATE_DRAFT");
  });

  it("swaps Gmail send to Outlook send when Outlook is the inbox", () => {
    expect(resolvePlaybookToolSlug("GMAIL_SEND_EMAIL", ["outlook"])).toBe(
      "OUTLOOK_SEND_EMAIL"
    );
  });

  it("keeps Gmail tools when Gmail is the inbox", () => {
    expect(resolvePlaybookToolSlug("GMAIL_FETCH_EMAILS", ["gmail"])).toBe(
      "GMAIL_FETCH_EMAILS"
    );
  });

  it("leaves Stripe alone when no billing app is selected", () => {
    expect(resolvePlaybookToolSlug("STRIPE_LIST_INVOICES", ["outlook"])).toBe(
      "STRIPE_LIST_INVOICES"
    );
  });

  it("swaps Stripe invoice read to QuickBooks when that is the only billing app", () => {
    expect(
      resolvePlaybookToolSlug("STRIPE_LIST_INVOICES", ["quickbooks", "gmail"])
    ).toBe("QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT");
  });
});

describe("resolvePlaybookToolAllowlist", () => {
  it("shows Outlook tools when Outlook is the selected inbox", () => {
    expect(
      resolvePlaybookToolAllowlist(
        ["STRIPE_LIST_INVOICES", "GMAIL_FETCH_EMAILS", "GMAIL_CREATE_EMAIL_DRAFT"],
        ["stripe", "gmail", "outlook"]
      )
    ).toEqual([
      "STRIPE_LIST_INVOICES",
      "OUTLOOK_LIST_MESSAGES",
      "OUTLOOK_CREATE_DRAFT",
    ]);
  });

  it("adds the QuickBooks invoice read when QuickBooks is selected", () => {
    expect(
      resolvePlaybookToolAllowlist(
        ["STRIPE_LIST_INVOICES", "GMAIL_FETCH_EMAILS", "GMAIL_CREATE_EMAIL_DRAFT"],
        ["stripe", "quickbooks", "gmail"]
      )
    ).toEqual([
      "STRIPE_LIST_INVOICES",
      "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
      "GMAIL_FETCH_EMAILS",
      "GMAIL_CREATE_EMAIL_DRAFT",
    ]);
  });

  it("replaces Stripe with QuickBooks when Stripe is not selected", () => {
    expect(
      resolvePlaybookToolAllowlist(
        ["STRIPE_LIST_INVOICES", "GMAIL_CREATE_EMAIL_DRAFT"],
        ["quickbooks", "outlook"]
      )
    ).toEqual(["QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT", "OUTLOOK_CREATE_DRAFT"]);
  });
});

describe("selectedEmailProvider", () => {
  it("prefers the last inbox when both were stored", () => {
    expect(selectedEmailProvider(["gmail", "outlook"])).toBe("outlook");
  });
});

describe("selectedProvidersFromSets", () => {
  it("drops excluded inboxes then constrains email", () => {
    expect(
      selectedProvidersFromSets(
        ["stripe", "gmail", "outlook"],
        new Set(["gmail"])
      )
    ).toEqual(["stripe", "outlook"]);
  });
});

describe("collectEmailToolSiblings", () => {
  it("returns the Outlook pair for declared Gmail email tools", () => {
    expect(
      collectEmailToolSiblings(["GMAIL_FETCH_EMAILS", "GMAIL_CREATE_EMAIL_DRAFT"])
    ).toEqual(["OUTLOOK_LIST_MESSAGES", "OUTLOOK_CREATE_DRAFT"]);
  });

  it("returns the QuickBooks invoice read for a declared Stripe tool", () => {
    expect(collectEmailToolSiblings(["STRIPE_LIST_INVOICES"])).toEqual([
      "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
    ]);
  });
});

describe("remapEmailToolArgs", () => {
  it("maps Gmail recipient_email to Outlook to_recipients", () => {
    expect(
      remapEmailToolArgs(
        "GMAIL_CREATE_EMAIL_DRAFT",
        "OUTLOOK_CREATE_DRAFT",
        {
          recipient_email: "dana@acme.com",
          subject: "Payment reminder",
          body: "Hi Dana",
        }
      )
    ).toEqual({
      subject: "Payment reminder",
      body: "Hi Dana",
      to_recipients: ["dana@acme.com"],
    });
  });

  it("leaves args unchanged when the tool does not swap", () => {
    const args = { recipient_email: "a@b.com", subject: "s", body: "b" };
    expect(
      remapEmailToolArgs("GMAIL_CREATE_EMAIL_DRAFT", "GMAIL_CREATE_EMAIL_DRAFT", args)
    ).toEqual(args);
  });
});
