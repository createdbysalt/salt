import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "./adapter-conformance";
import { googleDriveCaptureAdapter } from "./googledrive";
import {
  DRIVE_FILE_DOC,
  DRIVE_FILE_FOLDER,
  DRIVE_FILE_NO_ID,
  DRIVE_FILE_PDF,
  DRIVE_FILE_TRASHED,
  DRIVE_TRIGGER_FILE_CREATED,
} from "./__fixtures__/googledrive-payloads";

describe("google drive capture adapter conformance", () => {
  it("passes the shared harness across payload shapes", () => {
    runAdapterConformance(googleDriveCaptureAdapter, [
      {
        name: "google doc",
        payload: DRIVE_FILE_DOC,
        expectExternalId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      },
      {
        name: "pdf with size",
        payload: DRIVE_FILE_PDF,
        expectExternalId: "2BcDeFgHiJkLmNoPqRsTuVwXyZ123456",
      },
      {
        name: "file-created trigger payload (nested file)",
        payload: DRIVE_TRIGGER_FILE_CREATED,
        expectExternalId: "5EfGhIjKlMnOpQrStUvWxYz123456789",
      },
      { name: "folder declines", payload: DRIVE_FILE_FOLDER, expectExternalId: null },
      { name: "trashed declines", payload: DRIVE_FILE_TRASHED, expectExternalId: null },
      { name: "missing id declines", payload: DRIVE_FILE_NO_ID, expectExternalId: null },
      { name: "non-object declines", payload: null, expectExternalId: null },
    ]);
  });

  it("labels file types and lowers participant emails", () => {
    const envelope = googleDriveCaptureAdapter.normalize(DRIVE_FILE_DOC);
    expect(envelope?.extracted.file_type).toBe("Google Doc");
    expect(envelope?.participants).toContainEqual({
      email: "you@usesalt.io",
      name: "You",
      role: "other",
    });
    expect(envelope?.participants).toContainEqual({
      email: "ada@northwind.com",
      name: "Ada Lovelace",
      role: "other",
    });
  });

  it("prefers modifiedTime for occurredAt", () => {
    const envelope = googleDriveCaptureAdapter.normalize(DRIVE_FILE_DOC);
    expect(envelope?.occurredAt).toBe("2026-07-01T09:14:02.000Z");
  });
});
