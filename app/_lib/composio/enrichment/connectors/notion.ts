import type { ConnectorManifest } from "../config";

/**
 * Notion connector manifest.
 * Defines field mappings for extracting page and database data from Notion.
 */
export const notionManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "notion-workspace",
    name: "Notion Workspace",
    provider: "notion",
    category: "documents",
  },
  enrichment: {
    file: {
      action: "NOTION_SEARCH_PAGES",
      query: {
        template: "{seed.fileName}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "properties.title.title[0].plain_text",
          target: "file_name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "url",
          target: "external_url",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "properties.Description.rich_text[0].plain_text",
          target: "description",
          transform: "trim",
          confidence: "rule",
        },
      ],
      connectionMappings: [
        {
          source: "created_by.person.email",
          targetType: "person",
          matchField: "email",
          confidence: 0.9,
        },
        {
          source: "last_edited_by.person.email",
          targetType: "person",
          matchField: "email",
          confidence: 0.85,
        },
      ],
    },
    work: {
      action: "NOTION_SEARCH_DATABASES",
      query: {
        template: "{seed.projectName}",
        fallback: "{seed.name}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "title[0].plain_text",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "description[0].plain_text",
          target: "description",
          transform: "trim",
          confidence: "deterministic",
        },
      ],
      noteMappings: [
        {
          source: "description[0].plain_text",
          template: "Notion database: {value}",
        },
      ],
    },
    person: {
      action: "NOTION_SEARCH_USERS",
      query: {
        template: "{seed.email}",
        fallback: "{seed.name}",
      },
      responseSelector: "results",
      fieldMappings: [
        {
          source: "person.email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
      ],
    },
    org: {
      action: "NOTION_GET_WORKSPACE",
      query: {
        template: "",
      },
      fieldMappings: [
        {
          source: "name",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "domain",
          target: "domain",
          transform: "lowercase",
          confidence: "rule",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.80,
  },
};
