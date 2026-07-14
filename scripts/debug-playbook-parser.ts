#!/usr/bin/env npx tsx
/**
 * Debug Playbook Parser (uses actual Zod schemas)
 *
 * Run: pnpm tsx scripts/debug-playbook-parser.ts
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import * as yaml from "yaml";
import { z } from "zod";

// Copy the schemas inline to avoid import issues with server-only
const PlaybookSectionSchema = z.enum([
  "relationships",
  "work",
  "billing",
  "files",
  "meetings",
  "me",
  "connections",
  "notes",
  "communication",
  "_meta",
]);

const PlaybookLayerSchema = z.enum(["learn", "act"]);

const PlaybookSignalTriggerSingleSchema = z.object({
  type: z.literal("signal"),
  signal: z.string().min(1),
  surface: z.string().optional(),
});

const PlaybookSignalTriggerMultiSchema = z.object({
  type: z.literal("signal"),
  signals: z.array(z.string().min(1)).min(1),
  surface: z.string().optional(),
});

const PlaybookScheduleTriggerSchema = z.object({
  type: z.literal("schedule"),
  cron: z.string().regex(/^[\d\s*,/-]+$/, "Invalid cron expression"),
  timezone: z.string().optional(),
});

const PlaybookManualTriggerSchema = z.object({
  type: z.literal("manual"),
});

const PlaybookTriggerSchema = z.union([
  PlaybookSignalTriggerSingleSchema,
  PlaybookSignalTriggerMultiSchema,
  PlaybookScheduleTriggerSchema,
  PlaybookManualTriggerSchema,
]);

const PlaybookOutputTypeSchema = z.enum([
  "email_draft",
  "notification",
  "memory_update",
  "finding",
  "briefing",
]);

const PlaybookApprovalModeSchema = z.enum(["none", "per_entity", "batch"]);

const PlaybookOutputSchema = z.object({
  type: PlaybookOutputTypeSchema,
  approval: PlaybookApprovalModeSchema.optional(),
});

const PlaybookStepSchema = z.object({
  step: z.string(),
}).passthrough();

const PlaybookDefinitionV2Schema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(500),
  section: PlaybookSectionSchema,
  layer: PlaybookLayerSchema,
  template: z.boolean().optional(),
  trigger: PlaybookTriggerSchema.optional(),
  triggers: z.array(PlaybookTriggerSchema).optional(),
  requirements: z.any().optional(),
  output: PlaybookOutputSchema,
  value: z.any().optional(),
  policy: z.any().optional(),
  voice: z.string().regex(/^[a-z0-9-]+$/).optional(),
  steps: z.array(PlaybookStepSchema).optional(),
  instructions: z.any().optional(),
}).refine(
  (data) => data.trigger || (data.triggers && data.triggers.length > 0),
  { message: "Playbook must have either 'trigger' or 'triggers' defined", path: ["trigger"] }
).refine(
  (data) => data.layer !== "act" || data.steps?.length || data.instructions,
  { message: "Action playbooks must have steps or instructions", path: ["steps"] }
);

const SectionFileSchema = z.object({
  name: z.string().min(1).max(50),
  slug: PlaybookSectionSchema,
  description: z.string().min(1).max(200),
  icon: z.string().min(1),
  memory_types: z.array(z.string()),
  signals: z.array(z.string()),
  templates: z.array(z.string()).optional(),
});

const V2_PLAYBOOKS_DIR = join(process.cwd(), "app/_features/plays/playbooks/v2");

console.log("=== Playbook Parser Debug (with Zod) ===\n");

const section = "communication";
const sectionDir = join(V2_PLAYBOOKS_DIR, section);
const sectionFile = join(sectionDir, "_section.yaml");

// Parse section file
console.log(`Parsing ${section}/_section.yaml...`);
const sectionContent = readFileSync(sectionFile, "utf-8");
const sectionParsed = yaml.parse(sectionContent);
const sectionResult = SectionFileSchema.safeParse(sectionParsed);

if (!sectionResult.success) {
  console.log("❌ _section.yaml FAILED:");
  console.log(JSON.stringify(sectionResult.error.issues, null, 2));
  process.exit(1);
} else {
  console.log("✓ _section.yaml valid\n");
}

// Parse each playbook
const entries = readdirSync(sectionDir).filter(e => e !== "_section.yaml");

for (const entry of entries) {
  const entryPath = join(sectionDir, entry);
  const stat = statSync(entryPath);

  if (!stat.isDirectory()) continue;

  const definitionPath = join(entryPath, "definition.yaml");
  if (!existsSync(definitionPath)) {
    console.log(`❌ ${entry}: no definition.yaml`);
    continue;
  }

  console.log(`Parsing ${entry}/definition.yaml...`);
  const content = readFileSync(definitionPath, "utf-8");

  try {
    const parsed = yaml.parse(content);
    const result = PlaybookDefinitionV2Schema.safeParse(parsed);

    if (!result.success) {
      console.log(`❌ ${entry} FAILED:`);
      for (const issue of result.error.issues) {
        console.log(`   - ${issue.path.join(".")}: ${issue.message}`);
      }
    } else {
      console.log(`✓ ${entry} valid`);
    }
  } catch (err) {
    console.log(`❌ ${entry} YAML ERROR: ${err}`);
  }
  console.log("");
}

console.log("=== End ===");
