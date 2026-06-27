#!/usr/bin/env npx tsx
// Lint: No direct intelligence_findings writes from UI/action paths
//
// Phase 4 enforcement — ensures queue items are created via play_runs, not findings.
//
// Allowed paths (scan pipelines that feed Players):
//   - app/_features/capture/services/intelligence/
//   - app/_features/plays/playbooks/records-engine/write-provenance.ts (legacy)
//
// Forbidden paths (UI actions should use play_runs):
//   - app/_features/.../actions/
//   - app/_features/.../actions.ts
//   - app/(product)/
//   - app/api/
//
// Run: pnpm tsx scripts/lint-findings-usage.ts
// CI: Add to lint step in CI workflow

import { execSync } from "child_process";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

const FORBIDDEN_PATTERNS = [
  // Direct inserts into intelligence_findings from forbidden paths
  {
    grep: 'from\\("intelligence_findings"\\).*\\.insert',
    paths: [
      "app/_features/*/actions/",
      "app/_features/*/actions.ts",
      "app/(product)/",
      "app/api/",
    ],
    message: "Direct intelligence_findings insert from UI/action path",
  },
  {
    grep: '\\.from\\("intelligence_findings"\\)\\.insert',
    paths: [
      "app/_features/*/actions/",
      "app/_features/*/actions.ts",
    ],
    message: "Direct intelligence_findings insert from action file",
  },
];

const ALLOWED_PATHS = [
  "app/_features/capture/services/intelligence/",
  "app/_features/plays/playbooks/records-engine/write-provenance.ts",
  "app/_features/plays/playbooks/profile/", // legacy, being migrated
  "app/_features/intelligence/generators/", // scan pipeline generators
  "app/_features/memory/actions/create-salt-note.ts", // Salt notes that need review (migrate later)
];

interface Violation {
  file: string;
  line: number;
  content: string;
  message: string;
}

function isAllowedPath(file: string): boolean {
  return ALLOWED_PATHS.some((allowed) => file.includes(allowed));
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];

  try {
    // Search for intelligence_findings inserts
    const result = execSync(
      `grep -rn 'from("intelligence_findings")' --include="*.ts" --include="*.tsx" ${ROOT}/app 2>/dev/null || true`,
      { encoding: "utf-8" }
    );

    const lines = result.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (!match) continue;

      const [, file, lineNum, content] = match;
      const relativePath = file.replace(ROOT + "/", "");

      // Skip allowed paths
      if (isAllowedPath(relativePath)) continue;

      // Check if this is an insert (not just a select/update)
      if (content.includes(".insert(") || content.includes(".insert({")) {
        violations.push({
          file: relativePath,
          line: parseInt(lineNum, 10),
          content: content.trim(),
          message: "Direct intelligence_findings insert — use play_runs via createKeeperPlayRun() instead",
        });
      }
    }
  } catch {
    // grep returns exit code 1 when no matches
  }

  return violations;
}

function main() {
  console.log("🔍 Checking for forbidden intelligence_findings usage...\n");

  const violations = findViolations();

  if (violations.length === 0) {
    console.log("✅ No violations found.\n");
    console.log("Allowed paths (scan pipelines):");
    ALLOWED_PATHS.forEach((p) => console.log(`  - ${p}`));
    process.exit(0);
  }

  console.log(`❌ Found ${violations.length} violation(s):\n`);

  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.message}`);
    console.log(`    ${v.content}\n`);
  }

  console.log("Fix: Use createKeeperPlayRun() or createKeeperQuestionPlayRun() from");
  console.log("     app/_features/plays/services/create-keeper-play-run.ts\n");

  process.exit(1);
}

main();
