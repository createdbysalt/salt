import type { ConnectorManifest } from "../config";

/**
 * Google Drive connector manifest.
 * Defines field mappings for extracting file metadata from Drive.
 */
export const googleDriveManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "google-drive-files",
    name: "Google Drive Files",
    provider: "googledrive",
    category: "storage",
  },
  enrichment: {
    file: {
      action: "GOOGLEDRIVE_SEARCH_FILES",
      query: {
        template: "name contains '{seed.fileName}'",
        fallback: "mimeType != 'application/vnd.google-apps.folder'",
      },
      responseSelector: "files",
      fieldMappings: [
        {
          source: "name",
          target: "file_name",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "mimeType",
          target: "mime_type",
          transform: "lowercase",
          confidence: "deterministic",
        },
        {
          source: "webViewLink",
          target: "external_url",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "size",
          target: "file_size_bytes",
          transform: "direct",
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
          source: "owners[0].emailAddress",
          targetType: "person",
          matchField: "email",
          confidence: 0.9,
        },
        {
          source: "sharingUser.emailAddress",
          targetType: "person",
          matchField: "email",
          confidence: 0.85,
        },
      ],
      noteMappings: [
        {
          source: "description",
          template: "Drive file description: {value}",
        },
      ],
    },
    person: {
      action: "GOOGLEDRIVE_SEARCH_FILES",
      query: {
        template: "'{seed.email}' in owners or '{seed.email}' in writers",
      },
      responseSelector: "files",
      fieldMappings: [
        {
          source: "owners[0].displayName",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "owners[0].emailAddress",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
      ],
    },
    org: {
      action: "GOOGLEDRIVE_SEARCH_FILES",
      query: {
        template: "name contains '{seed.name}' or fullText contains '{seed.domain}'",
      },
      responseSelector: "files",
      fieldMappings: [
        {
          source: "owners[0].emailAddress",
          target: "domain",
          transform: "extract_domain",
          confidence: "rule",
        },
      ],
      noteMappings: [
        {
          source: "name",
          template: "Related Drive file: {value}",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.80,
  },
};
