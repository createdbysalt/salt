import type { ConnectorManifest } from "../config";

/**
 * Linear connector manifest.
 * Defines field mappings for extracting project and work data from Linear.
 */
export const linearManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "linear-projects",
    name: "Linear Projects",
    provider: "linear",
    category: "project_management",
  },
  enrichment: {
    work: {
      action: "LINEAR_SEARCH_ISSUES",
      query: {
        template: "title:{seed.projectName}",
        fallback: "{seed.name}",
      },
      responseSelector: "nodes",
      fieldMappings: [
        {
          source: "title",
          target: "name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "description",
          target: "description",
          transform: "trim",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "assignee.email",
          targetType: "person",
          matchField: "email",
          confidence: 0.9,
        },
        {
          source: "creator.email",
          targetType: "person",
          matchField: "email",
          confidence: 0.9,
        },
      ],
      noteMappings: [
        {
          source: "comments.nodes[0].body",
          template: "Linear comment: {value}",
        },
      ],
    },
    person: {
      action: "LINEAR_SEARCH_USERS",
      query: {
        template: "email:{seed.email}",
        fallback: "name:{seed.name}",
      },
      responseSelector: "nodes",
      fieldMappings: [
        {
          source: "email",
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
        {
          source: "displayName",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
      ],
    },
    org: {
      action: "LINEAR_GET_ORGANIZATION",
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
          source: "urlKey",
          target: "domain",
          transform: "lowercase",
          confidence: "rule",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
