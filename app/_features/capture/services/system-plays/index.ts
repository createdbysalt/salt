/**
 * System Plays Module
 *
 * Exports the system plays infrastructure for entity resolution and core operations.
 *
 * Usage:
 *   import { executeSystemPlay, resolvePerson, resolveOrg } from "@/app/_features/capture/services/system-plays";
 */

// Types
export type {
  SystemPlaySlug,
  SystemPlayAction,
  SystemPlayTarget,
  SystemPlay,
  SystemPlayResult,
  RelationshipType,
  CreatePersonInput,
  UpdatePersonInput,
  ArchivePersonInput,
  ClassifyPersonInput,
  CreateOrgInput,
  UpdateOrgInput,
  ArchiveOrgInput,
  CreateWorkInput,
  UpdateWorkInput,
  ArchiveWorkInput,
  LinkPersonOrgInput,
  LinkPersonWorkInput,
  LinkPersonPersonInput,
  LinkPersonSpaceInput,
  LinkOrgWorkInput,
  LinkWorkSpaceInput,
  CreateNoteInput,
  AttachEmailInput,
} from "./types";

// Executor
export { executeSystemPlay } from "./executor";

// Person resolution
export {
  resolvePerson,
  createPersonConfirmed,
  extractDomain,
  isPersonalDomain,
} from "./person-resolver";
export type { PersonResolutionResult, PersonResolutionInput, PersonSignals } from "./person-resolver";

// Org resolution
export {
  resolveOrg,
  linkPersonToOrg,
  resolvePersonAndOrg,
} from "./org-resolver";
export type { OrgResolutionResult } from "./org-resolver";
