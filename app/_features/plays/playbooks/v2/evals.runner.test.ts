/**
 * Playbook package evals — shared runner.
 *
 * Every v2 package may carry an `evals/` directory of scenario fixtures
 * (see v2/AUTHORING.md). Each scenario runs the package's definition through
 * the real executor with the vendor boundaries mocked:
 *
 *   given.memory  — fetchMemorySource payloads, keyed by memory capability
 *   given.fetch   — fetchMultipleByCategory data, keyed by fetch-step id
 *   given.agent   — agent-step final answers, in expected execution order
 *                   (optional whenPromptContains disambiguator)
 *   given.draft   — draft-step texts, same ordering rules
 *   given.settings — settings overrides (stamped as the workspace `value`)
 *
 *   expect.status        — success | paused | skipped | error
 *   expect.outputCount   — exact output count (0 = quiet skip)
 *   expect.reasonContains — substring of the run reason
 *   expect.steps         — per-step-id status assertions (branch children included)
 *
 * Behavior tests travel with the package; near-miss negatives (already-
 * reminded, partially-paid, no-email-on-file) are the point of the contract.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";

vi.mock("server-only", () => ({}));

/* ── Scenario fixtures ────────────────────────────────────────────────────── */

interface EvalResponse {
  step: string;
  whenPromptContains?: string;
  text: string;
}

interface EvalScenario {
  id: string;
  name: string;
  given?: {
    memory?: Record<string, unknown>;
    fetch?: Record<string, unknown>;
    agent?: EvalResponse[];
    draft?: EvalResponse[];
    settings?: Record<string, string | number | boolean>;
  };
  expect: {
    status: "success" | "paused" | "skipped" | "error";
    outputCount?: number;
    reasonContains?: string;
    /** Tool slug the run is parked on (paused runs only). */
    pausedOnTool?: string;
    steps?: Record<string, "success" | "paused" | "skipped" | "error">;
    /**
     * Each string must appear in at least one prompt sent to the LLM
     * boundary. This is how a scenario locks prompt-carried requirements
     * (e.g. a legal disclaimer instruction) against future definition
     * edits — the draft text is fixture-mocked, but the prompt is real.
     */
    promptIncludes?: string[];
  };
}

/** Mutable per-scenario state the boundary mocks read from. */
const scenarioState = {
  memory: {} as Record<string, unknown>,
  fetch: {} as Record<string, unknown>,
  agent: [] as Array<EvalResponse & { used: boolean }>,
  draft: [] as Array<EvalResponse & { used: boolean }>,
  /** Every prompt sent to the LLM boundary, in call order. */
  prompts: [] as string[],
};

function takeResponse(
  queue: Array<EvalResponse & { used: boolean }>,
  promptText: string
): (EvalResponse & { used: boolean }) | undefined {
  const exact = queue.find(
    (r) =>
      !r.used &&
      r.whenPromptContains !== undefined &&
      promptText.includes(r.whenPromptContains)
  );
  if (exact) {
    exact.used = true;
    return exact;
  }
  const next = queue.find((r) => !r.used && r.whenPromptContains === undefined);
  if (next) {
    next.used = true;
    return next;
  }
  return undefined;
}

function promptTextOf(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "string") return first;
  if (Array.isArray(first)) {
    return first
      .map((m) =>
        typeof m === "object" && m !== null && "content" in m
          ? String((m as { content: unknown }).content)
          : ""
      )
      .join("\n");
  }
  return "";
}

/* ── Boundary mocks (mirror executor.test.ts) ─────────────────────────────── */

vi.mock("@/app/_features/plays/playbooks/schema/v2/capture-fetch", () => ({
  isCaptureFetchCategory: (category: string) => category === "capture",
  fetchCaptureSource: vi.fn(),
}));

vi.mock("@/app/_features/plays/playbooks/schema/v2/memory-fetch", () => ({
  isMemoryFetchCategory: (category: string) => category === "memory",
  fetchMemorySource: vi.fn(
    async (_workspaceId: string, capability: string) =>
      scenarioState.memory[capability] ?? null
  ),
}));

