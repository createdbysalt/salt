import {
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  MessageSquare,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type ConnectableApp = {
  id: string;
  name: string;
  blurb: string;
  brand: "gmail" | "gcal" | "gdrive" | "slack" | "notion" | "stripe" | "hubspot" | "linear";
};

export const CONNECTABLE_APPS: ConnectableApp[] = [
  { id: "gmail", name: "Gmail", blurb: "Threads, replies, scheduling signals", brand: "gmail" },
  { id: "gcal", name: "Google Calendar", blurb: "Meetings, attendees, prep windows", brand: "gcal" },
  { id: "gdrive", name: "Google Drive", blurb: "Docs, decks, shared files", brand: "gdrive" },
  { id: "slack", name: "Slack", blurb: "DMs and channels you care about", brand: "slack" },
  { id: "notion", name: "Notion", blurb: "Briefs, SOWs, internal pages", brand: "notion" },
  { id: "stripe", name: "Stripe", blurb: "Invoices, payments, churn risk", brand: "stripe" },
  { id: "hubspot", name: "HubSpot", blurb: "Deals, pipeline, contact history", brand: "hubspot" },
  { id: "linear", name: "Linear", blurb: "Issues, cycles, delivery health", brand: "linear" },
];

export type MemoryDomain = {
  id: string;
  label: string;
  icon: LucideIcon;
  count: number;
};

export const MEMORY_DOMAINS: MemoryDomain[] = [
  { id: "people", label: "People", icon: Users, count: 124 },
  { id: "orgs", label: "Orgs", icon: Building2, count: 38 },
  { id: "work", label: "Work", icon: Briefcase, count: 21 },
  { id: "files", label: "Files", icon: FileText, count: 87 },
  { id: "billing", label: "Billing", icon: CreditCard, count: 14 },
  { id: "comms", label: "Convos", icon: MessageSquare, count: 312 },
  { id: "meetings", label: "Meetings", icon: Calendar, count: 46 },
  { id: "teams", label: "Teams", icon: UsersRound, count: 4 },
  { id: "me", label: "Me", icon: UserCircle, count: 1 },
];

export const ROLE_CHIPS = ["Founder", "Operator", "Consultant", "Agency", "Other"] as const;
export type Role = (typeof ROLE_CHIPS)[number];
