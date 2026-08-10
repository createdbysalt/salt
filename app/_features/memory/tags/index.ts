/**
 * Memory Tags Module
 *
 * Exports for the workspace tags and entity tag assignments system.
 */

export { normalizeTagSlug, normalizeTagLabel, isValidTagSlug, slugToLabel, normalizeTagSource, type TagSource } from "./normalize";
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
  type TagScope,
  type TagCategory,
  type WorkspaceTag,
  type TagAssignment,
  type CreateTagResult,
  type AssignTagResult,
} from "./tag-service";
