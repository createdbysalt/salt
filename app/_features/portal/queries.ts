"use server";

/**
 * Portal Feature - Query Functions
 *
 * Data fetching functions for the client portal (bridge).
 * These are read-only operations.
 *
 * Usage:
 *   import { getProjectFiles } from '@/app/_features/portal/queries'
 */

// File queries
export {
  getProjectFiles,
  getUploadUrl,
  getDownloadUrl,
} from "@/app/bridge/files/actions";
