/**
 * Playbook v2 Discovery
 *
 * Discovers playbooks from section directories using filesystem patterns:
 *
 * 1. YAML files: v2/{section}/*.yaml - traditional single-file playbooks
 * 2. Package directories: v2/{section}/{slug}/ - skill-like packages containing:
 *    - PLAYBOOK.md or definition.yaml - playbook definition
 *    - scripts/run.ts - execution script (optional)
 *    - references/ - on-demand documentation (optional)
 *    - tools.yaml - tools reference (optional)
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { parsePlaybookV2Yaml, parseSectionYaml } from "./parser";
import type {
  PlaybookDefinitionV2,
  PlaybookSection,
  SectionMetadata,
  ParsedPlaybookV2,
} from "./types";

const V2_PLAYBOOKS_DIR = join(
  process.cwd(),
  "app/_features/plays/playbooks/v2"
);

const SECTIONS: PlaybookSection[] = [
  "relationships",
  "work",
  "billing",
  "files",
  "meetings",
  "me",
  "_meta",
];

export interface DiscoveredSection {
  metadata: SectionMetadata;
  playbooks: ParsedPlaybookV2[];
}

export interface DiscoveryResult {
  sections: Map<PlaybookSection, DiscoveredSection>;
  allPlaybooks: ParsedPlaybookV2[];
  errors: Array<{ file: string; errors: string[] }>;
}

export function discoverV2Playbooks(): DiscoveryResult {
  const sections = new Map<PlaybookSection, DiscoveredSection>();
  const allPlaybooks: ParsedPlaybookV2[] = [];
  const errors: Array<{ file: string; errors: string[] }> = [];

  for (const section of SECTIONS) {
    const sectionDir = join(V2_PLAYBOOKS_DIR, section);

    if (!existsSync(sectionDir)) {
      continue;
    }

    const sectionFile = join(sectionDir, "_section.yaml");
    let metadata: SectionMetadata | null = null;

    if (existsSync(sectionFile)) {
      const content = readFileSync(sectionFile, "utf-8");
      const result = parseSectionYaml(content, `${section}/_section.yaml`);
      if (result.errors.length > 0) {
        errors.push({
          file: `${section}/_section.yaml`,
          errors: result.errors.map((e) => `${e.path}: ${e.message}`),
        });
      } else if (result.section) {
        metadata = result.section;
      }
    }

    if (!metadata) {
      continue;
    }

    const sectionPlaybooks: ParsedPlaybookV2[] = [];
    const entries = readdirSync(sectionDir);

    for (const entry of entries) {
      if (entry === "_section.yaml") continue;

      const entryPath = join(sectionDir, entry);
      const stat = statSync(entryPath);

      if (stat.isFile() && entry.endsWith(".yaml")) {
        // Traditional YAML file playbook
        const content = readFileSync(entryPath, "utf-8");
        const result = parsePlaybookV2Yaml(content, {
          fileLabel: `${section}/${entry}`,
          validateSignals: true,
        });

        if (result.validationErrors.length > 0) {
          errors.push({
            file: `${section}/${entry}`,
            errors: result.validationErrors.map((e) => `${e.path}: ${e.message}`),
          });
        } else if (result.definition) {
          sectionPlaybooks.push(result);
          allPlaybooks.push(result);
        }
      } else if (stat.isDirectory()) {
        // Package directory - look for definition.yaml or PLAYBOOK.md
        const packageResult = discoverPlaybookPackage(section, entry, entryPath);
        if (packageResult.errors.length > 0) {
          errors.push({
            file: `${section}/${entry}/`,
            errors: packageResult.errors,
          });
        }
        if (packageResult.playbook) {
          sectionPlaybooks.push(packageResult.playbook);
          allPlaybooks.push(packageResult.playbook);
        }
      }
    }

    sections.set(section, {
      metadata,
      playbooks: sectionPlaybooks,
    });
  }

  return { sections, allPlaybooks, errors };
}

/**
 * Discover a playbook from a package directory.
 * Looks for definition.yaml or PLAYBOOK.md.
 */
function discoverPlaybookPackage(
  section: string,
  dirName: string,
  dirPath: string
): { playbook: ParsedPlaybookV2 | null; errors: string[] } {
  // Priority: definition.yaml > PLAYBOOK.md frontmatter
  const definitionPath = join(dirPath, "definition.yaml");
  const playbookMdPath = join(dirPath, "PLAYBOOK.md");

  if (existsSync(definitionPath)) {
    const content = readFileSync(definitionPath, "utf-8");
    const result = parsePlaybookV2Yaml(content, {
      fileLabel: `${section}/${dirName}/definition.yaml`,
      validateSignals: true,
    });

    if (result.validationErrors.length > 0) {
      return {
        playbook: null,
        errors: result.validationErrors.map((e) => `${e.path}: ${e.message}`),
      };
    }

    // Mark as package for downstream consumers
    if (result.definition) {
      result.packagePath = dirPath;
      result.hasScript = existsSync(join(dirPath, "scripts", "run.ts"));
      result.hasPlaybookMd = existsSync(playbookMdPath);
    }

    return { playbook: result, errors: [] };
  }

  // No definition.yaml - skip for now (PLAYBOOK.md parsing would require frontmatter parser)
  return { playbook: null, errors: [] };
}

export function getPlaybookBySlug(slug: string): ParsedPlaybookV2 | null {
  const result = discoverV2Playbooks();
  return result.allPlaybooks.find((p) => p.definition.slug === slug) ?? null;
}

export function getPlaybooksBySection(
  section: PlaybookSection
): ParsedPlaybookV2[] {
  const result = discoverV2Playbooks();
  return result.sections.get(section)?.playbooks ?? [];
}

export function getPlaybooksByLayer(
  layer: "learn" | "act"
): ParsedPlaybookV2[] {
  const result = discoverV2Playbooks();
  return result.allPlaybooks.filter((p) => p.definition.layer === layer);
}

export function validateAllPlaybooks(): {
  valid: boolean;
  total: number;
  passed: number;
  errors: Array<{ file: string; errors: string[] }>;
} {
  const result = discoverV2Playbooks();
  return {
    valid: result.errors.length === 0,
    total: result.allPlaybooks.length + result.errors.length,
    passed: result.allPlaybooks.length,
    errors: result.errors,
  };
}

/**
 * Get a playbook's auto-apply threshold by slug.
 * Returns the threshold from the playbook's policy if it exists,
 * or null if the playbook doesn't exist or has no threshold.
 */
export function getPlaybookThreshold(slug: string): number | null {
  const playbook = getPlaybookBySlug(slug);
  if (!playbook?.definition?.policy?.auto_apply_threshold) {
    return null;
  }
  return playbook.definition.policy.auto_apply_threshold;
}
