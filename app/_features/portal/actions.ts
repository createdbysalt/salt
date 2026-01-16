
/**
 * Portal Feature - Server Actions
 *
 * This module provides actions for the client portal (bridge).
 * Handles magic links, file management, and client-specific operations.
 *
 * Usage:
 *   import { getProjectFiles, activateClientMemberships } from '@/app/_features/portal/actions'
 */

// Magic link / authentication
export { activateClientMemberships } from "@/app/(client_portal)/bridge/verify/actions";

// File operations
export {
  getProjectFiles,
  getUploadUrl,
  getDownloadUrl,
  deleteFile,
} from "@/app/(client_portal)/bridge/files/actions";
