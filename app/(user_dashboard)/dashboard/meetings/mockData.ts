import type { Meeting } from "./types";

// Helper to create fixed dates for today
const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const createTime = (hour: number, minute: number = 0) => {
  const date = getToday();
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const mockMeetings: Meeting[] = [
  // 9:00 AM - Completed
  {
    id: "1",
    title: "Meeting with Dev Team",
    type: "check-in",
    status: "completed",
    clientName: "Internal Team",
    clientId: "client-1",
    projectName: "Sprint Planning Q1",
    projectId: "project-1",
    startTime: createTime(9, 0),
    endTime: createTime(9, 30),
    location: "google-meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    attendees: [
      { name: "Dev Team", role: "team" },
      { name: "You", role: "team" },
    ],
    notes: "Sprint goals reviewed and assigned.",
  },
  
  // 10:30 AM - Completed
  {
    id: "2",
    title: "Meeting with Sarah Johnson",
    type: "discovery",
    status: "completed",
    clientName: "Acme Corporation",
    clientId: "client-2",
    projectName: "E-Commerce Platform Redesign",
    projectId: "project-2",
    startTime: createTime(10, 30),
    endTime: createTime(11, 30),
    location: "google-meet",
    meetingUrl: "https://meet.google.com/xyz-mnop-qrs",
    attendees: [
      { name: "Sarah Johnson", role: "client" },
      { name: "Michael Chen", role: "client" },
      { name: "You", role: "team" },
    ],
    agenda: "1. Project overview\n2. Timeline discussion\n3. Budget & pricing\n4. Next steps",
    notes: "Great meeting! Client approved initial proposal.",
  },
  
  // 1:00 PM - Upcoming
  {
    id: "3",
    title: "Meeting with Mike Chen",
    type: "review",
    status: "upcoming",
    clientName: "XYZ Studio",
    clientId: "client-3",
    projectName: "Mobile Banking App",
    projectId: "project-3",
    startTime: createTime(13, 0),
    endTime: createTime(14, 0),
    location: "zoom",
    meetingUrl: "https://zoom.us/j/123456789",
    attendees: [
      { name: "Mike Chen", role: "client" },
      { name: "Design Team", role: "team" },
      { name: "You", role: "team" },
    ],
    agenda: "1. Present wireframes\n2. Gather feedback\n3. Discuss next iteration",
  },
  
  // 2:15 PM - Upcoming
  {
    id: "4",
    title: "Meeting with Alex Thompson",
    type: "check-in",
    status: "upcoming",
    clientName: "TechFlow Solutions",
    clientId: "client-4",
    projectName: "SaaS Dashboard Updates",
    projectId: "project-4",
    startTime: createTime(14, 15),
    endTime: createTime(14, 45),
    location: "google-meet",
    meetingUrl: "https://meet.google.com/alex-check-in",
    attendees: [
      { name: "Alex Thompson", role: "client" },
      { name: "You", role: "team" },
    ],
  },
  
  // 3:30 PM - Upcoming
  {
    id: "5",
    title: "Meeting with Marketing Team",
    type: "kickoff",
    status: "scheduled",
    clientName: "Blue Co",
    clientId: "client-5",
    projectName: "Brand Identity Refresh",
    projectId: "project-5",
    startTime: createTime(15, 30),
    endTime: createTime(17, 0),
    location: "google-meet",
    meetingUrl: "https://meet.google.com/new-lead-abc",
    attendees: [
      { name: "Marketing Team", role: "client" },
      { name: "Creative Team", role: "team" },
      { name: "You", role: "team" },
    ],
    agenda: "1. Introduce team members\n2. Project scope overview\n3. Timeline & milestones\n4. Q&A",
  },
  
  // 4:30 PM - Upcoming
  {
    id: "6",
    title: "Meeting with James Rodriguez",
    type: "other",
    status: "scheduled",
    clientName: "TechStart Inc",
    clientId: "client-6",
    projectName: "API Integration & Security",
    projectId: "project-6",
    startTime: createTime(16, 30),
    endTime: createTime(18, 0),
    location: "zoom",
    meetingUrl: "https://zoom.us/j/tech-deepdive",
    attendees: [
      { name: "James Rodriguez", role: "client" },
      { name: "Engineering Team", role: "team" },
      { name: "You", role: "team" },
    ],
    agenda: "1. Technical architecture review\n2. Integration requirements\n3. Security considerations",
  },
];

