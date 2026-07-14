import {
  Calendar,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  PenLine,
  Receipt,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import type { EntityContext, SuggestedAction } from "../types/entity-context";

/**
 * Suggested actions per entity type.
 * Each action has a label and a prompt that auto-submits when clicked.
 */
const SUGGESTED_ACTIONS: Record<EntityContext["type"], SuggestedAction[]> = {
  person: [
    {
      label: "Enrich profile",
      prompt: "Help me fill in missing information for this person's profile",
      icon: UserPlus,
    },
    {
      label: "Draft email",
      prompt: "Draft a follow-up email to this person",
      icon: Mail,
    },
    {
      label: "Schedule meeting",
      prompt: "Help me schedule a meeting with this person",
      icon: Calendar,
    },
  ],
  org: [
    {
      label: "Enrich profile",
      prompt: "Help me fill in missing information for this organization's profile",
      icon: UserPlus,
    },
    {
      label: "Find contacts",
      prompt: "Who are the key contacts at this organization?",
      icon: Users,
    },
    {
      label: "Review projects",
      prompt: "What projects or work do we have with this organization?",
      icon: Search,
    },
  ],
  work: [
    {
      label: "Summarize status",
      prompt: "Summarize the current status of this work",
      icon: FileText,
    },
    {
      label: "Draft invoice",
      prompt: "Help me create an invoice for this work",
      icon: Receipt,
    },
    {
      label: "Find related",
      prompt: "What files, conversations, or meetings relate to this work?",
      icon: Search,
    },
  ],
  play: [
    {
      label: "Edit content",
      prompt: "Help me edit the content of this play",
      icon: PenLine,
    },
    {
      label: "Send now",
      prompt: "I want to send this play now",
      icon: Send,
    },
    {
      label: "Reschedule",
      prompt: "Help me reschedule when this play should be sent",
      icon: Calendar,
    },
  ],
  capture: [
    {
      label: "Route to Memory",
      prompt: "Add this capture to Memory",
      icon: Inbox,
    },
    {
      label: "Create follow-up",
      prompt: "Create a follow-up action from this capture",
      icon: PenLine,
    },
    {
      label: "Summarize",
      prompt: "Summarize what this capture is about",
      icon: Sparkles,
    },
  ],
  billing: [
    {
      label: "Send reminder",
      prompt: "Draft a payment reminder for this invoice",
      icon: Mail,
    },
    {
      label: "Mark paid",
      prompt: "Mark this invoice as paid",
      icon: Receipt,
    },
    {
      label: "Add note",
      prompt: "Add a note to this invoice",
      icon: MessageSquare,
    },
  ],
  meeting: [
    {
      label: "Prep brief",
      prompt: "Create a preparation brief for this meeting",
      icon: FileText,
    },
    {
      label: "Draft follow-up",
      prompt: "Draft a follow-up email after this meeting",
      icon: Mail,
    },
    {
      label: "Add attendee",
      prompt: "Help me add someone to this meeting",
      icon: Users,
    },
  ],
  file: [
    {
      label: "Summarize",
      prompt: "Summarize the key points of this file",
      icon: Sparkles,
    },
    {
      label: "Extract info",
      prompt: "Extract the important information from this file",
      icon: FileText,
    },
    {
      label: "Find related",
      prompt: "What other files or records relate to this?",
      icon: Search,
    },
  ],
  files: [
    {
      label: "Compare",
      prompt: "Compare these files and highlight differences",
      icon: Search,
    },
    {
      label: "Summarize all",
      prompt: "Summarize the key points across all these files",
      icon: Sparkles,
    },
    {
      label: "Find patterns",
      prompt: "What patterns or themes appear across these files?",
      icon: FileText,
    },
  ],
};

/**
 * Get suggested actions for an entity context.
 * Returns actions relevant to the entity type.
 */
export function getSuggestedActions(context: EntityContext): SuggestedAction[] {
  return SUGGESTED_ACTIONS[context.type] ?? [];
}

/**
 * Get a limited number of suggested actions.
 */
export function getTopSuggestedActions(
  context: EntityContext,
  limit = 3
): SuggestedAction[] {
  return getSuggestedActions(context).slice(0, limit);
}
