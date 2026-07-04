/**
 * Memory Tags Module
 *
 * Exports for the workspace tags and entity tag assignments system.
 */

export { normalizeTagSlug, normalizeTagLabel, isValidTagSlug, slugToLabel } from "./normalize";
export { checkForDuplicate, findMergeCandidates, type ExistingTag, type DedupeResult } from "./dedupe";
export {
  getTags,
  getTagById,
  createTag,
  createTagFromAI,
  updateTag,
  archiveTag,
  unarchiveTag,
  mergeTags,
  getEntityTags,
  assignTag,
  unassignTag,
  archiveUnusedTags,
  type TagScope,
  type TagCategory,
  type TagSource,
  type WorkspaceTag,
  type TagAssignment,
  type CreateTagResult,
  type AssignTagResult,
} from "./tag-service";
