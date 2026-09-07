#!/usr/bin/env tsx
/**
 * Validate v2 playbook packages (the authoring-lint half of the package
 * contract — see app/_features/plays/playbooks/v2/AUTHORING.md):
 *
 * Fatal:
 * - definition.yaml parses and passes schema + signal + record-condition
 *   validation (the real parser, validateSignals on)
 * - every declared/used tool slug exists in the Composio slug registry
 * - every {{settings.key}} interpolation references a declared setting
 * - every trigger `adjust` key references a declared setting
 * - instructions examples are well-formed (label + content)
 * - eval scenarios reference real step ids, settings, and capabilities
 *
 * Warnings (fatal with --strict):
 * - missing PLAYBOOK.md (author doc)
 * - missing evals/ directory or zero scenarios
 *
 * Live mode (--live): after static validation, checks every referenced tool
 * slug against the target environment's tool_classifications and warns when
 * a slug is disabled/rejected (drift — the 2026-09-03 GMAIL_SEND_EMAIL
 * incident) or has no classification row at all. Warn-only: live findings
 * never change the exit code, and the static result is unchanged when the
 * env vars are absent. Needs NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY (e.g. via `op run --env-file=.env.1password`).
 *
 * Usage: pnpm playbooks:validate [--strict] [--live]
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, relative } from "path";
import * as yaml from "yaml";
import { parsePlaybookV2Yaml } from "@/app/_features/plays/playbooks/schema/v2/parser";
import type {
  PlaybookDefinitionV2,
  PlaybookStep,
} from "@/app/_features/plays/playbooks/schema/v2/types";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";

const V2_DIR = join(process.cwd(), "app/_features/plays/playbooks/v2");
const STRICT = process.argv.includes("--strict");
const LIVE = process.argv.includes("--live");

const VALID_TOOL_SLUGS = new Set(Object.values(COMPOSIO_TOOL_SLUGS));

/** Populated by main(); read by the --live classification check. */
const reports: PackageReport[] = [];

interface PackageReport {
  path: string;
  errors: string[];
  warnings: string[];
  /** Tool slugs the definition can reach (populated when parse succeeds). */
  toolSlugs?: Set<string>;
}

/** All step ids, branch children included. */
function collectStepIds(steps: PlaybookStep[] | undefined): Set<string> {
  const ids = new Set<string>();
  const walk = (list: PlaybookStep[] | undefined) => {
    for (const step of list ?? []) {
      if ("id" in step && typeof step.id === "string") ids.add(step.id);
      if (step.step === "branch") walk(step.steps);
    }
  };
  walk(steps);
  return ids;
}

/** Every tool slug the definition can reach: allowlist + action/agent steps. */
function collectToolSlugs(definition: PlaybookDefinitionV2): Set<string> {
  const slugs = new Set<string>(definition.tools ?? []);
  const walk = (list: PlaybookStep[] | undefined) => {
    for (const step of list ?? []) {
      if (step.step === "action") slugs.add(step.tool);
      if (step.step === "agent") step.tools.forEach((t) => slugs.add(t));
      if (step.step === "branch") walk(step.steps);
    }
  };
  walk(definition.steps);
  return slugs;
}

/** Memory capabilities the package's fetch steps actually use. */
function collectMemoryCapabilities(definition: PlaybookDefinitionV2): Set<string> {
  const capabilities = new Set<string>();
  const walk = (list: PlaybookStep[] | undefined) => {
    for (const step of list ?? []) {
      if (step.step === "fetch" && step.from.startsWith("memory.")) {
        capabilities.add(step.from.slice("memory.".length));
      }
      if (step.step === "branch") walk(step.steps);
    }
  };
  walk(definition.steps);
  return capabilities;
}

function stepIdsByKind(
  definition: PlaybookDefinitionV2,
  kind: "agent" | "draft"
): Set<string> {
  const ids = new Set<string>();
  const walk = (list: PlaybookStep[] | undefined) => {
    for (const step of list ?? []) {
      if (step.step === kind && "id" in step && typeof step.id === "string") {
        ids.add(step.id);
      }
      if (step.step === "branch") walk(step.steps);
    }
  };
  walk(definition.steps);
  return ids;
}

const SETTINGS_REF_PATTERN = /\{\{\s*settings\.([a-zA-Z0-9_]+)\s*\}\}/g;

