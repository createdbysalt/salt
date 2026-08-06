import { describe, it, expect } from "vitest";
import { createDocumentsCategoryAdapter, getDocumentsAdapter } from "./documents";
import { runAdapterConformance } from "../adapter-conformance";
import {
  GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED,
  GOOGLEDOCS_TRIGGER_DOCUMENT_UPDATED,
  GOOGLEDOCS_FLAT_DOCUMENT,
  GOOGLEDOCS_MALFORMED,
} from "../__fixtures__/googledocs-payloads";
import {
  GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED,
  GOOGLESHEETS_MALFORMED,
} from "../__fixtures__/googlesheets-payloads";
import {
  GOOGLESLIDES_TRIGGER_SLIDE_ADDED,
  GOOGLESLIDES_TRIGGER_DRIVE_SHAPE,
  GOOGLESLIDES_MALFORMED,
} from "../__fixtures__/googleslides-payloads";
import {
  NOTION_TRIGGER_PAGE_CREATED,
  NOTION_TRIGGER_PAGE_CONTENT_UPDATED,
  NOTION_MALFORMED,
} from "../__fixtures__/notion-payloads";

describe("documents category adapter", () => {
  describe("getDocumentsAdapter", () => {
    it("returns adapters for known providers", () => {
      for (const provider of ["notion", "googledocs", "googlesheets", "googleslides"]) {
        const adapter = getDocumentsAdapter(provider);
        expect(adapter.sourceType).toBe(provider);
      }
    });
  });

  describe("googledocs trigger payloads (envelope: { document, event_type })", () => {
    const adapter = createDocumentsCategoryAdapter("googledocs");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "document created",
          payload: GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED,
          expectExternalId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
        },
        {
          name: "document updated",
          payload: GOOGLEDOCS_TRIGGER_DOCUMENT_UPDATED,
          expectExternalId: "1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210",
        },
        {
          name: "legacy flat shape",
          payload: GOOGLEDOCS_FLAT_DOCUMENT,
          expectExternalId: "1FlatShapeDocId",
        },
        { name: "no id anywhere", payload: GOOGLEDOCS_MALFORMED, expectExternalId: null },
      ]);
    });

    it("extracts title, editor, and url from the document envelope", () => {
      const envelope = adapter.normalize(GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED);
      expect(envelope?.title).toBe("Q3 Campaign Brief");
      expect(envelope?.occurredAt).toBe("2026-08-05T14:30:00.000Z");
      expect(envelope?.participants[0]?.email).toBe("jane@northwind.com");
      expect(envelope?.extracted.url).toContain("docs.google.com/document");
      expect(envelope?.extracted.event_type).toBe("document_created");
    });

    it("dedupes lastModifyingUser against owners", () => {
      const envelope = adapter.normalize(GOOGLEDOCS_TRIGGER_DOCUMENT_CREATED);
      expect(envelope?.participants).toHaveLength(1);
    });
  });

  describe("googlesheets trigger payloads (envelope: { spreadsheet, event_type })", () => {
    const adapter = createDocumentsCategoryAdapter("googlesheets");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "spreadsheet created",
          payload: GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED,
          expectExternalId: "1SpReAdShEeTiD0123456789AbCdEfGhIjKlMn",
        },
        { name: "no id", payload: GOOGLESHEETS_MALFORMED, expectExternalId: null },
      ]);
    });

    it("extracts the spreadsheet name and editor", () => {
      const envelope = adapter.normalize(GOOGLESHEETS_TRIGGER_SPREADSHEET_CREATED);
      expect(envelope?.title).toBe("2026 Revenue Tracker");
      expect(envelope?.participants[0]?.email).toBe("jane@northwind.com");
    });
  });

  describe("googleslides trigger payloads (envelope: { slide, event_type })", () => {
    const adapter = createDocumentsCategoryAdapter("googleslides");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "slide added (Slides API shape)",
          payload: GOOGLESLIDES_TRIGGER_SLIDE_ADDED,
          expectExternalId: "SLIDES_API1234567890",
        },
        {
          name: "slide added (Drive file shape)",
          payload: GOOGLESLIDES_TRIGGER_DRIVE_SHAPE,
          expectExternalId: "1DrIvEfIlEsHaPeId",
        },
        { name: "no usable id", payload: GOOGLESLIDES_MALFORMED, expectExternalId: null },
      ]);
    });
  });

  describe("notion trigger payloads (flat snake_case)", () => {
    const adapter = createDocumentsCategoryAdapter("notion");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "page created",
          payload: NOTION_TRIGGER_PAGE_CREATED,
          expectExternalId: "f0e1d2c3-b4a5-6f7e-8d9c-0b1a2f3e4d5c",
        },
        {
          name: "page content updated",
          payload: NOTION_TRIGGER_PAGE_CONTENT_UPDATED,
          expectExternalId: "f0e1d2c3-b4a5-6f7e-8d9c-0b1a2f3e4d5c",
        },
        { name: "no page_id", payload: NOTION_MALFORMED, expectExternalId: null },
      ]);
    });

    it("uses the event timestamp and parent as grouping pointer", () => {
      const envelope = adapter.normalize(NOTION_TRIGGER_PAGE_CREATED);
      expect(envelope?.occurredAt).toBe("2026-08-05T15:20:00.000Z");
      expect(envelope?.threadId).toBe("9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c");
      expect(envelope?.extracted.event_type).toBe("page.created");
    });

    it("keeps participants empty for ID-only Notion authors", () => {
      const envelope = adapter.normalize(NOTION_TRIGGER_PAGE_CREATED);
      expect(envelope?.participants).toHaveLength(0);
    });
  });

  describe("invalid payloads", () => {
    it("returns null for non-object payloads", () => {
      const adapter = createDocumentsCategoryAdapter("googledocs");
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize("string")).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });
});
