/**
 * Auth Feature - Server Actions
 *
 * Actions for authentication and profile management.
 *
 * Usage:
 *   import { updateProfileAction } from '@/app/_features/auth/actions'
 */

// Profile actions
export {
  updateProfileAction,
  uploadAvatarAction,
  changeEmailAction,
  getThemeSettingsAction,
  updateThemeSettingsAction,
} from "@/app/actions/profile/profile-actions";

// Notification preference actions
export {
  getNotificationPreferencesAction,
  updateNotificationBatchingAction,
  updateQuietHoursAction,
} from "@/app/actions/profile/notification-actions";
export type { NotificationPreferences } from "@/app/actions/profile/notification-actions";
