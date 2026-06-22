#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { runPlaybookBenchmark } from "../../../../app/_features/plays/playbooks/eval-runner";
import { parsePlaybookMarkdown } from "../../../../app/_features/plays/playbooks/parse-playbook";
import { runProfilePlaybookBenchmark } from "../../../../app/_features/plays/playbooks/profile-eval-runner";
import type { ProfileFillRulesDocument } from "../../../../app/_features/plays/playbooks/profile/types";
import type { PlaybookEvalFile } from "../../../../app/_features/plays/playbooks/types";

const PLAYBOOK_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks");

function usage(): never {
  console.error("Usage: pnpm exec tsx .cursor/skills/playbook-creator/scripts/benchmark.ts <slug|dir|playbook.md>");
  process.exit(1);
}

function resolvePlaybookPath(target: string): string {
  const absolute = path.resolve(process.cwd(), target);
  if (target.endsWith("playbook.md")) return absolute;
  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    return path.join(absolute, "playbook.md");
  }
  return path.join(PLAYBOOK_ROOT, target, "playbook.md");
}

function main() {
  const target = process.argv[2];
  if (!target) usage();

  const playbookPath = resolvePlaybookPath(target);
  const evalsPath = path.join(path.dirname(playbookPath), "evals.json");

  if (!fs.existsSync(playbookPath)) {
    console.error(`Playbook not found: ${playbookPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(evalsPath)) {
    console.error(`Evals not found: ${evalsPath}`);
    process.exit(1);
  }

  const parsed = parsePlaybookMarkdown(fs.readFileSync(playbookPath, "utf8"), playbookPath);
  const evalFile = JSON.parse(fs.readFileSync(evalsPath, "utf8")) as PlaybookEvalFile;
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

  const passed = benchmark.passed === benchmark.total;
  console.log(`${passed ? "PASS" : "FAIL"} ${benchmark.playbook_slug}: ${benchmark.passed}/${benchmark.total} evals passed`);

  for (const result of benchmark.results) {
    console.log(`\n${result.passed ? "PASS" : "FAIL"} ${result.eval_name}`);
    for (const line of result.evidence) console.log(`  - ${line}`);
  }

  if (!passed) process.exit(1);
}

main();
