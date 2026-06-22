#!/usr/bin/env tsx
/**
 * Run playbook eval suites against authored playbooks.
 *
 * Usage: pnpm playbooks:bench
 */

import { discoverPlaybookDirs, readEvalsFile, readPlaybookSource } from "../app/_features/plays/playbooks/discover-playbooks";
import { runPlaybookBenchmark } from "../app/_features/plays/playbooks/eval-runner";
import { runProfilePlaybookBenchmark } from "../app/_features/plays/playbooks/profile-eval-runner";
import { parsePlaybookMarkdown } from "../app/_features/plays/playbooks/parse-playbook";
import type { PlaybookEvalFile } from "../app/_features/plays/playbooks/types";
import type { ProfileFillRulesDocument } from "../app/_features/plays/playbooks/profile/types";

function main() {
  const discovered = discoverPlaybookDirs();
  if (discovered.length === 0) {
    console.error("No playbooks found.");
    process.exit(1);
  }

  let failed = false;

  for (const item of discovered) {
    const parsed = parsePlaybookMarkdown(
      readPlaybookSource(item.playbookPath),
      item.playbookPath,
    );

    if (!item.evalsPath) {
      console.warn(`⚠ ${item.slug}: no evals.json — skipping`);
      continue;
    }

    const evalFile = JSON.parse(readEvalsFile(item.evalsPath)) as PlaybookEvalFile;
    const benchmark =
      parsed.frontmatter.kind === "profile"
        ? runProfilePlaybookBenchmark({
            playbook_slug: parsed.frontmatter.slug,
            version: 1,
            fill_rules: parsed.fill_rules as ProfileFillRulesDocument,
            evals: evalFile.evals,
          })
        : runPlaybookBenchmark({
            playbook_slug: parsed.frontmatter.slug,
            version: 1,
            definition: parsed.definition,
            evals: evalFile.evals,
          });

    const icon = benchmark.passed === benchmark.total ? "✓" : "✗";
    console.log(`${icon} ${item.slug}: ${benchmark.passed}/${benchmark.total} checks passed`);

    for (const result of benchmark.results) {
      if (!result.passed) {
        failed = true;
        console.log(`  ✗ ${result.eval_name}`);
        for (const line of result.evidence) {
          console.log(`    - ${line}`);
        }
      }
    }
  }

  if (failed) process.exit(1);
}

main();
