import type { ConnectorManifest } from "../config";

/**
 * Google Calendar connector manifest.
 * Defines field mappings for extracting meeting data from calendar events.
 */
export const googleCalendarManifest: ConnectorManifest = {
  version: "1.0.0",
  connector: {
    id: "google-calendar-events",
    name: "Google Calendar Events",
    provider: "googlecalendar",
    category: "calendar",
  },
  enrichment: {
    meeting: {
      action: "GOOGLECALENDAR_LIST_EVENTS",
      query: {
        template: "{seed.meetingTitle}",
        fallback: "",
      },
      responseSelector: "items",
      fieldMappings: [
        {
          source: "summary",
          target: "title",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "start.dateTime",
          target: "start_time",
          transform: "parse_date",
          confidence: "deterministic",
        },
        {
          source: "end.dateTime",
          target: "end_time",
          transform: "parse_date",
          confidence: "deterministic",
        },
        {
          source: "location",
          target: "location",
          transform: "trim",
          confidence: "deterministic",
        },
        {
          source: "hangoutLink",
          target: "conference_url",
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
          source: "attendees[0].email",
          targetType: "person",
          matchField: "email",
          confidence: 0.9,
        },
        {
          source: "organizer.email",
          targetType: "person",
          matchField: "email",
          confidence: 0.95,
        },
      ],
    },
    person: {
      action: "GOOGLECALENDAR_LIST_EVENTS",
      query: {
        template: "attendee:{seed.email}",
        fallback: "{seed.name}",
      },
      responseSelector: "items",
      fieldMappings: [
        {
          source: "attendees[0].displayName",
          target: "name",
          transform: "trim",
          confidence: "rule",
        },
        {
          source: "attendees[0].email",
          target: "email",
          transform: "normalize_email",
          confidence: "deterministic",
        },
      ],
      noteMappings: [
        {
          source: "summary",
          template: "Met in calendar event: {value}",
        },
      ],
    },
  },
  fallback: {
    unmappedFields: "ignore",
    confidenceThreshold: 0.85,
  },
};
