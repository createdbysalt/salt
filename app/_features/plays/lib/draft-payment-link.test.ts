import { describe, expect, it } from "vitest";
import {
  applyPayLinksToDraft,
  collectInvoicePayLinks,
  collectPayLinksFromSources,
  ensureDraftPaymentLink,
  isClientPayUrl,
  payLabelAndUrl,
} from "./draft-payment-link";

const PAY = "https://invoice.stripe.com/i/acct_test/in_1Frank";
const DASHBOARD = "https://dashboard.stripe.com/invoices/in_1Frank";

describe("isClientPayUrl", () => {
  it("accepts a Stripe hosted invoice page", () => {
    expect(isClientPayUrl(PAY)).toBe(true);
  });

  it("rejects the owner's Stripe dashboard", () => {
    expect(isClientPayUrl(DASHBOARD)).toBe(false);
  });

  it("rejects http and junk", () => {
    expect(isClientPayUrl("http://invoice.stripe.com/i/x")).toBe(false);
    expect(isClientPayUrl("not-a-url")).toBe(false);
  });
});

describe("collectInvoicePayLinks", () => {
  it("reads pay_url from the invoice and open invoices", () => {
    expect(
      collectInvoicePayLinks({
        invoice: { number: "INV-104", pay_url: PAY },
        open_invoices: [
          { number: "INV-104", pay_url: PAY },
          {
            number: "INV-099",
            pay_url: "https://invoice.stripe.com/i/acct_test/in_099",
          },
        ],
      })
    ).toEqual([
      { url: PAY, invoiceNumber: "INV-104" },
      {
        url: "https://invoice.stripe.com/i/acct_test/in_099",
        invoiceNumber: "INV-099",
      },
    ]);
  });

  it("ignores a dashboard URL stored as app_url", () => {
    expect(
      collectInvoicePayLinks({ invoice: { app_url: DASHBOARD } })
    ).toEqual([]);
  });
});

describe("collectPayLinksFromSources", () => {
  it("picks a hosted URL off a Stripe artifact", () => {
    expect(
      collectPayLinksFromSources({
        artifacts: [{ appId: "stripe", url: PAY }],
      })
    ).toEqual([{ url: PAY, invoiceNumber: null }]);
  });

  it("finds a hosted URL quoted in the verify step", () => {
    expect(
      collectPayLinksFromSources({
        verifyText: {
          text: `Still open. PAY_LINK: ${PAY}`,
        },
      })
    ).toEqual([{ url: PAY, invoiceNumber: null }]);
  });
});

describe("ensureDraftPaymentLink", () => {
  it("does nothing when no pay link was found", () => {
    const body = "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella";
    expect(ensureDraftPaymentLink(body, [])).toBe(body);
  });

  it("inserts a pay line before the sign-off", () => {
    expect(
      ensureDraftPaymentLink(
        "Hi Frank,\n\nPlease send payment.\n\nBest regards,\nGabriella Martins",
        [{ url: PAY, invoiceNumber: "INV-2026-1589" }]
      )
    ).toBe(
      `Hi Frank,\n\nPlease send payment.\n\nPay invoice: ${PAY}\n\nBest regards,\nGabriella Martins`
    );
  });

  it("does not duplicate a URL already in the letter", () => {
    const body = `Hi Frank,\n\nPay here: ${PAY}\n\nBest regards,`;
    expect(ensureDraftPaymentLink(body, [{ url: PAY }])).toBe(body);
  });

  it("lists more than one invoice when each has a link", () => {
    const second = "https://invoice.stripe.com/i/acct_test/in_099";
    expect(
      ensureDraftPaymentLink("Hi Dana,\n\nTwo invoices are open.", [
        { url: PAY, invoiceNumber: "INV-104" },
        { url: second, invoiceNumber: "INV-099" },
      ])
    ).toBe(
      [
        "Hi Dana,",
        "",
        "Two invoices are open.",
        "",
        "Pay online:",
        `- INV-104: ${PAY}`,
        `- INV-099: ${second}`,
      ].join("\n")
    );
  });
});

describe("applyPayLinksToDraft", () => {
  it("leaves an empty draft alone", () => {
    expect(applyPayLinksToDraft("", { invoiceContext: { pay_url: PAY } })).toBe(
      ""
    );
  });
});

describe("payLabelAndUrl", () => {
  it("reads a Pay invoice line", () => {
    expect(payLabelAndUrl(`Pay invoice: ${PAY}`)).toEqual({
      label: "Pay invoice",
      url: PAY,
    });
  });
});
