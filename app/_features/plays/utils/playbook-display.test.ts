import { describe, expect, it } from "vitest";
import {
  blueprintTags,
  getPlaybookDataSources,
  getPlaybookTriggerSignals,
  getPlaybookTriggerSummary,
  collectPlaybookTriggers,
  flattenSteps,
  getStepApproval,
  getStepPlainLanguage,
  summarizePlaybookTrigger,
  playbookHeroEyebrow,
  playbookKindLabel,
  stepApprovalLabel,
} from "./playbook-display";
import type { PlaybookStep } from "../playbooks/schema/v2/types";

describe("playbookKindLabel", () => {
  it("maps acting to Action", () => {
    expect(playbookKindLabel("acting")).toBe("Action");
  });

  it("maps profile to Capture", () => {
    expect(playbookKindLabel("profile")).toBe("Capture");
  });
});

describe("playbookHeroEyebrow", () => {
  it("shows Memory Care play for memory-care profile playbooks", () => {
    expect(playbookHeroEyebrow("profile", "memory-care")).toBe("Memory Care play");
  });

  it("falls back to kind label for non-care profile playbooks", () => {
    expect(playbookHeroEyebrow("profile", "billing")).toBe("Capture playbook");
  });

  it("shows Action playbook for acting playbooks", () => {
    expect(playbookHeroEyebrow("acting", "billing")).toBe("Action playbook");
  });
});

describe("blueprintTags", () => {
  it("returns Auto-runs only for profile playbooks", () => {
    expect(blueprintTags([], "profile")).toEqual(["Auto-runs"]);
  });

  it("returns Needs approval for acting playbooks with required actions", () => {
    expect(blueprintTags(["GMAIL_SEND_EMAIL"], "acting")).toEqual(["Needs approval"]);
  });
});

describe("getStepPlainLanguage", () => {
  it("never leaks the memory capability key — just 'Memory'", () => {
    const step = {
      step: "fetch",
      id: "invoice_context",
      from: "memory.billing_record_context",
    } as PlaybookStep;
    expect(getStepPlainLanguage(step).label).toBe(
      "Pulls invoice context from Memory"
    );
  });

  it("humanizes connector fetch sources without the capability slug", () => {
    const step = {
      step: "fetch",
      id: "open_invoices",
      from: "billing.read_invoices",
    } as PlaybookStep;
    expect(getStepPlainLanguage(step).label).toBe(
      "Pulls open invoices from your billing apps"
    );
  });

  it("never leaks raw branch expressions", () => {
    const step = {
      step: "branch",
      id: "maybe_remind",
      if: "verify_unpaid.text ~= 'VERDICT: PROCEED'",
      steps: [],
    } as unknown as PlaybookStep;
    const { label } = getStepPlainLanguage(step);
    expect(label).toBe("Decides whether to proceed");
    expect(label).not.toContain("verify_unpaid");
    expect(label).not.toContain("VERDICT");
  });

  it("keeps generic phrasing for branches without a condition", () => {
    const step = { step: "branch", steps: [] } as unknown as PlaybookStep;
    expect(getStepPlainLanguage(step).label).toBe("Decides what applies");
  });

  it("names the inbox for a Gmail draft step", () => {
    const step = {
      step: "action",
      id: "create_gmail_draft",
      tool: "GMAIL_CREATE_EMAIL_DRAFT",
    } as PlaybookStep;
    expect(getStepPlainLanguage(step).label).toBe("Writes the draft in Gmail");
  });

  it("names the inbox for a Gmail send step", () => {
    const step = {
      step: "action",
      id: "send_reminder",
      tool: "GMAIL_SEND_EMAIL",
    } as PlaybookStep;
    expect(getStepPlainLanguage(step).label).toBe("Sends the reminder from Gmail");
  });

  it("names Outlook when the resolved tool is the Outlook draft", () => {
    const step = {
      step: "action",
      id: "create_gmail_draft",
      tool: "GMAIL_CREATE_EMAIL_DRAFT",
    } as PlaybookStep;
    expect(
      getStepPlainLanguage(step, { resolvedTool: "OUTLOOK_CREATE_DRAFT" }).label
    ).toBe("Writes the draft in Outlook");
  });
});

