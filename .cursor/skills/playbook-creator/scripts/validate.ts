#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { parsePlaybookMarkdown } from "../../../../app/_features/plays/playbooks/parse-playbook";

const PLAYBOOK_ROOT = path.join(process.cwd(), "app/_features/plays/playbooks");
const REQUIRED_SECTIONS = [
  "## What this does",
  "## When it runs",
  "## How it works",
  "## What you approve",
] as const;

const PROFILE_DOMAIN_SECTIONS = [
  "## Admission Policy",
  "## Entity Taxonomy",
  "## Identity Resolution And Dedupe",
  "## Field Completion Matrix",
  "## Negative Examples",
] as const;

function usage(): never {
  console.error("Usage: pnpm exec tsx .cursor/skills/playbook-creator/scripts/validate.ts <slug|dir|playbook.md>");
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
  if (!fs.existsSync(playbookPath)) {
    console.error(`Playbook not found: ${playbookPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(playbookPath, "utf8");
  let parsed: ReturnType<typeof parsePlaybookMarkdown>;
  try {
    parsed = parsePlaybookMarkdown(source, playbookPath);
  } catch (error) {
    console.error(`FAIL ${playbookPath}: ${error instanceof Error ? error.message : "invalid playbook"}`);
    process.exit(1);
  }
  const errors: string[] = [];

  const dirSlug = path.basename(path.dirname(playbookPath));
  if (parsed.frontmatter.slug !== dirSlug) {
    errors.push(`frontmatter slug "${parsed.frontmatter.slug}" must match directory "${dirSlug}"`);
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!parsed.procedure_md.includes(section)) {
      errors.push(`missing required procedure section: ${section}`);
    }
  }

  if (source.includes("Replace with") || source.includes("Replace this")) {
    errors.push("contains scaffold placeholder text");
  }

  if (parsed.frontmatter.kind === "profile") {
    if (!parsed.procedure_md.includes("## Workspace context")) {
      errors.push("profile playbooks must include ## Workspace context");
    }
    if (!parsed.procedure_md.includes("## Record lifecycle")) {
      errors.push("profile playbooks must include ## Record lifecycle");
    }

    const domainPath = path.join(path.dirname(playbookPath), "references", "domain.md");
    if (!fs.existsSync(domainPath)) {
      errors.push("profile playbooks must include references/domain.md");
    } else {
      const domainSource = fs.readFileSync(domainPath, "utf8");
      for (const section of PROFILE_DOMAIN_SECTIONS) {
        if (!domainSource.includes(section)) {
          errors.push(`profile domain reference missing required section: ${section}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL ${parsed.frontmatter.slug}: validation failed`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`PASS ${parsed.frontmatter.slug}: valid ${parsed.frontmatter.kind} playbook`);
}

main();