function validateDefinition(
  definition: PlaybookDefinitionV2,
  report: PackageReport
): void {
  // Tool slugs must exist in the verified Composio registry.
  for (const slug of collectToolSlugs(definition)) {
    if (!VALID_TOOL_SLUGS.has(slug)) {
      report.errors.push(
        `unknown tool slug "${slug}" — not in app/_lib/composio/tool-slugs.ts`
      );
    }
  }

  const settingsKeys = new Set(Object.keys(definition.settings ?? {}));

  // {{settings.key}} interpolations must reference declared settings.
  const serialized = JSON.stringify({
    steps: definition.steps ?? [],
    instructions: definition.instructions ?? {},
  });
  for (const match of serialized.matchAll(SETTINGS_REF_PATTERN)) {
    if (!settingsKeys.has(match[1])) {
      report.errors.push(
        `{{settings.${match[1]}}} referenced but not declared in settings`
      );
    }
  }

  // Trigger adjust keys must reference declared settings.
  const triggers = [
    ...(definition.trigger ? [definition.trigger] : []),
    ...(definition.triggers ?? []),
  ];
  for (const trigger of triggers) {
    for (const key of "adjust" in trigger ? (trigger.adjust ?? []) : []) {
      if (!settingsKeys.has(key)) {
        report.errors.push(
          `trigger adjust key "${key}" not declared in settings`
        );
      }
    }
  }

  // Instructions examples: label + content, both non-empty.
  for (const [index, example] of (
    definition.instructions?.examples ?? []
  ).entries()) {
    if (!example.label?.trim() || !example.content?.trim()) {
      report.errors.push(
        `instructions.examples[${index}] needs a non-empty label and content`
      );
    }
  }
}

interface EvalScenarioFile {
  id?: string;
  name?: string;
  given?: {
    memory?: Record<string, unknown>;
    fetch?: Record<string, unknown>;
    agent?: Array<{ step?: string; text?: string }>;
    draft?: Array<{ step?: string; text?: string }>;
    settings?: Record<string, unknown>;
  };
  expect?: { status?: string };
}

function validateEvals(
  packageDir: string,
  definition: PlaybookDefinitionV2,
  report: PackageReport
): void {
  const evalsDir = join(packageDir, "evals");
  if (!existsSync(evalsDir) || !statSync(evalsDir).isDirectory()) {
    report.warnings.push("no evals/ directory — add at least one scenario");
    return;
  }

  const files = readdirSync(evalsDir).filter(
    (file) => file.endsWith(".yaml") || file.endsWith(".yml")
  );
  if (files.length === 0) {
    report.warnings.push("evals/ has no scenarios");
    return;
  }

  const stepIds = collectStepIds(definition.steps);
  const settingsKeys = new Set(Object.keys(definition.settings ?? {}));
  const memoryCapabilities = collectMemoryCapabilities(definition);
  const agentStepIds = stepIdsByKind(definition, "agent");
  const draftStepIds = stepIdsByKind(definition, "draft");
  const seenIds = new Set<string>();

  for (const file of files) {
    let scenario: EvalScenarioFile;
    try {
      scenario = yaml.parse(readFileSync(join(evalsDir, file), "utf8")) as EvalScenarioFile;
    } catch (error) {
      report.errors.push(
        `evals/${file}: unparseable YAML (${error instanceof Error ? error.message : String(error)})`
      );
      continue;
    }

    if (!scenario?.id || !scenario.name || !scenario.expect?.status) {
      report.errors.push(`evals/${file}: needs id, name, and expect.status`);
      continue;
    }
    if (seenIds.has(scenario.id)) {
      report.errors.push(`evals/${file}: duplicate scenario id "${scenario.id}"`);
    }
    seenIds.add(scenario.id);

    for (const stepId of Object.keys(scenario.given?.fetch ?? {})) {
      if (!stepIds.has(stepId)) {
        report.errors.push(
          `evals/${file}: given.fetch references unknown step "${stepId}"`
        );
      }
    }
    for (const capability of Object.keys(scenario.given?.memory ?? {})) {
      if (!memoryCapabilities.has(capability)) {
        report.errors.push(
          `evals/${file}: given.memory references capability "${capability}" — no memory fetch step uses it`
        );
      }
    }
    for (const response of scenario.given?.agent ?? []) {
      if (!response.step || !agentStepIds.has(response.step)) {
        report.errors.push(
          `evals/${file}: given.agent references unknown agent step "${response.step}"`
        );
      }
      if (!response.text) {
        report.errors.push(`evals/${file}: agent response for "${response.step}" has no text`);
      }
    }
    for (const response of scenario.given?.draft ?? []) {
      if (!response.step || !draftStepIds.has(response.step)) {
        report.errors.push(
          `evals/${file}: given.draft references unknown draft step "${response.step}"`
        );
      }
    }
    for (const key of Object.keys(scenario.given?.settings ?? {})) {
      if (!settingsKeys.has(key)) {
        report.errors.push(
          `evals/${file}: given.settings references undeclared setting "${key}"`
        );
      }
    }
    for (const stepId of Object.keys(
      (scenario.expect as { steps?: Record<string, string> } | undefined)?.steps ?? {}
    )) {
      if (!stepIds.has(stepId)) {
        report.errors.push(
          `evals/${file}: expect.steps references unknown step "${stepId}"`
        );
      }
    }
  }
}

