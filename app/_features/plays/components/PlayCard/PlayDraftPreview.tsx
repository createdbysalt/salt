"use client";

import type { ReactNode } from "react";
import { useDashboardUserOptional } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  ensureDraftSignOff,
  isEmailDraftChannel,
  markdownEmailBlocks,
  splitDraftSubject,
} from "../../lib/draft-preview";

interface PlayDraftPreviewProps {
  text: string;
  senderName?: string | null;
  /** Fallback when the letter no longer starts with a Subject: line. */
  subject?: string | null;
  /** Sits on the Subject label row (Edit / Done). */
  action?: ReactNode;
  /**
   * Play channel. Non-inbox drafts (Slack, LinkedIn, TikTok script) render
   * as plain content: no Subject header, no "Best regards" sign-off.
   */
  channel?: string | null;
}

export function DraftLetterHeader({
  subject,
  action,
}: {
  subject?: string | null;
  action?: ReactNode;
}) {
  if (!subject && !action) return null;
  return (
    <div className={subject ? "border-b border-border/40 pb-3" : undefined}>
      <div className="flex items-center gap-2">
        {subject ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Subject
          </p>
        ) : (
          <span />
        )}
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </div>
      {subject ? (
        <p className="mt-1 font-semibold text-foreground [font-family:Arial,Helvetica,sans-serif]">
          {subject}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Approval preview of a drafted email. Uses the same letter structure as
 * Gmail (line breaks, bold, lists) so Salt and the inbox read as one draft.
 */
export function PlayDraftPreview({
  text,
  senderName,
  subject: subjectProp,
  action,
  channel,
}: PlayDraftPreviewProps) {
  const user = useDashboardUserOptional();
  const emailDraft = isEmailDraftChannel(channel);
  const { subject: peeledSubject, body } = splitDraftSubject(text);
  const subject = emailDraft
    ? (peeledSubject ?? subjectProp?.trim() ?? null)
    : null;
  const signedBody = emailDraft
    ? ensureDraftSignOff(body, {
        senderName: senderName ?? user?.fullName,
      })
    : body.replace(/\s+$/, "");
  const letterHtml = markdownEmailBlocks(signedBody);

  return (
    <div
      className={[
        "space-y-3 text-[14.5px] leading-[1.5] text-foreground/90",
        emailDraft ? "[font-family:Arial,Helvetica,sans-serif]" : "",
      ].join(" ")}
    >
      <DraftLetterHeader subject={subject} action={action} />
      {letterHtml ? (
        <div
          className={[
            "[&_b]:font-semibold [&_b]:text-foreground",
            "[&_ul]:my-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:p-0",
            "[&_li]:my-0",
            "[&_a]:break-words",
            "[&_table]:my-3",
          ].join(" ")}
          dangerouslySetInnerHTML={{ __html: letterHtml }}
        />
      ) : null}
    </div>
  );
}
