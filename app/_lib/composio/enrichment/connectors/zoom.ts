import type { ConnectorManifest } from "../config";

/**
 * Zoom connector manifest.
 * Defines field mappings for extracting meeting data from Zoom.
 */
export const zoomManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "zoom-meetings",
    name: "Zoom Meetings",
    provider: "zoom",
    category: "meetings",
  },
  enrichment: {
    meeting: {
      action: "ZOOM_LIST_MEETINGS",
      query: {
        template: "topic:{seed.meetingTitle}",
        fallback: "",
      },
      responseSelector: "meetings",
      fieldMappings: [
        {
          source: "topic",
          target: "title",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "start_time",
          target: "start_time",
          transform: "parse_date",
          confidence: "deterministic",
        },
        {
          source: "duration",
          target: "end_time",
          transform: "direct",
          confidence: "rule",
        },
        {
          source: "join_url",
          target: "conference_url",
          transform: "direct",
          confidence: "deterministic",
        },
        {
          source: "agenda",
          target: "description",
          transform: "trim",
          confidence: "deterministic",
        },
      ],
      connectionMappings: [
        {
          source: "host_email",
          targetType: "person",
          matchField: "email",
          confidence: 0.95,
        },
      ],
      noteMappings: [
        {
          source: "agenda",
          template: "Zoom meeting agenda: {value}",
        },
      ],
    },
    person: {
      action: "ZOOM_LIST_MEETING_PARTICIPANTS",
      query: {
        template: "email:{seed.email}",
      },
      responseSelector: "participants",
      fieldMappings: [
        {
          source: "user_email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
        {
          source: "name",
          target: "name",
          transform: "trim",
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
