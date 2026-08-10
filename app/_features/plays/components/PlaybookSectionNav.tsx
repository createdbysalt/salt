import {
  Users,
  Briefcase,
  CreditCard,
  File,
  FileText,
  Calendar,
  User,
  Link,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type PlaybookSection =
  | "all"
  | "relationships"
  | "work"
  | "billing"
  | "resources"
  | "meetings"
  | "me"
  | "connections"
  | "notes"
  | "communication";

export type SectionColor =
  | "violet"
  | "sky"
  | "emerald"
  | "amber"
  | "flame"
  | "indigo"
  | "rose"
  | "teal"
  | "slate"
  | "cyan";

interface SectionMeta {
  label: string;
  icon: LucideIcon;
  description: string;
  color: SectionColor;
}

export const SECTION_COLOR_STYLES: Record<
  SectionColor,
  { bg: string; text: string; border: string; ring: string; accent: string; dot: string; gradient: string }
> = {
  violet: {
    bg: "bg-violet/10",
    text: "text-violet",
    border: "border-violet/20",
    ring: "ring-violet/10 hover:ring-violet/25",
    accent: "var(--violet)",
    dot: "bg-violet",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--violet)_16%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  sky: {
    bg: "bg-sky/10",
    text: "text-sky",
    border: "border-sky/20",
    ring: "ring-sky/10 hover:ring-sky/25",
    accent: "var(--sky)",
    dot: "bg-sky",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--sky)_16%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    ring: "ring-emerald-500/10 hover:ring-emerald-500/25",
    accent: "rgb(16, 185, 129)",
    dot: "bg-emerald-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(16_185_129)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    ring: "ring-amber-500/10 hover:ring-amber-500/25",
    accent: "rgb(245, 158, 11)",
    dot: "bg-amber-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(245_158_11)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  flame: {
    bg: "bg-flame/10",
    text: "text-flame",
    border: "border-flame/20",
    ring: "ring-flame/10 hover:ring-flame/25",
    accent: "var(--flame)",
    dot: "bg-flame",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--flame)_16%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
    border: "border-indigo-500/20",
    ring: "ring-indigo-500/10 hover:ring-indigo-500/25",
    accent: "rgb(99, 102, 241)",
    dot: "bg-indigo-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(99_102_241)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/20",
    ring: "ring-rose-500/10 hover:ring-rose-500/25",
    accent: "rgb(244, 63, 94)",
    dot: "bg-rose-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(244_63_94)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
    border: "border-teal-500/20",
    ring: "ring-teal-500/10 hover:ring-teal-500/25",
    accent: "rgb(20, 184, 166)",
    dot: "bg-teal-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(20_184_166)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  slate: {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    border: "border-slate-500/20",
    ring: "ring-slate-500/10 hover:ring-slate-500/25",
    accent: "rgb(100, 116, 139)",
    dot: "bg-slate-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(100_116_139)_12%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    ring: "ring-cyan-500/10 hover:ring-cyan-500/25",
    accent: "rgb(6, 182, 212)",
    dot: "bg-cyan-500",
    gradient:
      "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,rgb(6_182_212)_14%,transparent)_0%,transparent_60%),linear-gradient(180deg,var(--card)_0%,var(--card)_100%)]",
  },
};

const SECTION_META: Record<Exclude<PlaybookSection, "all">, SectionMeta> = {
  relationships: {
    label: "Relationships",
    icon: Users,
    description: "People and organizations",
    color: "violet",
  },
  work: {
    label: "Work",
    icon: Briefcase,
    description: "Projects and tasks",
    color: "sky",
  },
  billing: {
    label: "Billing",
    icon: CreditCard,
    description: "Invoices and payments",
    color: "emerald",
  },
  resources: {
    label: "Resources",
    icon: File,
    description: "Documents, links, and live-watched repos",
    color: "amber",
  },
  meetings: {
    label: "Meetings",
    icon: Calendar,
    description: "Scheduled time",
    color: "flame",
  },
  me: {
    label: "Me",
    icon: User,
    description: "Your profile",
    color: "rose",
  },
  connections: {
    label: "Connections",
    icon: Link,
    description: "Entity links",
    color: "teal",
  },
  notes: {
    label: "Notes",
    icon: FileText,
    description: "Preferences and context",
    color: "indigo",
  },
  communication: {
    label: "Communication",
    icon: MessageSquare,
    description: "Email and messaging",
    color: "cyan",
  },
};

export function getSectionMeta(section: Exclude<PlaybookSection, "all">) {
  return SECTION_META[section];
}

export function getSectionIcon(section: Exclude<PlaybookSection, "all">) {
  return SECTION_META[section].icon;
}

export function getSectionColor(section: Exclude<PlaybookSection, "all">) {
  return SECTION_META[section].color;
}

export function getSectionColorStyles(section: Exclude<PlaybookSection, "all">) {
  const color = SECTION_META[section].color;
  return SECTION_COLOR_STYLES[color];
}
