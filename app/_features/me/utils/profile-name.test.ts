import { describe, expect, it } from "vitest";
import {
  operatorDisplayName,
  operatorEditableFullName,
  splitFullName,
} from "./profile-name";

describe("profile-name", () => {
  it("does not use email as editable full name", () => {
    expect(
      operatorEditableFullName({
        display_name: null,
        full_name: "hello@createdbysalt.com",
        email: "hello@createdbysalt.com",
      }),
    ).toBe("");
  });

  it("prefers display_name for hero name", () => {
    expect(
      operatorDisplayName({
        display_name: "Gabriella",
        full_name: "hello@createdbysalt.com",
        email: "hello@createdbysalt.com",
      }),
    ).toBe("Gabriella");
  });

  it("splits full names into first and last", () => {
    expect(splitFullName("Gabriella Martinez")).toEqual({
      firstName: "Gabriella",
      lastName: "Martinez",
    });
  });
});
