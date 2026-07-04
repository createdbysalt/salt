/**
 * Default agenda templates by meeting type.
 * Used when user selects "Use template" for agenda initialization.
 */

export type AgendaItem = {
  id: string;
  title: string;
  notes: string;
  order: number;
};

export type AgendaMode = "template" | "custom" | "none";

function generateId(): string {
  return crypto.randomUUID();
}

function createItems(titles: string[]): AgendaItem[] {
  return titles.map((title, index) => ({
    id: generateId(),
    title,
    notes: "",
    order: index,
  }));
}

export const AGENDA_TEMPLATES: Record<string, string[]> = {
  discovery: [
    "Introductions",
    "Business Context",
    "Goals & Challenges",
    "Scope & Timeline",
    "Next Steps",
  ],
  kickoff: [
    "Project Overview",
    "Team Introductions",
    "Timeline Review",
    "Success Criteria",
    "Q&A",
  ],
  "check-in": [
    "Progress Update",
    "Blockers",
    "Priorities",
    "Action Item Review",
    "Next Steps",
  ],
  review: [
    "Work Presentation",
    "Feedback Discussion",
    "Revisions Needed",
    "Approval Status",
  ],
  presentation: [
    "Overview",
    "Main Content",
    "Q&A",
    "Next Steps",
  ],
  workshop: [
    "Objectives",
    "Working Session",
    "Findings",
    "Action Items",
  ],
  interview: [
    "Introduction",
    "Background",
    "Core Questions",
    "Candidate Questions",
    "Wrap-up",
  ],
  other: [
    "Topics to Cover",
    "Discussion",
    "Next Steps",
  ],
};

export function getAgendaTemplate(meetingType: string | null | undefined): AgendaItem[] {
  const key = meetingType?.toLowerCase() ?? "other";
  const titles = AGENDA_TEMPLATES[key] ?? AGENDA_TEMPLATES.other;
  return createItems(titles);
}

export function createEmptyAgendaItem(order: number): AgendaItem {
  return {
    id: generateId(),
    title: "",
    notes: "",
    order,
  };
}
