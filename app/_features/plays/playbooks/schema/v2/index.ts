/**
 * Playbook Schema v2
 *
 * Section-based, YAML-only playbook definitions.
 *
 * Key concepts:
 * - Section: Where the playbook lives (relationships, work, billing, etc.)
 * - Layer: What it does (learn = keeper, act = action)
 * - Voice: How it sounds (references voice profiles in /me)
 *
 * Usage:
 *   import { parsePlaybookV2Yaml, PlaybookDefinitionV2 } from "./schema/v2";
 *   import { discoverV2Playbooks } from "./schema/v2";
 *   import { executePlaybookV2 } from "./schema/v2";
 */

export * from "./types";
export * from "./schema";
export * from "./parser";
export * from "./discovery";
export * from "./executor";
