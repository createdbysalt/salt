import { describe, expect, it } from "vitest";
import type { PlaybookStep } from "../playbooks/schema/v2/types";
import {
  playbookRunToast,
  resolveManualRunEntityNeed,
  resolveManualRunSignal,
} from "./manual-run-context";

describe("resolveManualRunEntityNeed", () => {
  it("detects a billing record fetch", () => {
    const steps: PlaybookStep[] = [
      { step: "fetch", id: "invoice_context", from: "memory.billing_record_context" },
    ];
    expect(resolveManualRunEntityNeed({ steps })).toEqual({
      kind: "billing",
      surface: "billing",
      source: "memory.billing_record_context",
      missingMessage: "This play needs an overdue invoice to run.",
    });
  });

  it("walks nested branch steps", () => {
    const steps: PlaybookStep[] = [
      {
        step: "branch",
        if: "true",
        steps: [
          { step: "fetch", id: "contact", from: "memory.person_context" },
        ],
      },
    ];
    expect(resolveManualRunEntityNeed({ steps })?.kind).toBe("person");
  });

  it("returns null when no entity-scoped fetch exists", () => {
    const steps: PlaybookStep[] = [
      { step: "fetch", id: "silent", from: "memory.silent_relationships" },
    ];
    expect(resolveManualRunEntityNeed({ steps })).toBeNull();
  });
});

describe("resolveManualRunSignal", () => {
  it("reads a single signal trigger", () => {
    expect(
      resolveManualRunSignal({ type: "signal", signal: "billing_due_date_passed" })
    ).toBe("billing_due_date_passed");
  });

  it("returns undefined for a schedule trigger", () => {
    expect(resolveManualRunSignal({ type: "schedule", cron: "0 9 * * *" })).toBeUndefined();
  });
});

describe("playbookRunToast", () => {
  it("points paused runs at the queue", () => {
    expect(playbookRunToast({ status: "paused" })).toEqual({
      title: "Draft is ready.",
      description: "Check the queue.",
    });
  });

  it("surfaces skip reasons without inventing dashes", () => {
    expect(
      playbookRunToast({ status: "skipped", reason: "No apps added for this play (billing)" })
    ).toEqual({
      title: "Nothing to do.",
      description: "No apps added for this play (billing)",
    });
  });
});
