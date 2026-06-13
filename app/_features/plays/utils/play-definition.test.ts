import { describe, expect, it } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import { getComposioToolPolicy } from "@/app/_lib/composio/tool-policy";
import {
  definitionHasActingSteps,
  evaluateGuard,
  interpolateParams,
  renderTemplate,
  resolvePath,
  validatePlayDefinition,
} from "./play-definition";

const READ_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES;
const MUTATING_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT;
const DESTRUCTIVE_TOOL = COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT;

describe("tool-policy assumptions", () => {
  it("uses slugs whose risk classes match the test setup", () => {
    expect(getComposioToolPolicy(READ_TOOL)?.risk).toBe("read");
    expect(getComposioToolPolicy(MUTATING_TOOL)?.risk).toBe("mutating");
    expect(getComposioToolPolicy(DESTRUCTIVE_TOOL)?.risk).toBe("destructive");
  });
});

describe("validatePlayDefinition", () => {
  const validDefinition = {
    version: 1,
    steps: [
      { kind: "fetch", tool: READ_TOOL, params: { max_results: 5 }, bind: "thread" },
      { kind: "guard", path: "thread.days_since_reply", op: "gte", value: 7 },
      { kind: "render", template: "Hi {{run.recipient_label}}", bind: "body" },
      { kind: "act", tool: MUTATING_TOOL, params: { body: "{{body}}" } },
    ],
    value: { kind: "gap_closed", fromGap: true },
  };

  it("accepts a valid definition and derives requiredActions from mutating act slugs", () => {
    const result = validatePlayDefinition(validDefinition);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requiredActions).toEqual([MUTATING_TOOL]);
    expect(definitionHasActingSteps(result.definition)).toBe(true);
  });

  it("rejects destructive act tools at definition time", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "act", tool: DESTRUCTIVE_TOOL, params: {} }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/destructive/);
  });

  it("rejects non-allowlisted tools", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "act", tool: "TOTALLY_FAKE_TOOL", params: {} }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/not allowlisted/);
  });

  it("rejects mutating tools in fetch steps", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "fetch", tool: MUTATING_TOOL, params: {}, bind: "x" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/may only read/);
  });

  it("rejects guards that compare without a value", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "guard", path: "thread.count", op: "gte" }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects binds that shadow reserved names", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "fetch", tool: READ_TOOL, params: {}, bind: "run" }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects value models with neither amount nor fromGap", () => {
    const result = validatePlayDefinition({
      version: 1,
      steps: [{ kind: "act", tool: MUTATING_TOOL, params: {} }],
      value: { kind: "time_saved" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("context helpers", () => {
  const context = {
    run: { recipient_label: "Maya", confidence: 92 },
    thread: { days_since_reply: 9, sender: { name: "Maya Chen" } },
  };

  it("resolves nested paths and returns undefined for missing ones", () => {
    expect(resolvePath(context, "thread.sender.name")).toBe("Maya Chen");
    expect(resolvePath(context, "thread.missing.deep")).toBeUndefined();
  });

  it("evaluates comparison guards", () => {
    expect(
      evaluateGuard({ kind: "guard", path: "thread.days_since_reply", op: "gte", value: 7 }, context),
    ).toBe(true);
    expect(
      evaluateGuard({ kind: "guard", path: "thread.days_since_reply", op: "lt", value: 7 }, context),
    ).toBe(false);
  });

  it("fails closed when a guarded path is missing", () => {
    expect(
      evaluateGuard({ kind: "guard", path: "thread.nope", op: "gte", value: 1 }, context),
    ).toBe(false);
    expect(evaluateGuard({ kind: "guard", path: "thread.nope", op: "not_exists" }, context)).toBe(
      true,
    );
  });

  it("renders templates and throws on unknown paths", () => {
    expect(renderTemplate("Hi {{run.recipient_label}}!", context)).toBe("Hi Maya!");
    expect(() => renderTemplate("Hi {{run.missing}}", context)).toThrow(
      /Unknown template path/,
    );
  });

  it("interpolates params, preserving raw values for exact placeholders", () => {
    const params = interpolateParams(
      {
        confidence: "{{run.confidence}}",
        subject: "Following up, {{run.recipient_label}}",
        nested: { who: "{{thread.sender.name}}" },
      },
      context,
    );
    expect(params.confidence).toBe(92);
    expect(params.subject).toBe("Following up, Maya");
    expect((params.nested as Record<string, unknown>).who).toBe("Maya Chen");
  });
});
