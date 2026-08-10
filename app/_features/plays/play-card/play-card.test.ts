import { describe, it, expect } from "vitest";
import type { FindingWithContext } from "@/app/_features/capture/types/intelligence-findings";
import type { PlayRunRow } from "../types";
import { validatePlayCard } from "./validate-play-card";
import { mapFindingToCard } from "./map-finding-to-card";
import { mapHandledFindingToCard } from "./map-handled-finding-to-card";
import { mapPlayRunToCard } from "./map-play-run-to-card";
import type { PlayCardViewModel } from "./types";

function baseVm(overrides: Partial<PlayCardViewModel> = {}): PlayCardViewModel {
  return {
    id: "vm-1",
    kind: "acting",
    playerSlug: "billing",
    playerName: "Billing",
    playbookName: "Project closeout",
    subject: "Send payment reminder",
    targetLabel: "Priya Shah",
    targetPrefix: "To",
    preview: "Soft reminder before escalation.",
    confidence: 96,
    stakes: null,
    ageMinutes: 75,
    triggerLabel: "From overdue invoice",
    channel: "Email",
    acting: { draftBody: ["Hi Priya"], recipientLabel: "Priya Shah" },
    primaryAction: { label: "Approve & send", kind: "approve_send" },
    canFlag: false,
    canSchedule: true,
    provenance: { source: "play_run", playRunId: "vm-1" },
    askSalt: { type: "play", id: "vm-1", title: "x", recipientLabel: "Priya Shah" },
    ...overrides,
  };
}

