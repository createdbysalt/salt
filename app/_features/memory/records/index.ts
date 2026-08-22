/**
 * Memory Records Module
 *
 * The record-creation engine for Memory: entity resolution (person/org
 * lookup-or-birth) plus the core record operations every lane composes
 * from — intake scan, evidence auto-create, Ask Salt tools, playbooks.
 *
 * Retired 2026-08-17: this module was formerly `capture/services/system-plays`
 * ("System Plays"). The concept retired; the engine remained and moved here.
 * Slug strings ("system:create-org", …) persist in stored proposal JSON, so
 * they stay as opaque identifiers — new code should not treat them as plays.
 *
 * Usage:
 *   import { executeRecordAction, resolvePerson, resolveOrg } from "@/app/_features/memory/records";
 */

// Types
export type {
  RecordActionSlug,
  RecordActionKind,
  RecordActionTarget,
  RecordActionDefinition,
  RecordActionResult,
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
  CreateBillingInput,
  UpdateBillingInput,
  ArchiveBillingInput,
  CreateFileRecordInput,
  UpdateFileRecordInput,
  ArchiveFileRecordInput,
  CreateMeFactInput,
  UpdateMeFactInput,
  ArchiveMeFactInput,
} from "./types";

// Executor
export { executeRecordAction } from "./executor";

// Workspace guard & lookups
export {
  assertEntityInWorkspace,
  assertEntitiesInWorkspace,
  EntityNotInWorkspaceError,
} from "./workspace-guard";
export { findPeople, findOrgs, findMeetings, findBilling, findFiles, findMeFacts, findTags } from "./lookups";
export type { PersonLookupRow, OrgLookupRow, MeetingLookupRow, BillingLookupRow, FileLookupRow, MeFactLookupRow, TagLookupRow } from "./lookups";

// Schemas (Ask Salt tool contracts)
export {
  RECORD_ACTION_TOOL_SPECS,
  getRecordActionToolSpecByName,
} from "./schemas";

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
