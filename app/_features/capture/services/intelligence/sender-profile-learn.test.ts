import { describe, expect, it } from "vitest";
import {
  extractFromEmailFromEvidence,
  shouldLearnVendorOnDismiss,
} from "./sender-profile-learn";

describe("sender-profile-learn", () => {
  it("extracts from_email from finding evidence metadata", () => {
    const email = extractFromEmailFromEvidence({
      source_type: "email",
      metadata: { from_email: "billing@example.com" },
    });
    expect(email).toBe("billing@example.com");
  });

  it("learns vendor on dismiss for memory-only new_org findings", () => {
    expect(
      shouldLearnVendorOnDismiss({
        findingType: "new_org",
        evidence: {
          metadata: {
            from_email: "hello@linear.app",
            memory_proposals: [
              {
                surface: "orgs",
                action: "create",
                hint: { name: "Linear" },
                confidence: 80,
                reason: "test",
                system_play: "system:create-org",
              },
            ],
          },
        },
      })
    ).toBe(true);
  });

  it("does not learn vendor on dismiss for revenue findings", () => {
    expect(
      shouldLearnVendorOnDismiss({
        findingType: "revenue_buying",
        evidence: {
          metadata: { from_email: "buyer@client.com" },
        },
      })
    ).toBe(false);
  });
});
