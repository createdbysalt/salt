import { describe, expect, it } from "vitest";

import {
  extractNameFromEmail,
  isPlausiblePersonName,
} from "./person-signals";

describe("isPlausiblePersonName", () => {
  it("accepts real names", () => {
    expect(isPlausiblePersonName("Avery Example")).toBe(true);
    expect(isPlausiblePersonName("Daniel R")).toBe(true);
    expect(isPlausiblePersonName("Gabriella")).toBe(true);
    expect(isPlausiblePersonName("John Q Public")).toBe(true);
  });

  it("rejects names containing digits", () => {
    expect(isPlausiblePersonName("Daniel R 542")).toBe(false);
    expect(isPlausiblePersonName("Danielh542")).toBe(false);
  });

  it("rejects role words used as names", () => {
    expect(isPlausiblePersonName("Customer")).toBe(false);
    expect(isPlausiblePersonName("Support")).toBe(false);
    expect(isPlausiblePersonName("Customer Success")).toBe(false);
    expect(isPlausiblePersonName("Support Team")).toBe(false);
  });

  it("does not reject a real name that contains a role word", () => {
    expect(isPlausiblePersonName("Customer Maria")).toBe(true);
  });

  it("rejects single characters and blanks", () => {
    expect(isPlausiblePersonName("H")).toBe(false);
    expect(isPlausiblePersonName("")).toBe(false);
    expect(isPlausiblePersonName("   ")).toBe(false);
    expect(isPlausiblePersonName(null)).toBe(false);
    expect(isPlausiblePersonName(undefined)).toBe(false);
  });

  it("rejects bare email addresses", () => {
    expect(isPlausiblePersonName("daniel@gmail.com")).toBe(false);
  });
});

describe("extractNameFromEmail", () => {
  it("title-cases a dotted local part", () => {
    expect(extractNameFromEmail("daniel.r@gmail.com")).toBe("Daniel R");
  });

  it("handles underscores and hyphens", () => {
    expect(extractNameFromEmail("avery_example@outlook.com")).toBe(
      "Avery Example",
    );
  });

  it("returns null for digit-bearing local parts", () => {
    expect(extractNameFromEmail("daniel.r.261107@gmail.com")).toBeNull();
    expect(extractNameFromEmail("danielr542@gmail.com")).toBeNull();
  });

  it("returns null for role-word local parts", () => {
    expect(extractNameFromEmail("customer@shopifystore.com")).toBeNull();
    expect(extractNameFromEmail("support@acme.com")).toBeNull();
  });
});
