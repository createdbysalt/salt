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
} from "./profile-actions";

// Notification preference actions
export {
  getNotificationPreferencesAction,
  updateNotificationBatchingAction,
  updateQuietHoursAction,
} from "./notification-actions";
export type { NotificationPreferences } from "./notification-actions";