vi.mock("@/app/_features/plays/services/execute-connector-tool", () => {
  class ConnectorUnavailableError extends Error {
    readonly provider: string;
    constructor(message: string, provider: string) {
      super(message);
      this.name = "ConnectorUnavailableError";
      this.provider = provider;
    }
  }
  return {
    executeConnectorTool: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    ConnectorUnavailableError,
  };
});

vi.mock("@/app/_features/plays/services/earned-autonomy", () => ({
  hasEarnedAutonomy: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/_lib/composio/category-fetcher", () => ({
  checkCategoryRequirements: vi.fn().mockResolvedValue({
    satisfied: true,
    missing: [],
    available: ["billing", "email"],
    optional: [],
  }),
  fetchMultipleByCategory: vi.fn(
    async (_workspaceId: string, requests: Array<{ id: string }>) => ({
      success: true,
      results: Object.fromEntries(
        requests.map((request) => [
          request.id,
          {
            id: request.id,
            success: true,
            data: scenarioState.fetch[request.id] ?? [],
          },
        ])
      ),
      errors: [],
    })
  ),
  getConnectedCategories: vi
    .fn()
    .mockResolvedValue([{ category: "billing" }, { category: "email" }]),
  getCategoryCapabilities: vi.fn().mockResolvedValue(["read_invoices"]),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          // Workspace trust dial: declared-auto steps execute, declared-ask
          // steps pause.
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { trust_level: "trust" }, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "eval-run-id" }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/app/_lib/composio/tool-policy", () => ({
  getComposioToolPolicy: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: vi.fn((...args: unknown[]) => {
    const promptText = promptTextOf(args);
    scenarioState.prompts.push(promptText);
    const response = takeResponse(scenarioState.draft, promptText);
    return Promise.resolve(response?.text ?? "draft text");
  }),
  sendLlmToolTurn: vi.fn((...args: unknown[]) => {
    const promptText = promptTextOf(args);
    scenarioState.prompts.push(promptText);
    const response = takeResponse(scenarioState.agent, promptText);
    const text = response?.text ?? "VERDICT: PROCEED — eval default";
    return Promise.resolve({
      text,
      toolCalls: [],
      assistantMessage: { role: "assistant", content: text },
    });
  }),
  committedSpend: vi
    .fn()
    .mockReturnValue({ kind: "workspace", origin: "committed" }),
}));

vi.mock("@/app/_features/plays/customize/prompt-block", () => ({
  buildPlaybookGuidancePromptBlock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/_lib/composio/capability-resolver", () => ({
  resolveCapabilityTool: vi.fn().mockResolvedValue(null),
  resolveCapabilityTools: vi.fn().mockResolvedValue([]),
  listCapabilityKeysForToolSlugs: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/app/_features/plays/services/app-selections", () => ({
  loadPlaybookAppSelections: vi.fn().mockResolvedValue(new Set<string>()),
  exclusionsFromSelections: () => new Set<string>(),
}));

/* ── Discovery ────────────────────────────────────────────────────────────── */

const V2_DIR = join(process.cwd(), "app/_features/plays/playbooks/v2");

interface PackageEval {
  section: string;
  slug: string;
  packageDir: string;
  scenarios: EvalScenario[];
}

function discoverPackageEvals(): PackageEval[] {
  const packages: PackageEval[] = [];
  if (!existsSync(V2_DIR)) return packages;

  for (const section of readdirSync(V2_DIR)) {
    const sectionDir = join(V2_DIR, section);
    if (!statSync(sectionDir).isDirectory()) continue;
    for (const slug of readdirSync(sectionDir)) {
      const packageDir = join(sectionDir, slug);
      if (!statSync(packageDir).isDirectory()) continue;
      const evalsDir = join(packageDir, "evals");
      if (!existsSync(evalsDir) || !statSync(evalsDir).isDirectory()) continue;

      const scenarios = readdirSync(evalsDir)
        .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
        .sort()
        .map(
          (file) =>
            yaml.parse(readFileSync(join(evalsDir, file), "utf8")) as EvalScenario
        );
      if (scenarios.length > 0) {
        packages.push({ section, slug, packageDir, scenarios });
      }
    }
  }
  return packages;
}