function main(): void {
  if (!existsSync(V2_DIR)) {
    console.error(`Playbooks directory not found: ${V2_DIR}`);
    process.exit(1);
  }

  for (const section of readdirSync(V2_DIR)) {
    const sectionDir = join(V2_DIR, section);
    if (!statSync(sectionDir).isDirectory()) continue;

    for (const entry of readdirSync(sectionDir)) {
      const entryPath = join(sectionDir, entry);

      // Single-file playbooks: parse-only validation. `_section.yaml` is
      // section metadata, not a playbook.
      if (entry.endsWith(".yaml") && !entry.startsWith("_") && statSync(entryPath).isFile()) {
        const report: PackageReport = {
          path: relative(process.cwd(), entryPath),
          errors: [],
          warnings: [],
        };
        const parsed = parsePlaybookV2Yaml(readFileSync(entryPath, "utf8"));
        for (const error of parsed.validationErrors) {
          report.errors.push(`${error.path}: ${error.message}`);
        }
        if (parsed.definition) {
          validateDefinition(parsed.definition, report);
          report.toolSlugs = collectToolSlugs(parsed.definition);
        }
        reports.push(report);
        continue;
      }

      // Package directories.
      if (!statSync(entryPath).isDirectory()) continue;
      const definitionPath = join(entryPath, "definition.yaml");
      if (!existsSync(definitionPath)) continue;

      const report: PackageReport = {
        path: relative(process.cwd(), entryPath),
        errors: [],
        warnings: [],
      };

      const parsed = parsePlaybookV2Yaml(readFileSync(definitionPath, "utf8"));
      for (const error of parsed.validationErrors) {
        report.errors.push(`${error.path}: ${error.message}`);
      }

      if (parsed.definition) {
        validateDefinition(parsed.definition, report);
        validateEvals(entryPath, parsed.definition, report);
        report.toolSlugs = collectToolSlugs(parsed.definition);
      }

      if (!existsSync(join(entryPath, "PLAYBOOK.md"))) {
        report.warnings.push("no PLAYBOOK.md author doc");
      }

      reports.push(report);
    }
  }

  let errorCount = 0;
  let warningCount = 0;
  for (const report of reports) {
    if (report.errors.length === 0 && report.warnings.length === 0) continue;
    console.log(`\n${report.path}`);
    for (const error of report.errors) {
      console.log(`  ✗ ${error}`);
      errorCount++;
    }
    for (const warning of report.warnings) {
      console.log(`  ⚠ ${warning}`);
      warningCount++;
    }
  }

  console.log(
    `\n${reports.length} playbooks checked — ${errorCount} error(s), ${warningCount} warning(s)${STRICT ? " (strict)" : ""}`
  );

  if (errorCount > 0 || (STRICT && warningCount > 0)) {
    process.exit(1);
  }
}

/**
 * --live: warn when a referenced tool is disabled/rejected (drift) or has no
 * classification row in the target environment. Warn-only by design — a
 * drift-disable is a runtime state, not an authoring error, and CI must not
 * go red because upstream changed a schema overnight.
 */
async function checkLiveClassifications(reports: PackageReport[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log(
      "\n--live skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"
    );
    return;
  }

  const slugToPaths = new Map<string, string[]>();
  for (const report of reports) {
    for (const slug of report.toolSlugs ?? []) {
      const paths = slugToPaths.get(slug) ?? [];
      paths.push(report.path);
      slugToPaths.set(slug, paths);
    }
  }
  if (slugToPaths.size === 0) return;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tool_classifications")
    .select("tool_slug, status")
    .in("tool_slug", [...slugToPaths.keys()]);

  if (error) {
    console.log(`\n--live lookup failed (warn-only): ${error.message}`);
    return;
  }

  const statusBySlug = new Map(
    (data ?? []).map((row) => [row.tool_slug as string, row.status as string])
  );

  let findings = 0;
  for (const [slug, paths] of slugToPaths) {
    const status = statusBySlug.get(slug);
    if (status === "approved") continue;
    findings++;
    const label =
      status === "disabled" || status === "rejected"
        ? `${slug} is ${status} (pending security re-review)`
        : status
          ? `${slug} has status "${status}"`
          : `${slug} has no classification row`;
    console.log(`\n  ⚠ ${label}`);
    for (const path of paths) {
      console.log(`      used by ${path}`);
    }
  }

  console.log(
    findings === 0
      ? "\n--live: every referenced tool is approved in the target environment"
      : `\n--live: ${findings} tool(s) not approved in the target environment (warn-only)`
  );
}

main();
if (LIVE) {
  checkLiveClassifications(reports).catch((error) => {
    console.log(
      `\n--live check failed (warn-only): ${error instanceof Error ? error.message : String(error)}`
    );
  });
}

