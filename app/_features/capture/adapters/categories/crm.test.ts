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

  describe("pipedrive trigger payloads (flat deal/organization shapes)", () => {
    const adapter = createCrmCategoryAdapter("pipedrive");

    it("passes conformance against deal and organization fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "new deal",
          payload: {
            id: "42",
            title: "Retainer renewal",
            value: "2500",
            currency: "USD",
            status: "open",
            stage_id: "3",
            user_id: "9",
          },
          // IDs overlap across Pipedrive object types — dedupe key is scoped.
          expectExternalId: "deal:42",
        },
        {
          name: "new organization",
          payload: {
            id: "77",
            name: "Acme Creative",
            email: "hello@acmecreative.co",
            web: "https://acmecreative.co",
          },
          expectExternalId: "organization:77",
        },
        { name: "no id", payload: { title: "?" }, expectExternalId: null },
      ]);
    });

    it("normalizes deals with decimal-dollar value + currency (detail contract)", () => {
      const envelope = adapter.normalize({
        id: "42",
        title: "Retainer renewal",
        value: "2500",
        currency: "USD",
        status: "open",
        stage_id: "3",
      });

      expect(envelope?.extracted.entity_type).toBe("deal");
      expect(envelope?.extracted.entity_name).toBe("Retainer renewal");
      // Pipedrive sends major units as a string — no /100 anywhere.
      expect(envelope?.extracted.deal_value).toBe(2500);
      expect(envelope?.extracted.currency).toBe("USD");
      expect(envelope?.extracted.status).toBe("open");
      expect(envelope?.extracted.stage).toBe("3");
    });

    it("normalizes organizations with contact fields", () => {
      const envelope = adapter.normalize({
        id: "77",
        name: "Acme Creative",
        email: "Hello@AcmeCreative.co",
      });

      expect(envelope?.extracted.entity_type).toBe("organization");
      expect(envelope?.extracted.entity_name).toBe("Acme Creative");
      expect(envelope?.participants[0]?.email).toBe("hello@acmecreative.co");
    });

    it("unwraps one level of nesting", () => {
      const envelope = adapter.normalize({
        data: { id: "42", title: "Retainer renewal", value: "100" },
      });
      expect(envelope?.externalId).toBe("deal:42");
      expect(envelope?.title).toBe("Retainer renewal");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("generic crm extraction", () => {
    const adapter = createCrmCategoryAdapter("zoho");

    it("unwraps one level of nesting and fills contract fields", () => {
      const envelope = adapter.normalize({
        deal: {
          id: "z-1",
          name: "Website rebuild",
          value: 4800,
          currency: "USD",
          status: "won",
        },
      });
      expect(envelope?.externalId).toBe("z-1");
      expect(envelope?.extracted.entity_type).toBe("deal");
      expect(envelope?.extracted.entity_name).toBe("Website rebuild");
      expect(envelope?.extracted.deal_value).toBe(4800);
      expect(envelope?.extracted.currency).toBe("USD");
      expect(envelope?.extracted.status).toBe("won");
    });

    it("classifies rows without deal fields as contacts", () => {
      const envelope = adapter.normalize({
        id: "c-1",
        name: "Ada Lovelace",
        email: "ada@northwind.com",
      });
      expect(envelope?.extracted.entity_type).toBe("contact");
      expect(envelope?.extracted.deal_value).toBeNull();
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("deriveRecordSignals (Track A: org + deal producer)", () => {
    const adapter = createCrmCategoryAdapter("pipedrive");

    function envelopesFrom(payloads: unknown[]) {
      return payloads
        .map((payload) => adapter.normalize(payload))
        .filter((envelope) => envelope !== null);
    }

    it("derives org fields from organization rows, keyed by domain", () => {
      const envelopes = envelopesFrom([
        {
          id: "77",
          name: "Acme Creative",
          email: "Hello@AcmeCreative.co",
          web: "https://acmecreative.co",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const org = derived.orgs.get("domain:acmecreative.co");
      expect(org).toBeDefined();
      expect(org!.name).toBe("Acme Creative");
      expect(org!.signalValues).toEqual({
        org_name_extracted: "Acme Creative",
        org_website_found: "https://acmecreative.co",
        org_billing_email_extracted: "hello@acmecreative.co",
      });
      expect(org!.contactEmail).toBe("hello@acmecreative.co");
    });

    it("keys name-only organization rows by name", () => {
      const envelopes = envelopesFrom([{ id: "78", name: "Northwind" }]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const org = derived.orgs.get("name:northwind");
      expect(org).toBeDefined();
      expect(org!.signalValues.org_name_extracted).toBe("Northwind");
      expect(org!.contactEmail).toBeUndefined();
    });

    it("attests the account name from contact rows, keyed by email domain", () => {
      const envelopes = envelopesFrom([
        {
          id: "c-1",
          name: "Ada Lovelace",
          email: "ada@northwind.com",
          org_name: "Northwind Traders",
          job_title: "CEO",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const org = derived.orgs.get("domain:northwind.com");
      expect(org).toBeDefined();
      expect(org!.signalValues.org_name_extracted).toBe("Northwind Traders");
    });

    it("never keys orgs by a personal email domain", () => {
      const envelopes = envelopesFrom([
        {
          id: "c-2",
          name: "Ada Lovelace",
          email: "ada@gmail.com",
          org_name: "Northwind Traders",
          job_title: "CEO",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      expect(derived.orgs.has("domain:gmail.com")).toBe(false);
      expect(derived.orgs.get("name:northwind traders")).toBeDefined();
    });

    it("maps deal status won/lost onto the work stage vocabulary", () => {
      const envelopes = envelopesFrom([
        {
          id: "42",
          title: "Retainer renewal",
          value: "2500",
          currency: "USD",
          status: "won",
          stage_id: "3",
          org_name: "Acme Creative",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const deal = derived.deals.get("retainer renewal");
      expect(deal).toBeDefined();
      expect(deal!.title).toBe("Retainer renewal");
      expect(deal!.signalValues.work_stage_inferred).toBe("won");
      expect(deal!.orgName).toBe("Acme Creative");
      // The deal also attests the account name.
      expect(
        derived.orgs.get("name:acme creative")?.signalValues
          .org_name_extracted,
      ).toBe("Acme Creative");
    });

    it("maps CRM stage names through the alias table", () => {
      const envelopes = envelopesFrom([
        {
          id: "z-9",
          title: "Website rebuild",
          stage_name: "Negotiation",
          status: "open",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      expect(
        derived.deals.get("website rebuild")?.signalValues
          .work_stage_inferred,
      ).toBe("negotiating");
    });

    it("emits no stage for unmappable pipeline-local stage ids", () => {
      const envelopes = envelopesFrom([
        {
          id: "43",
          title: "Open deal",
          value: "100",
          status: "open",
          stage_id: "3",
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const deal = derived.deals.get("open deal");
      expect(deal).toBeDefined();
      expect(deal!.signalValues.work_stage_inferred).toBeUndefined();
    });

    it("maps CRM industry values onto the industry vocabulary", () => {
      const envelopes = envelopesFrom([
        {
          organization: {
            id: "h-1",
            name: "Ledgerly",
            industry: "Accounting",
            web: "https://ledgerly.com",
          },
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const org = derived.orgs.get("domain:ledgerly.com");
      expect(org).toBeDefined();
      expect(org!.signalValues.org_industry_inferred).toBe(
        "professional_services",
      );
      expect(org!.signalValues.org_subindustry_inferred).toBe("accounting");
    });

    it("emits no industry for values outside the vocabulary", () => {
      const envelopes = envelopesFrom([
        {
          organization: {
            id: "h-2",
            name: "Mystery Co",
            industry: "Underwater Basket Weaving",
            web: "https://mystery.example",
          },
        },
      ]);
      const derived = adapter.deriveRecordSignals!(envelopes, {
        userEmail: null,
      });

      const org = derived.orgs.get("domain:mystery.example");
      expect(org).toBeDefined();
      expect(org!.signalValues.org_industry_inferred).toBeUndefined();
      expect(org!.signalValues.org_subindustry_inferred).toBeUndefined();
    });
  });
});
