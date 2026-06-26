import { validatePlayDefinition, type PlayDefinition } from "../utils/play-definition";
import type { PlaybookKind, PlayerSlug } from "../types";
import type { ProfileFillRulesDocument } from "./profile/types";
import { validateProfileRules } from "./profile/validate-rules";
import type { ParsedPlaybook, ParsedPlaybookFrontmatter } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const JSON_FENCE_RE = /```json\s*\r?\n([\s\S]*?)\r?\n```/;

const PLAYER_SLUGS: PlayerSlug[] = [
  "follow-up",
  "brief",
  "client-risk",
  "scope",
  "billing",
  "keeper",
];

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  let currentKey: string | null = null;
  let blockLines: string[] = [];

  const flushBlock = () => {
    if (currentKey && blockLines.length > 0) {
      result[currentKey] = blockLines.join("\n").trim();
      blockLines = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const blockMatch = line.match(/^(\w[\w_]*):\s*\|\s*$/);
    if (blockMatch) {
      flushBlock();
      currentKey = blockMatch[1];
      continue;
    }

    const inlineMatch = line.match(/^(\w[\w_]*):\s*(.+)$/);
    if (inlineMatch) {
      flushBlock();
      currentKey = null;
      const [, key, rawValue] = inlineMatch;
      const value = rawValue.trim();
      if (value === "true") result[key] = true;
      else if (value === "false") result[key] = false;
      else if (/^\d+$/.test(value)) result[key] = Number(value);
      else result[key] = value.replace(/^["']|["']$/g, "");
      continue;
    }

    const nestedMatch = line.match(/^(\w[\w_]*):\s*$/);
    if (nestedMatch) {
      flushBlock();
      currentKey = nestedMatch[1];
      result[currentKey] = {};
      continue;
    }

    const nestedInline = line.match(/^\s{2}(\w[\w_]*):\s*(.+)$/);
    if (nestedInline && currentKey && typeof result[currentKey] === "object") {
      const [, nestedKey, nestedValue] = nestedInline;
      const parent = result[currentKey] as Record<string, unknown>;
      if (/^\d+$/.test(nestedValue.trim())) {
        parent[nestedKey] = Number(nestedValue.trim());
      } else {
        parent[nestedKey] = nestedValue.trim().replace(/^["']|["']$/g, "");
      }
      continue;
    }

    if (currentKey && line.startsWith("  ")) {
      blockLines.push(line.replace(/^  /, ""));
    }
  }

  flushBlock();
  return result;
}

function assertPlayerSlug(value: unknown): PlayerSlug {
  if (typeof value === "string" && PLAYER_SLUGS.includes(value as PlayerSlug)) {
    return value as PlayerSlug;
  }
  throw new Error(`Invalid player_slug: ${String(value)}`);
}

function assertKind(value: unknown): PlaybookKind {
  if (value === "profile" || value === "acting") return value;
  return "acting";
}

const EMPTY_DEFINITION: PlayDefinition = { version: 1, steps: [] };

export function parsePlaybookMarkdown(source: string, fileLabel = "playbook.md"): ParsedPlaybook {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(`${fileLabel}: missing YAML frontmatter`);
  }

  const [, frontmatterYaml, body] = match;
  const raw = parseSimpleYaml(frontmatterYaml);
  const kind = assertKind(raw.kind);

  const jsonMatch = body.match(JSON_FENCE_RE);
  if (!jsonMatch) {
    throw new Error(`${fileLabel}: missing \`\`\`json block`);
  }

  let definition: PlayDefinition = EMPTY_DEFINITION;
  let required_actions: string[] = [];
  let fill_rules: ProfileFillRulesDocument | null = null;
  let value: ParsedPlaybookFrontmatter["value"] = null;

  if (kind === "profile") {
    let parsedRules: unknown;
    try {
      parsedRules = JSON.parse(jsonMatch[1]);
    } catch {
      throw new Error(`${fileLabel}: fill_rules JSON is invalid`);
    }
    const validation = validateProfileRules(parsedRules);
    if (!validation.ok) {
      throw new Error(`${fileLabel}: ${validation.errors.join("; ")}`);
    }
    fill_rules = validation.document;
  } else {
    let parsedDefinition: PlayDefinition;
    try {
      parsedDefinition = JSON.parse(jsonMatch[1]) as PlayDefinition;
    } catch {
      throw new Error(`${fileLabel}: definition JSON is invalid`);
    }
    const validation = validatePlayDefinition(parsedDefinition);
    if (!validation.ok) {
      throw new Error(`${fileLabel}: ${validation.errors.join("; ")}`);
    }
    definition = validation.definition;
    required_actions = validation.requiredActions;
    value = validation.definition.value ?? null;
  }

  const procedure_md = body.replace(jsonMatch[0], "").trim();

  const frontmatter: ParsedPlaybookFrontmatter = {
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    kind,
    player_slug: assertPlayerSlug(raw.player_slug),
    description: String(raw.description ?? ""),
    when_to_use: String(raw.when_to_use ?? ""),
    trigger: (raw.trigger as ParsedPlaybookFrontmatter["trigger"]) ?? { type: "manual" },
    consent: (raw.consent as ParsedPlaybookFrontmatter["consent"]) ?? {},
    value,
  };

  if (!frontmatter.slug || !frontmatter.name) {
    throw new Error(`${fileLabel}: slug and name are required in frontmatter`);
  }

  return {
    frontmatter,
    procedure_md,
    definition,
    required_actions,
    fill_rules,
  };
}

export function playbookToSeedRow(parsed: ParsedPlaybook): Record<string, unknown> {
  return {
    slug: parsed.frontmatter.slug,
    name: parsed.frontmatter.name,
    kind: parsed.frontmatter.kind,
    player_slug: parsed.frontmatter.player_slug,
    description: parsed.frontmatter.description,
    when_to_use: parsed.frontmatter.when_to_use,
    trigger: parsed.frontmatter.trigger,
    procedure_md: parsed.procedure_md,
    definition: parsed.definition,
    fill_rules: parsed.fill_rules,
    required_actions: parsed.required_actions,
    value_model: parsed.frontmatter.value,
    version: 1,
    status: "active",
  };
}
