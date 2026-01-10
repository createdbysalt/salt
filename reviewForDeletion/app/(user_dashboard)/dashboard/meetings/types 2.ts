export type MeetingType = "discovery" | "check-in" | "review" | "kickoff" | "other";

export type MeetingStatus = "scheduled" | "live" | "upcoming" | "completed" | "cancelled" | "no-show";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  clientName: string;
  clientId: string;
  projectName?: string;
  projectId?: string;
  startTime: Date;
  endTime: Date;
  location: "google-meet" | "zoom" | "phone" | "in-person" | "custom";
  meetingUrl?: string;
  attendees: Array<{
    name: string;
    role: "client" | "team";
  }>;
  agenda?: string;
  notes?: string;
}

export type ViewMode = "today" | "week" | "month" | "agenda";


