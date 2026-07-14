"use client";

import { cn } from "@repo/utils";
import {
  Reply,
  Paperclip,
  Bot,
  Megaphone,
  ArrowRightLeft,
  Send,
  Mail,
  Calendar,
  MessageSquare,
  CreditCard,
  FileText,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Signal display configuration */
interface SignalConfig {
  label: string;
  icon: LucideIcon;
  color: "sky" | "violet" | "flame" | "blush" | "muted";
}

const SIGNAL_CONFIG: Record<string, SignalConfig> = {
  capture_email_received: {
    label: "Email",
    icon: Mail,
    color: "sky",
  },
  capture_email_sent: {
    label: "Sent",
    icon: Send,
    color: "violet",
  },
  is_bidirectional_thread: {
    label: "Bidirectional",
    icon: ArrowRightLeft,
    color: "flame",
  },
  you_initiated: {
    label: "You Started",
    icon: Send,
    color: "violet",
  },
  is_reply: {
    label: "Reply",
    icon: Reply,
    color: "sky",
  },
  has_attachment: {
    label: "Attachment",
    icon: Paperclip,
    color: "muted",
  },
  from_known_contact: {
    label: "Known Contact",
    icon: User,
    color: "flame",
  },
  is_automated_sender: {
    label: "Automated",
    icon: Bot,
    color: "muted",
  },
  is_marketing_email: {
    label: "Marketing",
    icon: Megaphone,
    color: "muted",
  },
  meeting_synced_from_calendar: {
    label: "Meeting",
    icon: Calendar,
    color: "sky",
  },
  meeting_upcoming: {
    label: "Upcoming",
    icon: Calendar,
    color: "flame",
  },
  is_organizer: {
    label: "Organizer",
    icon: User,
    color: "violet",
  },
  has_external_attendees: {
    label: "External",
    icon: User,
    color: "blush",
  },
  message_received: {
    label: "Message",
    icon: MessageSquare,
    color: "sky",
  },
  is_direct_message: {
    label: "DM",
    icon: MessageSquare,
    color: "violet",
  },
  billing_payment_received: {
    label: "Payment",
    icon: CreditCard,
    color: "flame",
  },
  billing_invoice_sent: {
    label: "Invoice",
    icon: FileText,
    color: "sky",
  },
  billing_payment_overdue: {
    label: "Overdue",
    icon: CreditCard,
    color: "blush",
  },
};

const COLOR_CLASSES: Record<SignalConfig["color"], string> = {
  sky: "bg-sky/15 text-sky",
  violet: "bg-violet/15 text-violet",
  flame: "bg-flame/15 text-flame",
  blush: "bg-blush/15 text-blush",
  muted: "bg-muted text-muted-foreground",
};

interface SignalBadgesProps {
  signals: string[];
  maxDisplay?: number;
  className?: string;
  /** "chip" = colored icons (default). "plain" = neutral border pills, no icons. */
  variant?: "chip" | "plain";
}

const PLAIN_BADGE =
  "inline-flex items-center rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80";

/** Title case each word: "mentions timeline" → "Mentions Timeline" */
function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatUnknownSignal(signal: string): string {
  const raw = signal
    .replace(/_/g, " ")
    .replace(/^(capture |is |has |from )/i, "");
  return toTitleCase(raw);
}

/** Human-readable signal label for badges and row chips */
export function getSignalLabel(signal: string): string {
  const config = SIGNAL_CONFIG[signal];
  if (config) return toTitleCase(config.label);
  return formatUnknownSignal(signal);
}

export function SignalBadges({
  signals,
  maxDisplay = 5,
  className,
  variant = "chip",
}: SignalBadgesProps) {
  if (signals.length === 0) return null;

  const displaySignals = signals.slice(0, maxDisplay);
  const overflow = signals.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {displaySignals.map((signal) => {
        const label = getSignalLabel(signal);

        if (variant === "plain") {
          return (
            <span key={signal} className={PLAIN_BADGE}>
              {label}
            </span>
          );
        }

        const config = SIGNAL_CONFIG[signal];
        if (!config) {
          return (
            <span
              key={signal}
              className="chip bg-muted text-muted-foreground"
            >
              {label}
            </span>
          );
        }

        const Icon = config.icon;
        return (
          <span
            key={signal}
            className={cn("chip gap-1", COLOR_CLASSES[config.color])}
          >
            <Icon className="size-3" strokeWidth={2.5} />
            {label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className={
            variant === "plain"
              ? cn(PLAIN_BADGE, "text-muted-foreground")
              : "chip bg-muted text-muted-foreground"
          }
        >
          +{overflow} more
        </span>
      )}
    </div>
  );
}
