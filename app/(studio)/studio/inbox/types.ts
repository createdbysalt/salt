/**
 * Inbox Item Types
 *
 * The inbox aggregates items from multiple sources:
 * - Messages: Unread client messages
 * - Meetings: Today's calendar events
 * - Invoices: Overdue or pending payments
 * - Projects: Overdue milestones
 * - Proposals: Awaiting response
 * - Alerts: Client health warnings, SEO issues
 */

export type InboxItemType =
  | "message"
  | "meeting"
  | "invoice"
  | "milestone"
  | "proposal"
  | "alert";

export type InboxItemUrgency =
  | "overdue"    // Past due date
  | "unread"     // New messages
  | "alert"      // Warnings
  | "today"      // Due today
  | "pending";   // Awaiting action

export interface InboxItem {
  id: string;
  type: InboxItemType;
  urgency: InboxItemUrgency;
  title: string;
  subtitle?: string;
  /** Client associated with this item */
  clientId?: string;
  clientName?: string;
  /** Project associated with this item */
  projectId?: string;
  projectName?: string;
  /** When this item was created or became relevant */
  timestamp: Date;
  /** Link to view/action this item */
  href: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface InboxFilters {
  clientId?: string;
  projectId?: string;
  type?: InboxItemType;
}

export interface InboxGroup {
  urgency: InboxItemUrgency;
  label: string;
  icon: string;
  items: InboxItem[];
}
