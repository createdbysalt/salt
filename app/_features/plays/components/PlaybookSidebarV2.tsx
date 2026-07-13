"use client";

import Link from "next/link";
import { Zap, FileText, Settings } from "lucide-react";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type { PlaybookDefinitionV2 } from "../playbooks/schema/v2/types";

interface PlaybookSidebarV2Props {
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
}

const TRIGGER_DESCRIPTIONS: Record<string, (value?: string) => string> = {
  signal: (value) => `Runs when the ${value || "signal"} fires`,
  schedule: (value) => `Runs on schedule: ${value || "not set"}`,
  manual: () => "Triggered manually by the user",
};

const OUTPUT_DESCRIPTIONS: Record<string, string> = {
  email_draft: "Creates email drafts for your review",
  notification: "Sends notifications",
  memory_update: "Updates Memory records directly",
  finding: "Creates findings in the Plays queue",
  briefing: "Generates briefing summaries",
};

const APPROVAL_LABELS: Record<string, string> = {
  none: "Auto-applies without approval",
  per_entity: "Requires approval per item",
  batch: "Requires batch approval",
};

export function PlaybookSidebarV2({
  playbook,
  definition,
}: PlaybookSidebarV2Props) {
  const triggerDescription = TRIGGER_DESCRIPTIONS[playbook.triggerType]?.(
    playbook.triggerValue
  ) ?? "Trigger not specified";

  const whenItems = [
    triggerDescription,
    playbook.layer === "learn"
      ? "Auto-applies high-confidence updates"
      : "Queues outputs for your review",
    playbook.layer === "learn"
      ? "Low-confidence changes go to Plays queue"
      : "You approve before any action is taken",
  ];

  const usesItems: string[] = [];

  if (definition?.requirements?.categories?.required?.length) {
    usesItems.push(
      `Required: ${definition.requirements.categories.required.join(", ")}`
    );
  }
  if (definition?.requirements?.categories?.optional?.length) {
    usesItems.push(
      `Optional: ${definition.requirements.categories.optional.join(", ")}`
    );
  }
  if (definition?.requirements?.capabilities?.required?.length) {
    usesItems.push(
      `Capabilities: ${definition.requirements.capabilities.required.join(", ")}`
    );
  }

  if (playbook.voice) {
    usesItems.push(`Voice profile: ${playbook.voice}`);
  }

  if (usesItems.length === 0) {
    usesItems.push("No special requirements");
  }

  return (
    <div className="space-y-6">
      <SidebarCard title="When it runs">
        <ul className="space-y-3">
          {whenItems.map((text) => (
            <TriggerItem key={text} text={text} />
          ))}
        </ul>
      </SidebarCard>

      <SidebarCard title="What it uses">
        <ul className="space-y-3">
          {usesItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-foreground/80"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              {item}
            </li>
          ))}
          {playbook.layer === "act" && (
            <li className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              <Link
                href="/me?tab=voice"
                className="font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                Manage voices in Me
              </Link>
            </li>
          )}
        </ul>
      </SidebarCard>

      {definition?.output && (
        <SidebarCard title="Output">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {definition.output.type.replace(/_/g, " ")}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {OUTPUT_DESCRIPTIONS[definition.output.type] ??
                    "Custom output type"}
                </p>
              </div>
            </div>
            {definition.output.approval && (
              <div className="flex items-start gap-2.5">
                <Settings className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Approval</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {APPROVAL_LABELS[definition.output.approval] ??
                      definition.output.approval}
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarCard>
      )}

      {definition?.value && (
        <SidebarCard title="Value">
          <div className="text-sm">
            <p className="text-muted-foreground">
              Each run is estimated to save{" "}
              <span className="font-semibold text-foreground">
                ~{definition.value.estimate} min
              </span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Category: {definition.value.kind.replace(/_/g, " ")}
            </p>
          </div>
        </SidebarCard>
      )}
    </div>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-[24px] p-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function TriggerItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground/80">
      <Zap className="size-4 shrink-0 text-foreground mt-0.5" />
      {text}
    </li>
  );
}
