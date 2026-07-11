import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Single-gate invariant (connector-platform 5.5.1): Ask Salt, plays, and
 * background jobs all execute Composio tools through executeComposioAction —
 * no separate chat execution path, ever. actions.ts is the only module
 * allowed to touch the raw Composio execute API.
 */

const ROOT = process.cwd();

const CHAT_SURFACE_FILES = [
  "app/api/ask-salt/chat/route.ts",
  "app/_lib/composio/ask-salt-tools.ts",
  "app/_lib/composio/load-ask-salt-tools.ts",
  "app/_lib/composio/ask-salt-capabilities.ts",
  "app/_lib/composio/agent.ts",
  "app/_features/ask-salt/connector-discovery-tools.ts",
];

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8");
}

describe("single-gate invariant (5.5.1)", () => {
  it("chat surface never calls the raw Composio execute API", () => {
    for (const file of CHAT_SURFACE_FILES) {
      const source = read(file);
      expect(
        source.includes(".tools.execute("),
        `${file} must not call composio.tools.execute directly`,
      ).toBe(false);
      expect(
        source.includes("getComposioClient()"),
        `${file} must not construct the raw Composio client`,
      ).toBe(false);
    }
  });

  it("the ask-salt tool wrapper executes through executeComposioAction", () => {
    const wrapper = read("app/_lib/composio/ask-salt-tools.ts");
    expect(wrapper).toContain('import { executeComposioAction } from "./actions"');
    expect(wrapper).toContain("executeComposioAction<");
  });

  it("the generic connector executor routes through the gate", () => {
    const discovery = read("app/_features/ask-salt/connector-discovery-tools.ts");
    expect(discovery).toContain("executeComposioAction");
    expect(discovery.includes(".tools.execute(")).toBe(false);
  });

  it("only actions.ts touches the raw execute API in the composio lib", () => {
    const gate = read("app/_lib/composio/actions.ts");
    expect(gate).toContain("getComposioClient().tools.execute(");
  });

  it("play executor routes tool execution through the gate (5.5.1 parity)", () => {
    const deps = read("app/_features/plays/services/run-play-deps.ts");
    expect(deps).toContain('import { executeComposioAction } from "@/app/_lib/composio/actions"');
    expect(deps).toContain("executeComposioAction(");
    expect(deps.includes(".tools.execute(")).toBe(false);
    expect(deps.includes("getComposioClient()")).toBe(false);
  });
});
