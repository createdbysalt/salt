import type { ConnectorManifest } from "../config";

/**
 * Gmail connector manifest.
 * Defines field mappings for extracting contact data from Gmail messages.
 */
export const gmailManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "gmail-contacts",
    name: "Gmail Contacts",
    provider: "gmail",
    category: "email",
  },
  enrichment: {
    person: {
      action: "GMAIL_SEARCH_MESSAGES",
      query: {
        template: "from:{seed.email}",
        fallback: 'from:"{seed.name}" OR "{seed.name}"',
      },
      responseSelector: "messages",
      fieldMappings: [
        {
          source: "[0].payload.headers[?(@.name=='From')].value",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "[0].payload.headers[?(@.name=='From')].value",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
      ],
      noteMappings: [
        {
          source: "[0].snippet",
          template: "From Gmail: {value}",
        },
      ],
    },
    meeting: {
      action: "GMAIL_SEARCH_MESSAGES",
      query: {
        template: "subject:meeting {seed.meetingTitle}",
      },
      responseSelector: "messages",
      fieldMappings: [
        {
          source: "[0].payload.headers[?(@.name=='Subject')].value",
          target: "title",
          transform: "trim",
          confidence: "fuzzy",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "llm_extract",
    confidenceThreshold: 0.80,
  },
};