describe("validatePlayCard", () => {
  it("accepts a well-formed acting card", () => {
    expect(validatePlayCard(baseVm()).ok).toBe(true);
  });

  it("rejects a card with no subject", () => {
    const result = validatePlayCard(baseVm({ subject: "" }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("missing subject");
  });

  it("rejects an unknown relationship as a profile play", () => {
    const result = validatePlayCard(
      baseVm({
        kind: "profile",
        acting: undefined,
        profile: { field: "relationship_type", proposedValue: "unknown", because: null },
        primaryAction: null,
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown"))).toBe(true);
  });

  it("rejects internal kind names leaking into copy", () => {
    const result = validatePlayCard(baseVm({ subject: "This profile play is broken" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("internal kind name"))).toBe(true);
  });

  it("requires options for a question card", () => {
    const result = validatePlayCard(
      baseVm({
        kind: "question",
        acting: undefined,
        question: { field: "relationship_type", prompt: "How do you know them?", options: [] },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("question body requires options");
  });

  it("requires an outcome label for a handled card", () => {
    const result = validatePlayCard(
      baseVm({ mode: "handled", handled: { outcomeLabel: "", changeLine: null, handledAt: "x" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("handled card requires handled.outcomeLabel");
  });
});

describe("mapFindingToCard", () => {
  function finding(overrides: Partial<FindingWithContext> = {}): FindingWithContext {
    return {
      id: "f-1",
      workspace_id: "w-1",
      person_id: "person-1",
      org_id: null,
      finding_type: "needs_routing",
      title: "Mark Matheus Martins as Client",
      content: "People Records suggests Client based on recent signals.",
      evidence: {
        source_type: "email",
        metadata: {
          memory_care_profile: true,
          profile_field: "relationship_type",
          profile_value: "client",
          blueprint_slug: "memory-records",
          blueprint_name: "People Records",
          because: "Signed an SOW last week.",
        },
      },
      confidence: 90,
      state: "needs_you",
      triggered_plays: null,
      corrected_at: null,
      corrected_by: null,
      correction_reason: null,
      flagged_at: null,
      flagged_by: null,
      created_at: "2026-06-25T00:00:00Z",
      updated_at: "2026-06-25T00:00:00Z",
      person: { id: "person-1", name: "Matheus Martins", email: "m@example.com" },
      org: null,
      ...overrides,
    };
  }

  it("maps a Memory Care profile finding to a profile play (For prefix, memory_care apply)", () => {
    const vm = mapFindingToCard(finding());
    expect(vm.kind).toBe("profile");
    expect(vm.playerSlug).toBe("memory-care");
    expect(vm.playbookName).toBe("Memory Records");
    expect(vm.targetPrefix).toBe("For");
    expect(vm.profile?.field).toBe("relationship_type");
    expect(vm.profile?.proposedValue).toBe("client");
    expect(vm.provenance).toMatchObject({ source: "finding", apply: "memory_care" });
    expect(validatePlayCard(vm).ok).toBe(true);
  });

  it("maps a revenue finding to a risk play with an act/apply primary action", () => {
    const vm = mapFindingToCard(
      finding({
        finding_type: "revenue_closing",
        evidence: { source_type: "email", metadata: {} },
        title: "Ready to close with Cedar",
        content: "Send me the contract.",
      }),
    );
    expect(vm.kind).toBe("risk");
    expect(vm.playerSlug).toBe("client-risk");
    expect(vm.primaryAction?.kind).toBe("act");
    expect(validatePlayCard(vm).ok).toBe(true);
  });

  it("maps a relationship question finding to a question play with options", () => {
    const vm = mapFindingToCard(
      finding({
        title: "How do you know Matheus Martins?",
        content: "Salt couldn't tell client, prospect, partner, or vendor.",
        evidence: {
          source_type: "email",
          metadata: {
            memory_care_profile: true,
            memory_care_question: true,
            question_field: "relationship_type",
            question_options: [
              { value: "client", label: "Client" },
              { value: "prospect", label: "Prospect" },
            ],
            blueprint_name: "People Records",
          },
        },
      }),
    );
    expect(vm.kind).toBe("question");
    expect(vm.primaryAction).toBeNull();
    expect(vm.question?.options).toHaveLength(2);
    expect(vm.provenance).toMatchObject({ source: "finding", apply: "memory_care" });
    expect(validatePlayCard(vm).ok).toBe(true);
  });

  it("maps an auto-handled finding to a handled card with a change line and no primary action", () => {
    const vm = mapHandledFindingToCard(
      finding({
        state: "auto_handled",
        title: "Saved Client for Matheus Martins",
      }),
    );
    expect(vm.mode).toBe("handled");
    expect(vm.primaryAction).toBeNull();
    expect(vm.handled?.outcomeLabel).toBe("Saved Client for Matheus Martins");
    expect(vm.handled?.changeLine).toContain("relationship");
    expect(validatePlayCard(vm).ok).toBe(true);
  });
});

describe("mapPlayRunToCard", () => {
  function playRun(overrides: Partial<PlayRunRow> = {}): PlayRunRow {
    return {
      id: "pr-1",
      workspace_id: "w-1",
      player_id: null,
      prepared_by_player_id: null,
      template_id: null,
      opportunity_gap_id: null,
      owner_member_id: null,
      owner_team_id: null,
      space_id: null,
      target_type: "person",
      target_id: "person-1",
      target_label: "Priya Shah",
      state: "queued",
      title: "Send payment reminder",
      preview: "Invoice is 6 days past due.",
      recipient_label: "Priya Shah",
      channel: "Email",
      channels: null,
      draft_body: "Hi Priya,\n\nJust a reminder about the invoice.",
      confidence: 95,
      eta_label: null,
      scheduled_for: null,
      approved_at: null,
      ran_at: null,
      dismissed_at: null,
      last_error: null,
      metadata: {
        player_slug: "billing",
        playbook_name: "Project closeout",
        trigger_label: "From overdue invoice",
      },
      value_kind: null,
      value_amount: null,
      value_currency: null,
      value_basis: null,
      value_attributed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      player_slug: "billing",
      player_name: "Billing",
      ...overrides,
    };
  }

  it("maps an acting play_run with draft body to an acting card", () => {
    const vm = mapPlayRunToCard(playRun());
    expect(vm.kind).toBe("acting");
    expect(vm.playerSlug).toBe("billing");
    expect(vm.targetPrefix).toBe("To");
    expect(vm.primaryAction).toEqual({ label: "Approve & send", kind: "approve_send" });
    expect(vm.acting?.draftBody).toHaveLength(2);
    expect(vm.provenance).toEqual({ source: "play_run", playRunId: "pr-1" });
    expect(validatePlayCard(vm).ok).toBe(true);
  });

  it("maps a profile play_run with memory_care_profile metadata", () => {
    const vm = mapPlayRunToCard(
      playRun({
        id: "pr-2",
        draft_body: null,
        title: "Mark as Client",
        player_slug: "memory-care",
        player_name: "Memory",
        metadata: {
          player_slug: "memory-care",
          memory_care_profile: true,
          profile_field: "relationship_type",
          profile_value: "client",
          playbook_name: "People Records",
          primary_label: "Save as Client",
        },
      }),
    );
    expect(vm.kind).toBe("profile");
    expect(vm.playerSlug).toBe("memory-care");
    expect(vm.targetPrefix).toBe("For");
    expect(vm.profile?.field).toBe("relationship_type");
    expect(vm.profile?.proposedValue).toBe("client");
    expect(vm.primaryAction).toEqual({ label: "Save as Client", kind: "apply_memory" });
    expect(validatePlayCard(vm).ok).toBe(true);
  });

  it("maps a question play_run with options", () => {
    const vm = mapPlayRunToCard(
      playRun({
        id: "pr-3",
        draft_body: null,
        title: "How do you know Priya?",
        preview: "Salt couldn't determine the relationship.",
        player_slug: "memory-care",
        player_name: "Memory",
        metadata: {
          player_slug: "memory-care",
          memory_care_question: true,
          question_field: "relationship_type",
          question_options: [
            { value: "client", label: "Client" },
            { value: "prospect", label: "Prospect" },
            { value: "partner", label: "Partner" },
          ],
          playbook_name: "People Records",
        },
      }),
    );
    expect(vm.kind).toBe("question");
    expect(vm.playerSlug).toBe("memory-care");
    expect(vm.primaryAction).toBeNull();
    expect(vm.question?.options).toHaveLength(3);
    expect(vm.question?.field).toBe("relationship_type");
    expect(validatePlayCard(vm).ok).toBe(true);
  });
});
