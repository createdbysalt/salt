import { describe, expect, it } from "vitest";
import {
  operatorDisplayName,
  operatorEditableFullName,
  operatorGreetingName,
  operatorProfileFullName,
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

  it("prefers preferred_name for greetings", () => {
    expect(
      operatorGreetingName({
        preferred_name: "Gabriella",
        display_name: "Gabriella Martins",
        email: "hello@createdbysalt.com",
      }),
    ).toBe("Gabriella");
  });

  it("uses first name from full name when preferred name is empty", () => {
    expect(
      operatorGreetingName({
        preferred_name: "",
        display_name: "Gabriella Martins",
        email: "hello@createdbysalt.com",
      }),
    ).toBe("Gabriella");
  });

  it("returns profile full name for avatars", () => {
    expect(
      operatorProfileFullName({
        display_name: "Gabriella Martins",
        email: "hello@createdbysalt.com",
      }),
    ).toBe("Gabriella Martins");
  });
});
