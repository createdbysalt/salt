import { describe, expect, it } from "vitest";
import {
  mapFileRecordBootstrapActivity,
  mapFileLinkToActivityEntry,
  mapFileActivityToTimelineEntry,
} from "./activity";
import type { FileActivityEvent, FileDetailRecord } from "../detail-types";

function baseDetail(overrides: Partial<FileDetailRecord> = {}): FileDetailRecord {
  return {
    id: "file-1",
    workspaceId: "ws-1",
    fileName: "Proposal.pdf",
    fileType: "file",
    uploadedBy: "user-1",
    createdAt: "2026-06-20T12:00:00Z",
    updatedAt: "2026-06-22T12:00:00Z",
    ...overrides,
  };
}

describe("mapFileRecordBootstrapActivity", () => {
  it("creates specific upload entry instead of generic update copy", () => {
    const entries = mapFileRecordBootstrapActivity(baseDetail());

    expect(entries.map((entry) => entry.label)).toEqual(["You uploaded this file"]);
    expect(entries[0]?.detail).toBe("Proposal.pdf");
  });

  it("emits field-specific entries for known file metadata", () => {
    const entries = mapFileRecordBootstrapActivity(
      baseDetail({
        category: "deliverable",
        documentType: "proposal",
        lifecycleStatus: "sent",
        totalAmountCents: 120_000,
        currency: "USD",
        dueDate: "2026-07-01T00:00:00Z",
      }),
    );

    expect(entries.some((entry) => entry.label === "You set the category")).toBe(true);
    expect(entries.some((entry) => entry.detail === "Category → Deliverable")).toBe(true);
    expect(entries.some((entry) => entry.detail === "Document type → Proposal")).toBe(true);
    expect(entries.some((entry) => entry.detail === "Status → Sent")).toBe(true);
    expect(entries.some((entry) => entry.detail === "Total → $1,200.00")).toBe(true);
    expect(entries.some((entry) => entry.label === "Due date set")).toBe(true);
  });

  it("skips bootstrap upload when a logged upload already exists", () => {
    const logged: FileActivityEvent[] = [
      {
        id: "act-1",
        fileId: "file-1",
        activityType: "uploaded",
        metadata: {},
        createdAt: "2026-06-20T12:00:00Z",
      },
    ];

    const entries = mapFileRecordBootstrapActivity(baseDetail({ category: "contract" }), logged);

    expect(entries.some((entry) => entry.label === "You uploaded this file")).toBe(false);
    expect(entries.some((entry) => entry.label === "You set the category")).toBe(true);
  });

  it("keeps metadata entries even when view events are logged", () => {
    const logged: FileActivityEvent[] = [
      {
        id: "act-view",
        fileId: "file-1",
        activityType: "viewed",
        metadata: {},
        createdAt: "2026-06-23T12:00:00Z",
      },
    ];

    const entries = mapFileRecordBootstrapActivity(
      baseDetail({ documentType: "contract", lifecycleStatus: "signed" }),
      logged,
    );

    expect(entries.some((entry) => entry.detail === "Document type → Contract")).toBe(true);
    expect(entries.some((entry) => entry.detail === "Status → Signed")).toBe(true);
  });
});

describe("mapFileActivityToTimelineEntry", () => {
  it("uses specific labels and formatted lifecycle transitions", () => {
    const entry = mapFileActivityToTimelineEntry({
      id: "act-2",
      fileId: "file-1",
      activityType: "lifecycle_changed",
      metadata: {
        fromStatus: "draft",
        toStatus: "sent",
      },
      createdAt: "2026-06-23T12:00:00Z",
    });

    expect(entry.label).toBe("Status changed");
    expect(entry.detail).toBe("Draft → Sent");
  });

  it("labels view events in the second person", () => {
    const entry = mapFileActivityToTimelineEntry({
      id: "act-view",
      fileId: "file-1",
      activityType: "viewed",
      metadata: {},
      createdAt: "2026-06-23T12:00:00Z",
    });

    expect(entry.label).toBe("You viewed this file");
  });
});

describe("mapFileLinkToActivityEntry", () => {
  it("maps entity link rows into timeline entries", () => {
    const entry = mapFileLinkToActivityEntry({
      id: "link-1",
      targetType: "work",
      targetLabel: "Brand refresh",
      targetHref: "/work/work-1",
      createdAt: "2026-06-21T12:00:00Z",
    });

    expect(entry).toMatchObject({
      id: "file-link-link-1",
      label: "Connected to work",
      detail: "Brand refresh",
      entityName: "Brand refresh",
      entityHref: "/work/work-1",
    });
  });

  it("labels short-dialect link types (org → organization, billing → payment)", () => {
    const orgEntry = mapFileLinkToActivityEntry({
      id: "link-2",
      targetType: "org",
      targetLabel: "Acme Inc",
      targetHref: "/orgs/org-1",
      createdAt: "2026-06-21T12:00:00Z",
    });
    expect(orgEntry.label).toBe("Connected to organization");

    const billingEntry = mapFileLinkToActivityEntry({
      id: "link-3",
      targetType: "billing",
      targetLabel: "INV-001",
      targetHref: "/billing/billing-1",
      createdAt: "2026-06-21T12:00:00Z",
    });
    expect(billingEntry.label).toBe("Connected to payment");

    const meetingEntry = mapFileLinkToActivityEntry({
      id: "link-4",
      targetType: "meeting",
      targetLabel: "Kickoff call",
      targetHref: "/meetings/meeting-1",
      createdAt: "2026-06-21T12:00:00Z",
    });
    expect(meetingEntry.label).toBe("Connected to meeting");
  });
});
