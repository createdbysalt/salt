import {
  Briefcase,
  Building2,
  Clock3,
  Play,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ConnectableApp } from "@/app/_features/onboarding/data/onboarding-flow-data";

export type SetupItemIcon =
  | { kind: "brand"; brand: ConnectableApp["brand"] }
  | { kind: "lucide"; icon: LucideIcon };

export type SetupItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  cta?: string;
  href?: string;
  minutes?: number;
  icon: SetupItemIcon;
};

export type SetupSection = {
  id: string;
  label: string;
  blurb: string;
  accent: "sky" | "violet" | "flame" | "blush";
  items: SetupItem[];
};

export const SETUP_SECTIONS: SetupSection[] = [
  {
    id: "connect-core",
    label: "Core integrations",
    blurb: "Gmail, Calendar, and Slack",
    accent: "sky",
    items: [
      {
        id: "g-gmail",
        title: "Connect Gmail",
        description: "Threads, replies, and scheduling signals.",
        done: true,
        icon: { kind: "brand", brand: "gmail" },
      },
      {
        id: "g-cal",
        title: "Connect Google Calendar",
        description: "Meetings, attendees, and prep windows.",
        done: true,
        icon: { kind: "brand", brand: "gcal" },
      },
      {
        id: "g-slack",
        title: "Connect Slack",
        description: "DMs and channels you care about.",
        done: true,
        icon: { kind: "brand", brand: "slack" },
      },
    ],
  },
  {
    id: "connect-more",
    label: "Connect remaining tools",
    blurb: "Drive and billing",
    accent: "sky",
    items: [
      {
        id: "g-drive",
        title: "Sync Google Drive",
        description: "Docs, decks, and shared files for project memory.",
        done: false,
        cta: "Connect",
        minutes: 2,
        icon: { kind: "brand", brand: "gdrive" },
      },
      {
        id: "g-stripe",
        title: "Connect Stripe",
        description: "Invoices, payments, and renewal risk.",
        done: false,
        cta: "Connect",
        minutes: 1,
        icon: { kind: "brand", brand: "stripe" },
      },
    ],
  },
  {
    id: "memory",
    label: "Build your memory",
    blurb: "People, orgs, and active work",
    accent: "violet",
    items: [
      {
        id: "m-people",
        title: "Review People",
        description: "Confirm who Salt thinks you care about most.",
        done: true,
        href: "/people",
        icon: { kind: "lucide", icon: Users },
      },
      {
        id: "m-orgs",
        title: "Review Orgs",
        description: "Validate accounts and key relationships.",
        done: true,
        href: "/orgs",
        icon: { kind: "lucide", icon: Building2 },
      },
      {
        id: "m-work",
        title: "Tag active Work",
        description: "Mark which deals and projects matter right now.",
        done: false,
        cta: "Review",
        href: "/work",
        minutes: 3,
        icon: { kind: "lucide", icon: Briefcase },
      },
    ],
  },
  {
    id: "plays",
    label: "Start playing",
    blurb: "Approve plays and set your cadence",
    accent: "flame",
    items: [
      {
        id: "p-first",
        title: "Approve your first play",
        description: "Salt drafts — you approve. Try one now.",
        done: true,
        href: "/plays",
        icon: { kind: "lucide", icon: Play },
      },
      {
        id: "p-cadence",
        title: "Set briefing cadence",
        description: "Pick when Salt sends your daily briefing.",
        done: false,
        cta: "Choose time",
        href: "/settings",
        minutes: 1,
        icon: { kind: "lucide", icon: Clock3 },
      },
    ],
  },
  {
    id: "profile",
    label: "Complete your profile",
    blurb: "Role, goals, and teammates",
    accent: "blush",
    items: [
      {
        id: "u-name",
        title: "Add role and goals",
        description: "Salt tailors plays to how you actually work.",
        done: false,
        cta: "Add details",
        href: "/me",
        minutes: 2,
        icon: { kind: "lucide", icon: UserCircle },
      },
      {
        id: "u-team",
        title: "Invite a teammate",
        description: "Bring an operator or EA into your workspace.",
        done: false,
        cta: "Invite",
        minutes: 1,
        icon: { kind: "lucide", icon: UserPlus },
      },
    ],
  },
];

export const ACCENT_STYLES = {
  sky: {
    soft: "bg-sky/10 border-sky/25",
    dot: "bg-sky",
    text: "text-sky",
  },
  violet: {
    soft: "bg-violet/10 border-violet/25",
    dot: "bg-violet",
    text: "text-violet",
  },
  flame: {
    soft: "bg-flame/10 border-flame/25",
    dot: "bg-flame",
    text: "text-flame",
  },
  blush: {
    soft: "bg-blush/10 border-blush/25",
    dot: "bg-blush",
    text: "text-blush",
  },
} as const;
