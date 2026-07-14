#!/usr/bin/env npx tsx
/**
 * Debug Playbook Discovery
 *
 * Run: pnpm tsx scripts/debug-playbook-discovery.ts
 *
 * Shows exactly what playbooks are discovered and what errors occur.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import * as yaml from "yaml";

const V2_PLAYBOOKS_DIR = join(process.cwd(), "app/_features/plays/playbooks/v2");

const SECTIONS = [
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
];

console.log("=== Playbook Discovery Debug ===\n");
console.log(`Looking in: ${V2_PLAYBOOKS_DIR}\n`);

for (const section of SECTIONS) {
  const sectionDir = join(V2_PLAYBOOKS_DIR, section);

  if (!existsSync(sectionDir)) {
    console.log(`❌ Section "${section}": directory does not exist`);
    continue;
  }

  const sectionFile = join(sectionDir, "_section.yaml");

  if (!existsSync(sectionFile)) {
    console.log(`❌ Section "${section}": _section.yaml missing`);
    continue;
  }

  // Parse section file
  try {
    const content = readFileSync(sectionFile, "utf-8");
    const parsed = yaml.parse(content);
    console.log(`✓ Section "${section}": _section.yaml valid`);
    console.log(`  - name: ${parsed.name}`);
    console.log(`  - signals: ${parsed.signals?.length || 0}`);
  } catch (err) {
    console.log(`❌ Section "${section}": _section.yaml parse error: ${err}`);
    continue;
  }

  // Find playbooks
  const entries = readdirSync(sectionDir);
  const playbooks = entries.filter(e => {
    if (e === "_section.yaml") return false;
    const entryPath = join(sectionDir, e);
    const stat = statSync(entryPath);
    return stat.isDirectory() || (stat.isFile() && e.endsWith(".yaml"));
  });

  console.log(`  - playbooks found: ${playbooks.length}`);

  for (const entry of playbooks) {
    const entryPath = join(sectionDir, entry);
    const stat = statSync(entryPath);
    const isDir = stat.isDirectory();

    const definitionPath = isDir
      ? join(entryPath, "definition.yaml")
      : entryPath;

    if (!existsSync(definitionPath)) {
      console.log(`    ❌ ${entry}: no definition.yaml`);
      continue;
    }

    try {
      const content = readFileSync(definitionPath, "utf-8");
      const parsed = yaml.parse(content);

      // Check required fields
      const issues: string[] = [];

      if (!parsed.name) issues.push("missing name");
      if (!parsed.version) issues.push("missing version");
      if (!parsed.description) issues.push("missing description");
      if (!parsed.section) issues.push("missing section");
      if (!parsed.layer) issues.push("missing layer");
      if (!parsed.trigger && !parsed.triggers) issues.push("missing trigger/triggers");
      if (!parsed.output) issues.push("missing output");

      // Layer-specific checks
      if (parsed.layer === "act") {
        if (!parsed.steps?.length && !parsed.instructions) {
          issues.push("act layer needs steps or instructions");
        }
      }
      if (parsed.layer === "learn") {
        if (!parsed.policy) {
          issues.push("learn layer needs policy");
        }
      }

      if (issues.length > 0) {
        console.log(`    ⚠️  ${entry}: ${issues.join(", ")}`);
      } else {
        console.log(`    ✓ ${entry}: valid (${parsed.layer} layer, trigger: ${parsed.trigger?.type || parsed.triggers?.[0]?.type})`);
      }
    } catch (err) {
      console.log(`    ❌ ${entry}: YAML parse error: ${err}`);
    }
  }

  console.log("");
}

console.log("=== End Debug ===");
