/**
 * Read and parse PLAYBOOK.md content from a playbook package.
 * Strips YAML frontmatter and returns the markdown body.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface PlaybookMdContent {
  body: string;
  frontmatter: {
    name?: string;
    description?: string;
    triggers?: Array<{ type: string; signals?: string[]; cron?: string; description?: string }>;
    tools?: string[];
  };
}

export function readPlaybookMd(packagePath: string): PlaybookMdContent | null {
  const playbookMdPath = join(packagePath, "PLAYBOOK.md");

  if (!existsSync(playbookMdPath)) {
    return null;
  }

  const content = readFileSync(playbookMdPath, "utf-8");
  return parsePlaybookMd(content);
}

export function parsePlaybookMd(content: string): PlaybookMdContent {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { body: content.trim(), frontmatter: {} };
  }

  const [, frontmatterYaml, body] = frontmatterMatch;

  const frontmatter: PlaybookMdContent["frontmatter"] = {};

  const nameMatch = frontmatterYaml.match(/^name:\s*(.+)$/m);
  if (nameMatch) frontmatter.name = nameMatch[1].trim();

  const descMatch = frontmatterYaml.match(/^description:\s*(.+)$/m);
  if (descMatch) frontmatter.description = descMatch[1].trim();

  const toolsMatch = frontmatterYaml.match(/^tools:\n((?:\s+-\s+.+\n?)+)/m);
  if (toolsMatch) {
    frontmatter.tools = toolsMatch[1]
      .split("\n")
      .map(line => line.replace(/^\s+-\s+/, "").trim())
      .filter(Boolean);
  }

  return { body: body.trim(), frontmatter };
}
