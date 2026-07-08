import { describe, expect, it } from "vitest";
import { CONNECTOR_CATEGORY_ORDER, categoryLabel } from "./catalog-view";

describe("categoryLabel", () => {
  it("covers all 21 categories in CONNECTOR_CATEGORY_ORDER", () => {
    expect(CONNECTOR_CATEGORY_ORDER).toHaveLength(21);
  });

  it.each([...CONNECTOR_CATEGORY_ORDER])(
    "returns a non-slug display label for %s",
    (category) => {
      const label = categoryLabel(category);
      expect(label.length).toBeGreaterThan(0);
      // A raw slug leak would be all-lowercase and identical to the id.
      expect(label).not.toBe(category);
      expect(label[0]).toBe(label[0]?.toUpperCase());
    },
  );

  it("labels acronym categories correctly", () => {
    expect(categoryLabel("crm")).toBe("CRM");
    expect(categoryLabel("ai")).toBe("AI");
  });
});
