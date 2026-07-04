"use client";

import Link from "next/link";
import { CircleDollarSign, MessagesSquare, Network, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProfilePlaybookSettings } from "@/app/_features/plays/playbooks/records-engine/types";
import type { PlaybookBlueprintView } from "@/app/_features/plays/types";
import { formatBlueprintTriggerLines } from "@/app/_features/plays/utils/playbook-display";

const EVIDENCE_GROUP_META: Record<
  string,
  { Icon: LucideIcon; label: string; className: string }
> = {
  Communication: {
    Icon: MessagesSquare,
    label: "Communication",
    className: "text-blue-600",
  },
  Finance: {
    Icon: CircleDollarSign,
    label: "Finance",
    className: "text-emerald-600",
  },
  Memory: {
    Icon: Network,
    label: "Memory",
    className: "text-foreground",
  },
};

type ProfilePlaybookSidebarProps = {
  blueprint: Pick<PlaybookBlueprintView, "playerSlug" | "whenToUse" | "trigger">;
  settings: ProfilePlaybookSettings | null;
  domainRulesText?: string | null;
};

export function ProfilePlaybookSidebar({
  blueprint,
  settings,
  domainRulesText,
}: ProfilePlaybookSidebarProps) {
  const contextFacts = settings?.contextFacts ?? {};
  const triggerLines = formatBlueprintTriggerLines(blueprint.whenToUse, blueprint.trigger);
  const whenItems = [
    triggerLines[0] ?? "Runs when Capture resolves a person",
    "Also runs when Ask Salt is asked to add or update a person",
    "Creates only qualified people; skips aliases, system senders, newsletters, and suspicious senders",
    `Auto-apply threshold: ${settings?.autoApplyThreshold ?? 85}%`,
  ];

  const memoryItems = [
    contextFacts.workspace_domains?.length
      ? `Your domains (${contextFacts.workspace_domains.join(", ")})`
      : null,
    contextFacts.partner_domains?.length
      ? `Partner domains (${contextFacts.partner_domains.join(", ")})`
      : null,
    contextFacts.vendor_domains?.length
      ? `Vendor domains (${contextFacts.vendor_domains.join(", ")})`
      : null,
    "People + Organizations memory for exact matches and possible duplicates",
    "Billing, conversations, meetings, and work tied to the person or org",
    "Connections when they scope relationship context",
    "Me workspace context for domains, partners, vendors, and preferences",
  ].filter(Boolean) as string[];
  const evidenceGroups = deriveEvidenceGroups(domainRulesText);

  const hasConfiguredFacts =
    Boolean(contextFacts.workspace_domains?.length) ||
    Boolean(contextFacts.partner_domains?.length) ||
    Boolean(contextFacts.vendor_domains?.length);

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
          {memoryItems.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              {item}
            </li>
          ))}
          <li className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            <Link
              href="/me"
              className="font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {hasConfiguredFacts
                ? "Update your domains in Me"
                : "Set up your domains in Me"}
            </Link>
          </li>
        </ul>

        <div className="border-t border-border/50 pt-3 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">
            Evidence groups
          </p>
          <div className="flex flex-wrap gap-2">
            {evidenceGroups.map((group) => {
              const meta = EVIDENCE_GROUP_META[group];
              const GroupIcon = meta.Icon;
              return (
                <span
                  key={group}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium"
                >
                  <GroupIcon className={`size-3.5 ${meta.className}`} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      </SidebarCard>
    </div>
  );
}

function deriveEvidenceGroups(domainRulesText?: string | null): string[] {
  const text = domainRulesText?.toLowerCase() ?? "";
  const groups = new Set<string>(["Memory"]);
  if (text.includes("communication") || text.includes("email") || text.includes("conversation")) {
    groups.add("Communication");
  }
  if (text.includes("finance") || text.includes("billing") || text.includes("payment") || text.includes("invoice")) {
    groups.add("Finance");
  }
  return ["Communication", "Finance", "Memory"].filter((group) => groups.has(group));
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
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
