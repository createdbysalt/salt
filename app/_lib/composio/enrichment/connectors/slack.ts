import type { ConnectorManifest } from "../config";

/**
 * Slack connector manifest.
 * Defines field mappings for extracting contact and message data from Slack.
 */
export const slackManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "slack-workspace",
    name: "Slack Workspace",
    provider: "slack",
    category: "email",
  },
  enrichment: {
    person: {
      action: "SLACK_SEARCH_USERS",
      query: {
        template: "{seed.email}",
        fallback: "{seed.name}",
      },
      responseSelector: "members",
      fieldMappings: [
        {
          source: "profile.email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "profile.real_name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "profile.display_name",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "profile.phone",
          target: "phone",
          transform: "normalize_phone",
          confidence: "deterministic",
        },
        {
          source: "profile.title",
          target: "title",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "tz",
          target: "timezone",
          transform: "direct",
          confidence: "deterministic",
        },
      ],
      noteMappings: [
        {
          source: "profile.status_text",
          template: "Slack status: {value}",
        },
      ],
    },
    org: {
      action: "SLACK_GET_TEAM_INFO",
      query: {
        template: "",
      },
      fieldMappings: [
        {
          source: "team.name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "team.domain",
          target: "domain",
          transform: "lowercase",
          confidence: "deterministic",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
