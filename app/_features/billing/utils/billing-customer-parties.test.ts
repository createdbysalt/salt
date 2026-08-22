import { describe, expect, it, vi } from "vitest";
import type { BillingRecord } from "../data";
import { resolveBillingCustomerDisplay } from "./billing-customer-parties";

vi.mock("@/app/_features/memory/records/project-fields", () => ({
  resolvePrimaryOrgIdForPerson: vi.fn(),
}));

import { resolvePrimaryOrgIdForPerson } from "@/app/_features/memory/records/project-fields";
import { enrichBillingRecordCustomerParties } from "./billing-customer-parties";

const PERSON_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";

const baseReceivable: BillingRecord = {
  id: "bill-1",
  direction: "receivable",
  number: "INV-2026-6354",
  amountCents: 800_000,
  currency: "USD",
  status: "paid",
  dueAt: "2026-07-01T12:00:00.000Z",
  issuedAt: "2026-06-01T12:00:00.000Z",
  lineItems: [{ description: "Services", amountCents: 800_000 }],
  activity: [],
  source: "user",
  provider: "manual",
  origin: "added",
  tags: [],
};

describe("resolveBillingCustomerDisplay", () => {
  it("keeps org and billing contact separate for receivable invoices", () => {
    expect(
      resolveBillingCustomerDisplay({
        ...baseReceivable,
        org: { id: ORG_ID, name: "Acme" },
        billTo: { kind: "person", id: PERSON_ID, name: "John Smith" },
      }),
    ).toEqual({
      organizationName: "Acme",
      organizationId: ORG_ID,
      billingContactName: "John Smith",
      personId: PERSON_ID,
    });
  });

  it("does not fall back to the person name in Organization", () => {
    expect(
      resolveBillingCustomerDisplay({
        ...baseReceivable,
        billTo: { kind: "person", id: PERSON_ID, name: "John Smith" },
      }),
    ).toEqual({
      organizationName: "",
      organizationId: null,
      billingContactName: "John Smith",
      personId: PERSON_ID,
    });
  });

  it("hides solo org shells that mirror the billing contact", () => {
    expect(
      resolveBillingCustomerDisplay({
        ...baseReceivable,
        org: { id: "pending", name: "John Smith" },
        billTo: { kind: "person", id: PERSON_ID, name: "John Smith" },
      }),
    ).toEqual({
      organizationName: "",
      organizationId: null,
      billingContactName: "John Smith",
      personId: PERSON_ID,
    });
  });
});

describe("enrichBillingRecordCustomerParties", () => {
  it("infers the person's primary organization when org is missing", async () => {
    vi.mocked(resolvePrimaryOrgIdForPerson).mockResolvedValue(ORG_ID);

    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: ORG_ID, name: "Acme" },
                })),
              })),
            })),
          })),
        })),
      })),
    };

    const enriched = await enrichBillingRecordCustomerParties(admin as never, "workspace-1", {
      ...baseReceivable,
      billTo: {
        kind: "person",
        id: PERSON_ID,
        name: "John Smith",
      },
    });

    expect(enriched.org).toEqual({ id: ORG_ID, name: "Acme" });
  });
});
