import { describe, it, expect } from "vitest";
import { createCrmCategoryAdapter, getCrmAdapter } from "./crm";
import { runAdapterConformance } from "../adapter-conformance";
import {
  HUBSPOT_TRIGGER_CONTACT_CREATED,
  HUBSPOT_TRIGGER_DEAL_STAGE_UPDATED,
  HUBSPOT_TRIGGER_NUMERIC_OBJECT_ID,
  HUBSPOT_MALFORMED,
} from "../__fixtures__/hubspot-payloads";

describe("crm category adapter", () => {
  describe("getCrmAdapter", () => {
    it("returns adapter for hubspot", () => {
      const adapter = getCrmAdapter("hubspot");
      expect(adapter.sourceType).toBe("hubspot");
    });

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getCrmAdapter("unknown");
      expect(adapter.sourceType).toBe("unknown");
    });
  });

  describe("hubspot trigger payloads (ID-only: { objectId, subscriptionType })", () => {
    const adapter = createCrmCategoryAdapter("hubspot");

    it("passes conformance against the trigger fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "contact created",
          payload: HUBSPOT_TRIGGER_CONTACT_CREATED,
          expectExternalId: "contact.creation:901234567",
        },
        {
          name: "deal stage updated",
          payload: HUBSPOT_TRIGGER_DEAL_STAGE_UPDATED,
          expectExternalId: "deal.propertyChange:18027917381",
        },
        {
          name: "numeric objectId",
          payload: HUBSPOT_TRIGGER_NUMERIC_OBJECT_ID,
          expectExternalId: "contact.creation:901234568",
        },
        { name: "no objectId", payload: HUBSPOT_MALFORMED, expectExternalId: null },
      ]);
    });

    it("marks contact events as contacts and flags for hydration", () => {
      const envelope = adapter.normalize(HUBSPOT_TRIGGER_CONTACT_CREATED);
      expect(envelope?.captureType).toBe("contact");
      expect(envelope?.extracted.object_id).toBe("901234567");
      expect(envelope?.extracted.needs_hydration).toBe(true);
      expect(envelope?.participants).toHaveLength(0);
    });

    it("maps non-contact events to notes", () => {
      const envelope = adapter.normalize(HUBSPOT_TRIGGER_DEAL_STAGE_UPDATED);
      expect(envelope?.captureType).toBe("note");
      expect(envelope?.title).toBe("HubSpot: deal.propertyChange");
    });

    it("falls back to generic extraction for full-object payloads (backfill)", () => {
      const envelope = adapter.normalize({
        id: "hs-contact-1",
        name: "Ada Lovelace",
        email: "Ada@northwind.com",
      });
      expect(envelope?.externalId).toBe("hs-contact-1");
      expect(envelope?.participants[0]?.email).toBe("ada@northwind.com");
    });
  });

  describe("generic crm extraction", () => {
    const adapter = createCrmCategoryAdapter("pipedrive");

    it("unwraps one level of nesting", () => {
      const envelope = adapter.normalize({
        data: { id: "deal-42", title: "Retainer renewal" },
      });
      expect(envelope?.externalId).toBe("deal-42");
      expect(envelope?.title).toBe("Retainer renewal");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });
});
