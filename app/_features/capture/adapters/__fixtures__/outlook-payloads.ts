/**
 * Golden payload fixtures for the Outlook (mail) capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Microsoft Graph message
 * resource shape (the hydrated form OUTLOOK_MESSAGE_TRIGGER payloads take
 * after webhook enrichment) — not yet captured live. Replace with a live
 * row when the first Outlook message trigger fires against a real mailbox.
 */

/** Hydrated Graph message (post-enrichment trigger payload). */
export const OUTLOOK_MESSAGE_HYDRATED = {
  id: "AAMkOutlookMsg123",
  subject: "Contract redlines",
  bodyPreview: "Two clauses to review before Friday.",
  from: {
    emailAddress: { address: "Grace@AcmeCreative.co", name: "Grace Chen" },
  },
  toRecipients: [
    { emailAddress: { address: "you@usesalt.io", name: "You" } },
  ],
  conversationId: "conv-outlook-1",
  receivedDateTime: "2026-08-01T10:00:00Z",
  webLink: "https://outlook.office.com/mail/id/AAMkOutlookMsg123",
};
