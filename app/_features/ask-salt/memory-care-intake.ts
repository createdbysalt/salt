/**
 * Ask Salt ↔ Memory Care intake bridge.
 *
 * Record creation in chat is Memory Care, not a playbook. This module loads
 * the care/intake chat contract without going through play_templates /
 * load_playbook.
 */

import "server-only";

import {
  readPlaybookIntakeSummary,
  resolvePlaybookChatContract,
  type PlaybookChatContract,
} from "./playbook-chat-contract";

/** Canonical intake id — not a playbook slug. */
export const MEMORY_CARE_INTAKE_ID = "memory-care";

/** Legacy Ask Salt / blueprint id still accepted as an alias. */
export const MEMORY_CARE_INTAKE_ALIASES = new Set([
  MEMORY_CARE_INTAKE_ID,
  "memory-records",
]);

export interface MemoryCareIntakeDetail {
  id: typeof MEMORY_CARE_INTAKE_ID;
  name: string;
  description: string;
  whenToUse: string | null;
  procedureMd: string | null;
  chatContract: PlaybookChatContract;
  /** Always false — Care intake never queues Plays. */
  approvalRequired: false;
  hasActingSteps: false;
}

export function isMemoryCareIntakeId(id: string): boolean {
  return MEMORY_CARE_INTAKE_ALIASES.has(id);
}

/**
 * Load the Memory Care intake procedure for Ask Salt.
 * Reads `app/_features/memory/care/intake/` via the chat-contract resolver.
 */
export function loadMemoryCareIntake(): MemoryCareIntakeDetail | null {
  // Contract is stored under the historical "memory-records" package id.
  const chatContract = resolvePlaybookChatContract("memory-records");
  if (!chatContract) return null;

  const procedureFromYaml =
    chatContract.procedure.length > 0
      ? chatContract.procedure.map((step, i) => `${i + 1}. ${step}`).join("\n")
      : null;
  const procedureMd =
    procedureFromYaml ?? readPlaybookIntakeSummary("memory-records");

  return {
    id: MEMORY_CARE_INTAKE_ID,
    name: "Memory Care intake",
    description:
      "Create and link Memory records from chat. Learn-layer only — not a playbook.",
    whenToUse: chatContract.whenToUse,
    procedureMd,
    chatContract,
    approvalRequired: false,
    hasActingSteps: false,
  };
}
