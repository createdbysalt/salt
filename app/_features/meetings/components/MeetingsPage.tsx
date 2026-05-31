"use client";

import * as React from "react";
import { CalendarDays, FileText, Mic, Play, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@repo/ui";
import { PageBanner } from "@repo/patterns";

const MEETINGS = [
  {
    id: "meet_luma_launch",
    title: "Luma Health launch review",
    when: "Yesterday, 3:00 PM",
    source: "Transcript imported from Calendar",
    summary:
      "Elena said the referral partner site may need a rebuild if the portal launch goes well.",
    linked: ["Elena Marquez", "Patient Portal Launch", "Luma Expansion Play"],
    status: "Needs review",
  },
  {
    id: "meet_atlas_kickoff",
    title: "Atlas Coaching kickoff prep",
    when: "Today, 2:00 PM",
    source: "Calendar hold + intake notes",
    summary:
      "Theo uses Notion and Slack heavily. Approval owner still needs confirmation before kickoff.",
    linked: ["Theo Grant", "Atlas Kickoff Roundtable", "Brief Play"],
    status: "Ready for brief",
  },
  {
    id: "meet_cedar_scope",
    title: "Cedar scope review",
    when: "Today, 4:30 PM",
    source: "Email thread linked to meeting",
    summary:
      "Two new landing pages are outside the approved brand refresh scope and need a boundary decision.",
    linked: ["Ari Cohen", "Cedar Scope Risk", "Risk Play"],
    status: "Open decision",
  },
];

export function MeetingsPage() {
  return (
    <div className="w-full px-16 py-8">
      <PageBanner
        size="hero"
        eyebrow="MEMORY"
        title="Meetings"
        subtitle="Calls, transcripts, decisions, and follow-ups Salt can cite."
        fullWidthDivider
      />

      <div className="grid gap-4">
        {MEETINGS.map((meeting) => (
          <Card key={meeting.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  <span>{meeting.when}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  {meeting.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {meeting.summary}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {meeting.status}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <Mic className="size-3 text-primary" />
                {meeting.source}
              </span>
              {meeting.linked.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  <Sparkles className="size-3 text-primary" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-border/50 pt-4">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="size-3.5" />
                View transcript
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Play className="size-3.5" />
                Review prepared Play
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
