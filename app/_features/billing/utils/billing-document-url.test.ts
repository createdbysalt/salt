import { describe, expect, it } from "vitest";
import {
  isBillingDocumentPathForWorkspace,
  resolveBillingDocumentStoragePath,
} from "./billing-document-url";

describe("resolveBillingDocumentStoragePath", () => {
  it("strips the bucket prefix when present", () => {
    expect(resolveBillingDocumentStoragePath("billing-documents/workspace/ws-1/invoice.pdf")).toBe(
      "workspace/ws-1/invoice.pdf",
    );
  });

  it("returns bare object paths unchanged", () => {
    expect(resolveBillingDocumentStoragePath("workspace/ws-1/invoice.pdf")).toBe(
      "workspace/ws-1/invoice.pdf",
    );
  });
});

describe("isBillingDocumentPathForWorkspace", () => {
  it("accepts paths under the current workspace folder", () => {
    expect(
      isBillingDocumentPathForWorkspace(
        "workspace/00000000-0000-0000-0000-000000000001/invoice.pdf",
        "00000000-0000-0000-0000-000000000001",
      ),
    ).toBe(true);
  });

  it("rejects paths outside the current workspace folder", () => {
    expect(
      isBillingDocumentPathForWorkspace(
        "workspace/00000000-0000-0000-0000-000000000002/invoice.pdf",
        "00000000-0000-0000-0000-000000000001",
      ),
    ).toBe(false);
  });
});
