import { describe, expect, it } from "vitest";
import { classifyCaptureNoise } from "@/app/_features/capture/services/intelligence/capture-noise";
import { runAdapterConformance } from "./adapter-conformance";
import { gmailCaptureAdapter } from "./gmail";
import {
  GMAIL_FETCH_ROW,
  GMAIL_TRIGGER_CAMEL,
  GMAIL_TRIGGER_NO_ID,
  GMAIL_TRIGGER_PROMO,
  GMAIL_TRIGGER_SENT,
  GMAIL_TRIGGER_SNAKE_NESTED,
} from "./__fixtures__/gmail-trigger-payloads";

describe("gmail capture adapter conformance", () => {
  it("passes the shared harness across payload shapes", () => {
    runAdapterConformance(gmailCaptureAdapter, [
      {
        name: "camel-case trigger payload",
        payload: GMAIL_TRIGGER_CAMEL,
        expectExternalId: "197a2f0c8d4e1a2c",
      },
      {
        name: "snake-case nested payload",
        payload: GMAIL_TRIGGER_SNAKE_NESTED,
        expectExternalId: "18f001aa42bc9911",
      },
      {
        name: "sent message",
        payload: GMAIL_TRIGGER_SENT,
        expectExternalId: "197b3c1d9e5f2a3d",
      },
      {
        name: "promotions blast",
        payload: GMAIL_TRIGGER_PROMO,
        expectExternalId: "197c4d2eaf603b4e",
      },
      {
        name: "fetch-emails metadata row (backfill)",
        payload: GMAIL_FETCH_ROW,
        expectExternalId: "198d6f40c1825d60",
      },
      { name: "missing id declines", payload: GMAIL_TRIGGER_NO_ID, expectExternalId: null },
      { name: "non-object declines", payload: "nonsense", expectExternalId: null },
    ]);
  });

  it("parses sender name + address and recipient lists", () => {
    const envelope = gmailCaptureAdapter.normalize(GMAIL_TRIGGER_CAMEL);
    expect(envelope?.participants).toContainEqual({
      name: "Ada Lovelace",
      email: "ada@northwind.com",
      role: "from",
    });
    const nested = gmailCaptureAdapter.normalize(GMAIL_TRIGGER_SNAKE_NESTED);
    expect(nested?.participants.filter((p) => p.role === "to")).toHaveLength(2);
    expect(nested?.occurredAt).toBe("2026-06-30T18:44:11.000Z");
  });

  it("extracts the snippet from a fetch-emails preview object", () => {
    const envelope = gmailCaptureAdapter.normalize(GMAIL_FETCH_ROW);
    expect(envelope?.extracted.snippet).toBe(
      "Attached the redlined contract — two clauses to review before Friday.",
    );
    expect(envelope?.title).toBe("Contract draft for the June retainer");
  });

  it("marks sent mail so the noise gate exempts it", () => {
    const envelope = gmailCaptureAdapter.normalize(GMAIL_TRIGGER_SENT);
    expect(envelope?.noise?.isSentByUser).toBe(true);
  });

  it("produces noise input the gate flags for promotions", () => {
    const envelope = gmailCaptureAdapter.normalize(GMAIL_TRIGGER_PROMO);
    expect(envelope?.noise).not.toBeNull();
    const verdict = classifyCaptureNoise(envelope!.noise!);
    expect(verdict.isNoise).toBe(true);
  });

  it("keeps a real conversation out of the noise bucket", () => {
    const envelope = gmailCaptureAdapter.normalize(GMAIL_TRIGGER_CAMEL);
    const verdict = classifyCaptureNoise(envelope!.noise!);
    expect(verdict.isNoise).toBe(false);
  });
});
