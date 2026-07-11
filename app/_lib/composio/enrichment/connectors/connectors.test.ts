import { describe, it, expect } from "vitest";
import {
  getConnectorManifest,
  hasConnectorManifest,
  listConnectorManifests,
  getConnectorIds,
} from "./index";
import { extractWithManifest } from "../config-driven-extractor";
import { googleCalendarManifest } from "./google-calendar";
import { googleDriveManifest } from "./google-drive";

describe("connector registry", () => {
  it("lists all registered connectors", () => {
    const manifests = listConnectorManifests();
    expect(manifests.length).toBeGreaterThanOrEqual(4);

    const ids = getConnectorIds();
    expect(ids).toContain("stripe-customers");
    expect(ids).toContain("gmail-contacts");
    expect(ids).toContain("google-calendar-events");
    expect(ids).toContain("google-drive-files");
  });

  it("retrieves connector by toolkit name", () => {
    expect(hasConnectorManifest("stripe")).toBe(true);
    expect(hasConnectorManifest("gmail")).toBe(true);
    expect(hasConnectorManifest("googlecalendar")).toBe(true);
    expect(hasConnectorManifest("googledrive")).toBe(true);
    expect(hasConnectorManifest("unknown")).toBe(false);
  });

  it("retrieves manifest by toolkit name", () => {
    const stripeManifest = getConnectorManifest("stripe");
    expect(stripeManifest).not.toBeNull();
    expect(stripeManifest?.connector.provider).toBe("stripe");
  });
});

describe("google calendar manifest", () => {
  const mockCalendarResponse = {
    items: [
      {
        summary: "Team Meeting",
        start: { dateTime: "2024-01-15T10:00:00Z" },
        end: { dateTime: "2024-01-15T11:00:00Z" },
        location: "Conference Room A",
        hangoutLink: "https://meet.google.com/abc-def-ghi",
        description: "Weekly sync",
        attendees: [
          { email: "john@example.com", displayName: "John Doe" },
          { email: "jane@example.com", displayName: "Jane Smith" },
        ],
        organizer: { email: "organizer@example.com" },
      },
    ],
  };

  it("extracts meeting fields from calendar response", () => {
    const result = extractWithManifest(
      googleCalendarManifest,
      "meeting",
      mockCalendarResponse,
      { meetingTitle: "Team Meeting" }
    );

    expect(result.hasData).toBe(true);
    expect(result.fields.title?.value).toBe("Team Meeting");
    expect(result.fields.location?.value).toBe("Conference Room A");
    expect(result.fields.conference_url?.value).toBe("https://meet.google.com/abc-def-ghi");
  });

  it("extracts person connections from attendees", () => {
    const result = extractWithManifest(
      googleCalendarManifest,
      "meeting",
      mockCalendarResponse,
      { meetingTitle: "Team Meeting" }
    );

    expect(result.connections?.people).toBeDefined();
    expect(result.connections?.people?.length).toBeGreaterThanOrEqual(1);
  });
});

describe("google drive manifest", () => {
  const mockDriveResponse = {
    files: [
      {
        name: "Project Proposal.pdf",
        mimeType: "application/pdf",
        webViewLink: "https://drive.google.com/file/d/123/view",
        size: "1048576",
        description: "Q1 project proposal",
        owners: [
          { displayName: "John Doe", emailAddress: "john@example.com" },
        ],
        sharingUser: { emailAddress: "shared@example.com" },
      },
    ],
  };

  it("extracts file fields from drive response", () => {
    const result = extractWithManifest(
      googleDriveManifest,
      "file",
      mockDriveResponse,
      { fileName: "Project Proposal" }
    );

    expect(result.hasData).toBe(true);
    expect(result.fields.file_name?.value).toBe("Project Proposal.pdf");
    expect(result.fields.mime_type?.value).toBe("application/pdf");
    expect(result.fields.external_url?.value).toBe("https://drive.google.com/file/d/123/view");
  });

  it("extracts person connections from owners", () => {
    const result = extractWithManifest(
      googleDriveManifest,
      "file",
      mockDriveResponse,
      { fileName: "Project Proposal" }
    );

    expect(result.connections?.people).toBeDefined();
    expect(result.connections?.people?.[0].email).toBe("john@example.com");
  });

  it("extracts notes from file description", () => {
    const result = extractWithManifest(
      googleDriveManifest,
      "file",
      mockDriveResponse,
      { fileName: "Project Proposal" }
    );

    expect(result.notes?.length).toBe(1);
    expect(result.notes?.[0].content).toContain("Q1 project proposal");
  });
});
