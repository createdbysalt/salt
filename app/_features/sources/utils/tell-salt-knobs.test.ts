import { describe, expect, it } from "vitest";
import {
  parseTellSaltLlmPayload,
  previewForKnob,
  type TellSaltKnob,
} from "./tell-salt-knobs";

/**
 * Tell Salt knobs (S2): the LLM payload is validated against the area
 * vocabulary before anything reaches the confirm gate, and the preview
 * sentence is generated from the validated knob — never from model prose.
 */

const EMAIL_VOCAB = ["sender_email", "domain", "sender_pattern", "subject_pattern"] as const;

describe("parseTellSaltLlmPayload", () => {
  it("parses a compiled rule knob", () => {
    const outcome = parseTellSaltLlmPayload(
      JSON.stringify({
        outcome: "compiled",
        knobs: [
          {
            kind: "connector_rule",
            ruleType: "deny",
            entityType: "domain",
            entityKey: "spammy-agency.com",
          },
        ],
      }),
      EMAIL_VOCAB,
    );
    expect(outcome).toEqual({
      outcome: "compiled",
      knobs: [
        {
          kind: "connector_rule",
          ruleType: "deny",
          entityType: "domain",
          entityKey: "spammy-agency.com",
          provider: null,
        },
      ],
    });
  });

  it("parses a gate policy knob", () => {
    const outcome = parseTellSaltLlmPayload(
      JSON.stringify({
        outcome: "compiled",
        knobs: [
          { kind: "gate_policy", setting: "strangers", value: "dropped" },
        ],
      }),
      EMAIL_VOCAB,
    );
    expect(outcome).toEqual({
      outcome: "compiled",
      knobs: [{ kind: "gate_policy", setting: "strangers", value: "dropped" }],
    });
  });

  it("parses a reroute to the Memory doc", () => {
    const outcome = parseTellSaltLlmPayload(
      JSON.stringify({
        outcome: "rerouted",
        target: "memory",
        message: "That's something I should remember about your people.",
      }),
      EMAIL_VOCAB,
    );
    expect(outcome).toEqual({
      outcome: "rerouted",
      target: "memory",
      message: "That's something I should remember about your people.",
    });
  });

  it("parses a refusal", () => {
    const outcome = parseTellSaltLlmPayload(
      JSON.stringify({ outcome: "refused", message: "I can't do that yet." }),
      EMAIL_VOCAB,
    );
    expect(outcome).toMatchObject({ outcome: "refused" });
  });

  it("rejects a rule knob outside the area vocabulary", () => {
    const outcome = parseTellSaltLlmPayload(
      JSON.stringify({
        outcome: "compiled",
        knobs: [
          {
            kind: "connector_rule",
            ruleType: "deny",
            entityType: "channel",
            entityKey: "general",
          },
        ],
      }),
      EMAIL_VOCAB,
    );
    expect(outcome).toBeNull();
  });

  it("rejects malformed JSON and shape violations", () => {
    expect(parseTellSaltLlmPayload("not json", EMAIL_VOCAB)).toBeNull();
    expect(parseTellSaltLlmPayload("{}", EMAIL_VOCAB)).toBeNull();
    expect(
      parseTellSaltLlmPayload(
        JSON.stringify({ outcome: "compiled", knobs: [] }),
        EMAIL_VOCAB,
      ),
    ).toBeNull();
    expect(
      parseTellSaltLlmPayload(
        JSON.stringify({
          outcome: "compiled",
          knobs: [
            {
              kind: "connector_rule",
              ruleType: "deny",
              entityType: "sender_email",
              entityKey: "",
            },
          ],
        }),
        EMAIL_VOCAB,
      ),
    ).toBeNull();
  });

  it("rejects an unknown gate policy value", () => {
    expect(
      parseTellSaltLlmPayload(
        JSON.stringify({
          outcome: "compiled",
          knobs: [
            { kind: "gate_policy", setting: "strangers", value: "archived" },
          ],
        }),
        EMAIL_VOCAB,
      ),
    ).toBeNull();
  });
});

describe("previewForKnob", () => {
  it("deny domain", () => {
    const knob: TellSaltKnob = {
      kind: "connector_rule",
      ruleType: "deny",
      entityType: "domain",
      entityKey: "spammy-agency.com",
      provider: null,
    };
    expect(previewForKnob(knob)).toBe(
      "I'll keep out anything from spammy-agency.com.",
    );
  });

  it("allow sender", () => {
    const knob: TellSaltKnob = {
      kind: "connector_rule",
      ruleType: "allow",
      entityType: "sender_email",
      entityKey: "vip@acme.com",
      provider: "gmail",
    };
    expect(previewForKnob(knob)).toBe("I'll always let in mail from vip@acme.com.");
  });

  it("deny subject pattern", () => {
    const knob: TellSaltKnob = {
      kind: "connector_rule",
      ruleType: "deny",
      entityType: "subject_pattern",
      entityKey: "*invoice*",
      provider: null,
    };
    expect(previewForKnob(knob)).toBe(
      "I'll keep out mail with subjects matching *invoice*.",
    );
  });

  it("deny attendee", () => {
    const knob: TellSaltKnob = {
      kind: "connector_rule",
      ruleType: "deny",
      entityType: "attendee",
      entityKey: "bob@acme.com",
      provider: null,
    };
    expect(previewForKnob(knob)).toBe("I'll keep out events with bob@acme.com.");
  });

  it("gate policy choices", () => {
    expect(
      previewForKnob({
        kind: "gate_policy",
        setting: "automated_senders",
        value: "watched",
      }),
    ).toBe(
      "I'll watch automated senders (receipts, notifications) instead of dropping them.",
    );
    expect(
      previewForKnob({ kind: "gate_policy", setting: "strangers", value: "dropped" }),
    ).toBe("I'll drop mail from people you don't know before anything is stored.");
  });

  it("never uses banned words in previews", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    const knobs: TellSaltKnob[] = [
      { kind: "connector_rule", ruleType: "deny", entityType: "sender_email", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "allow", entityType: "domain", entityKey: "b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "sender_pattern", entityKey: "*news*", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "subject_pattern", entityKey: "*inv*", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "channel", entityKey: "general", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "author", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "keyword", entityKey: "*unsub*", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "organizer", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "attendee", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "title_pattern", entityKey: "*lunch*", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "customer", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "owner", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "name_pattern", entityKey: "*tmp*", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "contact", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "host", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "participant", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "assignee", entityKey: "a@b.com", provider: null },
      { kind: "connector_rule", ruleType: "deny", entityType: "project", entityKey: "alpha", provider: null },
      { kind: "gate_policy", setting: "automated_senders", value: "dropped" },
      { kind: "gate_policy", setting: "automated_senders", value: "watched" },
      { kind: "gate_policy", setting: "automated_senders", value: "let_in" },
      { kind: "gate_policy", setting: "strangers", value: "watched" },
      { kind: "gate_policy", setting: "strangers", value: "let_in" },
      { kind: "gate_policy", setting: "strangers", value: "dropped" },
    ];
    for (const knob of knobs) {
      expect(previewForKnob(knob), JSON.stringify(knob)).not.toMatch(banned);
    }
  });
});