describe("flattenSteps", () => {
  it("returns empty for undefined or empty steps", () => {
    expect(flattenSteps(undefined)).toEqual([]);
    expect(flattenSteps([])).toEqual([]);
  });

  it("emits the branch then its children at depth 1", () => {
    const fetch = { step: "fetch", id: "invoice_context", from: "memory.billing_record_context" } as PlaybookStep;
    const agent = {
      step: "agent",
      id: "verify_unpaid",
      prompt: "verify",
      tools: [],
    } as PlaybookStep;
    const classify = { step: "classify", id: "tier", rules: [] } as PlaybookStep;
    const draft = { step: "draft", id: "reminder_email", prompt: "write" } as PlaybookStep;
    const action = {
      step: "action",
      id: "create_gmail_draft",
      tool: "GMAIL_CREATE_EMAIL_DRAFT",
    } as PlaybookStep;
    const branch = {
      step: "branch",
      id: "maybe_remind",
      if: "verify_unpaid.text ~= 'VERDICT: PROCEED'",
      steps: [classify, draft, action],
    } as PlaybookStep;

    const flattened = flattenSteps([fetch, agent, branch]);
    expect(flattened.map((row) => ({
      id: "id" in row.step ? row.step.id : undefined,
      kind: row.step.step,
      depth: row.depth,
    }))).toEqual([
      { id: "invoice_context", kind: "fetch", depth: 0 },
      { id: "verify_unpaid", kind: "agent", depth: 0 },
      { id: "maybe_remind", kind: "branch", depth: 0 },
      { id: "tier", kind: "classify", depth: 1 },
      { id: "reminder_email", kind: "draft", depth: 1 },
      { id: "create_gmail_draft", kind: "action", depth: 1 },
    ]);
  });

  it("emits an empty branch as a single row", () => {
    const branch = { step: "branch", id: "maybe", steps: [] } as PlaybookStep;
    expect(flattenSteps([branch])).toEqual([{ step: branch, depth: 0 }]);
  });

  it("nests deeper branches at depth + 1", () => {
    const inner = { step: "draft", id: "inner", prompt: "x" } as PlaybookStep;
    const nested = { step: "branch", id: "inner_branch", steps: [inner] } as PlaybookStep;
    const outer = { step: "branch", id: "outer", steps: [nested] } as PlaybookStep;
    const flattened = flattenSteps([outer]);
    expect(flattened.map((row) => ({
      id: "id" in row.step ? row.step.id : undefined,
      depth: row.depth,
    }))).toEqual([
      { id: "outer", depth: 0 },
      { id: "inner_branch", depth: 1 },
      { id: "inner", depth: 2 },
    ]);
  });
});

describe("getPlaybookTriggerSignals", () => {
  it("reads a single-signal trigger", () => {
    expect(
      getPlaybookTriggerSignals({
        trigger: { type: "signal", signal: "billing_due_date_passed" },
      })
    ).toEqual(["billing_due_date_passed"]);
  });

  it("reads multi-signal triggers and dedupes across trigger and triggers", () => {
    expect(
      getPlaybookTriggerSignals({
        trigger: { type: "signal", signal: "email_classified_noise" },
        triggers: [
          { type: "signal", signals: ["email_classified_noise", "email_urgency_high"] },
          { type: "schedule", cron: "0 9 * * 1" },
        ],
      })
    ).toEqual(["email_classified_noise", "email_urgency_high"]);
  });

  it("returns empty for schedule-only playbooks", () => {
    expect(
      getPlaybookTriggerSignals({ trigger: { type: "schedule", cron: "0 9 * * 1" } })
    ).toEqual([]);
  });
});

