import { describe, expect, it } from "vitest";
import { resolveSegmentStructuredDataFaqs } from "./segment-structured-data-fallback";

describe("resolveSegmentStructuredDataFaqs", () => {
  it("uses segment fallback FAQs when Sanity has none", () => {
    const faqs = resolveSegmentStructuredDataFaqs("coaches", undefined);

    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs[0]?.question).toMatch(/coaches/i);
  });

  it("prefers Sanity FAQs when provided", () => {
    const faqs = resolveSegmentStructuredDataFaqs("coaches", [
      {
        question: "Custom coach question?",
        answer: "Custom coach answer.",
      },
    ]);

    expect(faqs).toEqual([
      {
        question: "Custom coach question?",
        answer: "Custom coach answer.",
      },
    ]);
  });
});