/* ── Runner ───────────────────────────────────────────────────────────────── */

import { parsePlaybookV2Yaml } from "../schema/v2/parser";
import type { PlaybookDefinitionV2 } from "../schema/v2/types";
import {
  executePlaybookV2,
  type ExecutionContextV2,
} from "../schema/v2/executor";

const packageEvals = discoverPackageEvals();

beforeEach(() => {
  scenarioState.memory = {};
  scenarioState.fetch = {};
  scenarioState.agent = [];
  scenarioState.draft = [];
  scenarioState.prompts = [];
});

describe("playbook package evals", () => {
  if (packageEvals.length === 0) {
    it("finds at least one package with evals", () => {
      expect(packageEvals.length).toBeGreaterThan(0);
    });
  }

  for (const pkg of packageEvals) {
    describe(`${pkg.section}/${pkg.slug}`, () => {
      const definitionPath = join(pkg.packageDir, "definition.yaml");
      const parsed = parsePlaybookV2Yaml(readFileSync(definitionPath, "utf8"));

      it("has a valid definition", () => {
        expect(parsed.validationErrors).toEqual([]);
        expect(parsed.definition).toBeDefined();
      });

      for (const scenario of pkg.scenarios) {
        it(`${scenario.id}: ${scenario.name}`, async () => {
          const definition = structuredClone(
            parsed.definition
          ) as PlaybookDefinitionV2;

          scenarioState.memory = { ...scenario.given?.memory };
          scenarioState.fetch = { ...scenario.given?.fetch };
          scenarioState.agent = (scenario.given?.agent ?? []).map((r) => ({
            ...r,
            used: false,
          }));
          scenarioState.draft = (scenario.given?.draft ?? []).map((r) => ({
            ...r,
            used: false,
          }));

          for (const [key, value] of Object.entries(
            scenario.given?.settings ?? {}
          )) {
            const field = definition.settings?.[key];
            if (!field) {
              throw new Error(
                `Eval "${scenario.id}" overrides unknown setting "${key}"`
              );
            }
            field.value = value;
          }

          const context: ExecutionContextV2 = {
            workspaceId: "eval-workspace",
            userId: "eval-user",
            triggeredBy: {
              type: "manual",
              entityId: "eval-entity",
              entitySurface: pkg.section,
            },
            connectedCategories: new Set(["billing", "email"]),
            connectedCapabilities: new Set(["read_invoices"]),
          };

          const result = await executePlaybookV2(definition, context);

          expect(
            result.status,
            `run status (reason: ${result.reason ?? "none"})`
          ).toBe(scenario.expect.status);

          if (scenario.expect.outputCount !== undefined) {
            expect(result.outputCount ?? 0).toBe(scenario.expect.outputCount);
          }
          if (scenario.expect.reasonContains !== undefined) {
            expect(result.reason ?? "").toContain(
              scenario.expect.reasonContains
            );
          }
          if (scenario.expect.pausedOnTool !== undefined) {
            expect(
              result.pausedAt?.toolSlug,
              "tool the run is paused on"
            ).toBe(scenario.expect.pausedOnTool);
          }
          for (const [stepId, status] of Object.entries(
            scenario.expect.steps ?? {}
          )) {
            const stepResult = result.stepResults.find(
              (r) => r.stepId === stepId
            );
            expect(
              stepResult?.status,
              `step "${stepId}" status`
            ).toBe(status);
          }

          for (const needle of scenario.expect.promptIncludes ?? []) {
            expect(
              scenarioState.prompts.some((p) => p.includes(needle)),
              `no LLM prompt contained: ${JSON.stringify(needle)}`
            ).toBe(true);
          }

          const unused = [...scenarioState.agent, ...scenarioState.draft]
            .filter((r) => !r.used)
            .map((r) => r.step);
          expect(
            unused,
            `scenario responses never consumed (step never ran?): ${unused.join(", ")}`
          ).toEqual([]);
        });
      }
    });
  }
});