describe("getPlaybookDataSources", () => {
  it("collects fetch sources including branch-nested steps", () => {
    expect(
      getPlaybookDataSources({
        steps: [
          { step: "fetch", id: "invoices", from: "billing.read_invoices" },
          { step: "classify", id: "tone", rules: [{ if: "true", then: "gentle" }] },
          {
            step: "branch",
            steps: [{ step: "fetch", id: "history", from: "billing.payment_history" }],
          },
        ],
      })
    ).toEqual(["billing.read_invoices", "billing.payment_history"]);
  });

  it("returns empty when there are no steps", () => {
    expect(getPlaybookDataSources({})).toEqual([]);
  });
});

describe("getPlaybookTriggerSummary", () => {
  it("uses the signal registry description for known signals", () => {
    expect(getPlaybookTriggerSummary("signal", "billing_due_date_passed")).toEqual({
      kind: "signal",
      text: "When due date has passed without full payment",
    });
  });

  it("falls back to a humanized key for unknown signals", () => {
    expect(getPlaybookTriggerSummary("signal", "some_future_signal")).toEqual({
      kind: "signal",
      text: "On signal: some future signal",
    });
  });

  it("humanizes daily and weekly cron schedules", () => {
    expect(getPlaybookTriggerSummary("schedule", "0 9 * * *").text).toBe(
      "Runs daily at 9:00 AM"
    );
    expect(getPlaybookTriggerSummary("schedule", "0 9 * * 1").text).toBe(
      "Runs every Monday at 9:00 AM"
    );
    expect(getPlaybookTriggerSummary("schedule", "30 17 * * 5").text).toBe(
      "Runs every Friday at 5:30 PM"
    );
  });

  it("passes through unrecognized cron patterns", () => {
    expect(getPlaybookTriggerSummary("schedule", "0 9 1 * *").text).toBe(
      "Runs on schedule `0 9 1 * *`"
    );
  });

  it("describes manual triggers", () => {
    expect(getPlaybookTriggerSummary("manual").text).toBe(
      "Manual — runs when you start it"
    );
  });
});

describe("collectPlaybookTriggers / summarizePlaybookTrigger", () => {
  it("collects trigger plus the triggers array", () => {
    expect(
      collectPlaybookTriggers({
        trigger: { type: "signal", signal: "billing_due_date_passed" },
        triggers: [{ type: "schedule", cron: "0 9 * * 1" }],
      })
    ).toHaveLength(2);
  });

  it("summarizes a record-condition trigger in plain language", () => {
    expect(
      summarizePlaybookTrigger({
        type: "record_condition",
        entity: "person",
        field: "relationshipType",
        op: "eq",
        value: "client",
      }).text
    ).toBe('When a person\'s relationship is "client"');
  });

  it("summarizes a signal trigger via the registry", () => {
    expect(
      summarizePlaybookTrigger({
        type: "signal",
        signal: "billing_due_date_passed",
      }).text
    ).toBe("When due date has passed without full payment");
  });
});

describe("getStepApproval / stepApprovalLabel", () => {
  const fetchStep: PlaybookStep = { step: "fetch", id: "x", from: "billing.read_invoices" };

  it("defaults non-action steps to auto", () => {
    expect(getStepApproval(fetchStep)).toBe("auto");
    expect(stepApprovalLabel("auto")).toBe("Auto-run");
  });

  it("treats an undeclared action step as trust-dial bounded", () => {
    const action: PlaybookStep = { step: "action", tool: "GMAIL_CREATE_EMAIL_DRAFT" };
    expect(getStepApproval(action)).toBe("trust_dial");
    expect(stepApprovalLabel("trust_dial")).toBe("Trust dial");
  });

  it("maps the deprecated needsApproval flag to ask", () => {
    const action: PlaybookStep = { step: "action", tool: "GMAIL_SEND_EMAIL", needsApproval: true };
    expect(getStepApproval(action)).toBe("ask");
    expect(stepApprovalLabel("ask")).toBe("Approve-only");
  });

  it("honors an explicit required gate on any step type", () => {
    const gated: PlaybookStep = { ...fetchStep, approval: "required" };
    expect(getStepApproval(gated)).toBe("required");
    expect(stepApprovalLabel("required")).toBe("Always asks");
  });
});
