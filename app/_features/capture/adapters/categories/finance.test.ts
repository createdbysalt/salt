import { describe, it, expect } from "vitest";
import {
  createFinanceCategoryAdapter,
  getFinanceAdapter,
} from "./finance";
import { runAdapterConformance } from "../adapter-conformance";
import type { CaptureEnvelope } from "../types";

/**
 * Mercury API transaction shape (defensive superset — see
 * https://docs.mercury.com/reference/transactions): amount is signed
 * dollars (positive = money in), counterparty may be a name string or an
 * object that sometimes carries emails.
 */
const MERCURY_CREDIT = {
  id: "txn_credit_1",
  amount: 1500.0,
  counterpartyName: "Acme Studio",
  counterparty: { name: "Acme Studio", emails: ["ap@acme.com"] },
  status: "sent",
  kind: "ach",
  createdAt: "2026-08-01T10:00:00.000Z",
  postedAt: "2026-08-02T10:00:00.000Z",
  note: "Invoice 1042",
};

const MERCURY_DEBIT = {
  id: "txn_debit_1",
  amount: -89.0,
  counterpartyName: "Figma",
  status: "sent",
  kind: "ach",
  createdAt: "2026-08-03T10:00:00.000Z",
};

describe("finance category adapter", () => {
  describe("getFinanceAdapter", () => {
    it("returns adapter for mercury", () => {
      const adapter = getFinanceAdapter("mercury");
      expect(adapter.sourceType).toBe("mercury");
    });
  });

  describe("mercury transaction payloads", () => {
    const adapter = createFinanceCategoryAdapter("mercury");

    it("passes conformance against transaction fixtures", () => {
      runAdapterConformance(adapter, [
        {
          name: "credit (money in)",
          payload: MERCURY_CREDIT,
          expectExternalId: "txn_credit_1",
        },
        {
          name: "debit (money out)",
          payload: MERCURY_DEBIT,
          expectExternalId: "txn_debit_1",
        },
        { name: "missing id", payload: { amount: 10 }, expectExternalId: null },
      ]);
    });

    it("normalizes direction, amount, and counterparty into shared keys", () => {
      const credit = adapter.normalize(MERCURY_CREDIT);
      expect(credit?.captureType).toBe("payment");
      expect(credit?.occurredAt).toBe("2026-08-02T10:00:00.000Z");
      expect(credit?.extracted.direction).toBe("credit");
      expect(credit?.extracted.amount).toBe(1500);
      expect(credit?.extracted.counterparty_name).toBe("Acme Studio");
      expect(credit?.extracted.counterparty_email).toBe("ap@acme.com");

      const debit = adapter.normalize(MERCURY_DEBIT);
      expect(debit?.extracted.direction).toBe("debit");
      expect(debit?.extracted.amount).toBe(-89);
      expect(debit?.extracted.counterparty_email).toBeNull();
    });

    it("witnesses the relationship: money in means they paid you", () => {
      const credit = adapter.normalize(MERCURY_CREDIT) as CaptureEnvelope;
      const debit = adapter.normalize(MERCURY_DEBIT) as CaptureEnvelope;

      const derived = adapter.deriveSignals?.([credit, debit], {
        userEmail: null,
      });

      expect(derived?.get("ap@acme.com")?.has_payment_received).toBe(true);
      // Money out is not a relationship witness.
      expect(derived?.size).toBe(1);
    });

    it("derives the counterparty name as a person field signal", () => {
      const credit = adapter.normalize(MERCURY_CREDIT) as CaptureEnvelope;

      const derived = adapter.deriveFieldSignals?.([credit], {
        userEmail: null,
      });

      expect(
        derived?.get("ap@acme.com")?.signalValues.person_name_extracted,
      ).toBe("Acme Studio");
    });
  });

  describe("generic finance extraction", () => {
    const adapter = createFinanceCategoryAdapter("brex");

    it("normalizes unknown finance providers with the shared keys", () => {
      const envelope = adapter.normalize({
        id: "brx-1",
        amount: 42.5,
        counterparty: { name: "Jane Doe", email: "jane@acme.com" },
        created_at: "2026-08-04T12:00:00.000Z",
      });

      expect(envelope?.externalId).toBe("brx-1");
      expect(envelope?.extracted.direction).toBe("credit");
      expect(envelope?.extracted.counterparty_email).toBe("jane@acme.com");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });
});
