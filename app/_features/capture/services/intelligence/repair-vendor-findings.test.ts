import { describe, expect, it } from "vitest";
import { shouldDismissVendorMisclassifiedFinding } from "./repair-vendor-findings";

describe("shouldDismissVendorMisclassifiedFinding", () => {
  it("dismisses vendor SaaS memory-only needs_routing findings", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "needs_routing",
        sender: { kind: "vendor_saas", vendorName: "Linear" },
        filteredProposals: [],
        metadata: {},
      })
    ).toBe(true);
  });

  it("keeps client payment rail findings", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "needs_routing",
        sender: { kind: "payment_rail" },
        filteredProposals: [],
        metadata: { payment_payer_hint: "Jane Client" },
      })
    ).toBe(false);
  });

  it("keeps real revenue signals even from vendor domains", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "revenue_buying",
        sender: { kind: "vendor_saas", vendorName: "Linear" },
        filteredProposals: [],
        metadata: {},
      })
    ).toBe(false);
  });

  it("dismisses new_org findings for SaaS vendors", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "new_org",
        sender: { kind: "vendor_saas", vendorName: "Ramp" },
        filteredProposals: [],
        metadata: {},
      })
    ).toBe(true);
  });

  it("does not dismiss unknown senders", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "needs_routing",
        sender: { kind: "unknown" },
        filteredProposals: [
          {
            surface: "orgs",
            action: "create",
            hint: { name: "Manna House" },
            confidence: 80,
            reason: "test",
            system_play: "system:create-org",
          },
        ],
        metadata: {},
        storedProposals: [],
      })
    ).toBe(false);
  });

  it("dismisses findings when proposals reference a vendor domain", () => {
    expect(
      shouldDismissVendorMisclassifiedFinding({
        findingType: "needs_routing",
        sender: { kind: "unknown" },
        filteredProposals: [],
        metadata: {},
        storedProposals: [
          {
            surface: "people",
            action: "link",
            hint: { name: "Jeremy Jaques", domain: "descript.com" },
            confidence: 72,
            reason: "vendor contact",
            system_play: "system:create-person",
          },
        ],
      })
    ).toBe(true);
  });
});
