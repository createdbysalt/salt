"use client";

import * as React from "react";
import {
  Building2,
  Briefcase,
  Calendar,
  CircleUser,
  FileText,
  Receipt,
  User2,
} from "lucide-react";
import { cn } from "@repo/utils";

type MentionPillType = "person" | "org" | "work" | "billing" | "resource" | "meeting" | "me";

const TYPE_ICONS: Record<MentionPillType, typeof User2> = {
  me: CircleUser,
  person: User2,
  org: Building2,
  work: Briefcase,
  billing: Receipt,
  resource: FileText,
  meeting: Calendar,
};

const TYPE_KEYWORDS: Record<string, MentionPillType> = {
  person: "person",
  people: "person",
  client: "person",
  contact: "person",
  organization: "org",
  org: "org",
  company: "org",
  project: "work",
  work: "work",
  invoice: "billing",
  bill: "billing",
  billing: "billing",
  file: "resource",
  resource: "resource",
  document: "resource",
  meeting: "meeting",
  call: "meeting",
  me: "me",
  profile: "me",
};

function inferTypeFromContext(context: string): MentionPillType {
  const lower = context.toLowerCase();
  for (const [keyword, type] of Object.entries(TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return type;
  }
  if (lower.includes("at ") || lower.includes("with ")) return "person";
  if (lower.includes("for ")) return "work";
  if (lower.startsWith("$")) return "billing";
  return "person";
}

export interface MentionPillProps {
  name: string;
  context?: string;
  type?: MentionPillType;
  className?: string;
}

export function MentionPill({ name, context, type, className }: MentionPillProps) {
  const inferredType = type ?? (context ? inferTypeFromContext(context) : "person");
  const Icon = TYPE_ICONS[inferredType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[13px] font-medium text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" strokeWidth={2} />
      <span className="truncate">{name}</span>
    </span>
  );
}

// Matches: @"Name" [type:id] or @Name [type:id]
// Also supports legacy format: @"Name" (context) or @Name (context)
const MENTION_REGEX = /@(?:"([^"]+)"|(\S+?))\s*(?:\[([a-z]+):([^\]]+)\]|\(([^)]*)\))?/g;

export interface ParsedMention {
  fullMatch: string;
  name: string;
  type?: MentionPillType;
  id?: string;
  context?: string;
  startIndex: number;
  endIndex: number;
}

export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const name = match[1] ?? match[2];
    const bracketType = match[3] as MentionPillType | undefined;
    const bracketId = match[4];
    const parenContext = match[5]?.trim();

    mentions.push({
      fullMatch: match[0],
      name,
      type: bracketType,
      id: bracketId,
      context: parenContext || undefined,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

export interface TextWithMentionsProps {
  text: string;
  className?: string;
}

export function TextWithMentions({ text, className }: TextWithMentionsProps) {
  const mentions = parseMentions(text);

  if (mentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const mention of mentions) {
    if (mention.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, mention.startIndex)}
        </span>
      );
    }
    parts.push(
      <MentionPill
        key={`mention-${mention.startIndex}`}
        name={mention.name}
        type={mention.type}
        context={mention.context}
      />
    );
    lastIndex = mention.endIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <span className={className}>{parts}</span>;
}
