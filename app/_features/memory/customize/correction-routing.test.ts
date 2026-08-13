import { describe, expect, it } from "vitest";

import {
  guessCustomizeEntityType,
  routeCorrection,
} from "./correction-routing";

describe("routeCorrection", () => {
  it("routes a hard exclusion with a parseable target to a Sources rule", () => {
    const route = routeCorrection("never let in anything from @spammy-agency.com");
    expect(route.kind).toBe("sources_rule");
    if (route.kind === "sources_rule") {
      expect(route.exclusion.entityType).toBe("domain");
      expect(route.exclusion.entityKey).toBe("spammy-agency.com");
    }
  });

  it("routes a specific sender exclusion to a Sources rule", () => {
    const route = routeCorrection("stop watching emails from boss@agency.com");
    expect(route.kind).toBe("sources_rule");
  });

  it("routes a generalization to a Memory customization", () => {
    const route = routeCorrection("never treat my accountant as a client");
    expect(route.kind).toBe("memory_customization");
  });

  it("routes plain guidance to a Memory customization", () => {
    const route = routeCorrection("newsletters I subscribed to are not leads");
    expect(route.kind).toBe("memory_customization");
  });
});

describe("guessCustomizeEntityType", () => {
  it("defaults to person when nothing matches", () => {
    expect(guessCustomizeEntityType("be careful with vague stuff")).toBe("person");
  });

  it("detects org language", () => {
    expect(guessCustomizeEntityType("anyone from a big company is a lead")).toBe(
      "org",
    );
    expect(guessCustomizeEntityType("vendors are never clients")).toBe("org");
  });

  it("detects work language", () => {
    expect(guessCustomizeEntityType("every project needs a deadline")).toBe("work");
  });

  it("detects meeting language", () => {
    expect(guessCustomizeEntityType("ignore meetings with no agenda")).toBe(
      "meeting",
    );
  });

  it("detects resource language", () => {
    expect(guessCustomizeEntityType("old documents are not deliverables")).toBe(
      "resource",
    );
  });

  it("detects billing language — invoices are money records, not documents", () => {
    expect(guessCustomizeEntityType("old invoices are not deliverables")).toBe(
      "billing",
    );
    expect(guessCustomizeEntityType("never mark a payment as late")).toBe(
      "billing",
    );
  });

  it("detects me language", () => {
    expect(guessCustomizeEntityType("use my full name on proposals")).toBe("me");
    expect(guessCustomizeEntityType("my signature title is out of date")).toBe(
      "me",
    );
  });

  it("detects person language", () => {
    expect(guessCustomizeEntityType("my accountant is not a client")).toBe(
      "person",
    );
  });
});
