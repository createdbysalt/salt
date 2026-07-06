import { describe, expect, it } from "vitest";
import {
  expandGrantScopes,
  isToolProvablyUnavailable,
} from "./scope-availability";

const GMAIL_GRANT = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

describe("isToolProvablyUnavailable", () => {
  it("hides a mutating labels tool under a read+compose grant", () => {
    // GMAIL_ADD_LABEL_TO_EMAIL: accepted scopes are mail.google.com or
    // gmail.modify — neither granted, and a write cannot run on read scopes.
    expect(
      isToolProvablyUnavailable({
        toolScopes: [
          "https://mail.google.com/",
          "https://www.googleapis.com/auth/gmail.modify",
        ],
        grantScopes: GMAIL_GRANT,
        risk: "mutating",
      }),
    ).toBe(true);
  });

  it("keeps draft tools — compose is granted", () => {
    expect(
      isToolProvablyUnavailable({
        toolScopes: ["https://www.googleapis.com/auth/gmail.compose"],
        grantScopes: GMAIL_GRANT,
        risk: "mutating",
      }),
    ).toBe(false);
  });

  it("NEVER hides read tools, even with no scope overlap (incomplete upstream data)", () => {
    // GMAIL_LIST_LABELS lists only gmail.labels upstream, but Google's
    // endpoint accepts gmail.readonly — the certainty rule keeps it.
    expect(
      isToolProvablyUnavailable({
        toolScopes: ["https://www.googleapis.com/auth/gmail.labels"],
        grantScopes: GMAIL_GRANT,
        risk: "read",
      }),
    ).toBe(false);
  });

  it("keeps tools with no scope data", () => {
    expect(
      isToolProvablyUnavailable({
        toolScopes: null,
        grantScopes: GMAIL_GRANT,
        risk: "mutating",
      }),
    ).toBe(false);
    expect(
      isToolProvablyUnavailable({
        toolScopes: [],
        grantScopes: GMAIL_GRANT,
        risk: "mutating",
      }),
    ).toBe(false);
  });

  it("keeps everything when the grant is unknown", () => {
    expect(
      isToolProvablyUnavailable({
        toolScopes: ["https://www.googleapis.com/auth/gmail.modify"],
        grantScopes: null,
        risk: "mutating",
      }),
    ).toBe(false);
  });

  it("a full-drive grant satisfies narrow drive scopes via the superset map", () => {
    expect(
      isToolProvablyUnavailable({
        toolScopes: ["https://www.googleapis.com/auth/drive.file"],
        grantScopes: ["https://www.googleapis.com/auth/drive"],
        risk: "mutating",
      }),
    ).toBe(false);
  });
});

describe("expandGrantScopes", () => {
  it("expands mail.google.com to the whole gmail family", () => {
    const expanded = expandGrantScopes(["https://mail.google.com/"]);
    expect(expanded.has("https://www.googleapis.com/auth/gmail.modify")).toBe(
      true,
    );
    expect(expanded.has("https://www.googleapis.com/auth/gmail.labels")).toBe(
      true,
    );
  });

  it("does not invent scopes for unknown grants", () => {
    const expanded = expandGrantScopes(["https://example.com/custom"]);
    expect([...expanded]).toEqual(["https://example.com/custom"]);
  });
});
