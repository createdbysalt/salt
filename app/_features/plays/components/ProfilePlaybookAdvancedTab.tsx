"use client";

import { useState } from "react";
import {
  ChevronDown,
  FileCode2,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type {
  PlaybookResource,
  PlaybookResourceCategory,
} from "@/app/_features/plays/playbooks/load-playbook-resources";
import type {
  ProfileFillRulesDocument,
  ProfilePlaybookSettings,
} from "@/app/_features/plays/playbooks/records-engine/types";
import { cn } from "@repo/utils";
import { ProfilePlaybookRulesEditor } from "./ProfilePlaybookRulesEditor";

type ProfilePlaybookAdvancedTabProps = {
  resources: PlaybookResource[];
  blueprintSlug: string;
  systemRules: ProfileFillRulesDocument | null;
  settings: ProfilePlaybookSettings | null;
  onSaved: (settings: ProfilePlaybookSettings) => void;
};

type GroupMeta = {
  title: string;
  blurb: string;
  empty: string;
  icon: LucideIcon;
};

const GROUPS: Record<PlaybookResourceCategory, GroupMeta> = {
  script: {
    title: "Scripts",
    blurb: "Code Salt runs for exact, repeatable steps — no guesswork.",
    empty: "Salt hasn't needed any scripts for this playbook yet.",
    icon: FileCode2,
  },
  reference: {
    title: "References",
    blurb: "Notes Salt checks while it works — definitions, examples, guidelines.",
    empty: "Salt hasn't added any references for this playbook yet.",
    icon: FileText,
  },
  asset: {
    title: "Assets",
    blurb: "Files Salt uses in what it produces — templates, icons, fonts.",
    empty: "No assets are attached to this playbook.",
    icon: ImageIcon,
  },
};

const GROUP_ORDER: PlaybookResourceCategory[] = ["script", "reference", "asset"];

export function ProfilePlaybookAdvancedTab({
  resources,
  blueprintSlug,
  systemRules,
  settings,
  onSaved,
}: ProfilePlaybookAdvancedTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-foreground">
          Advanced
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          A look under the hood. Salt builds and maintains the resources below as
          it works — there&apos;s nothing you need to set up. Power users can also
          fine-tune the rules Salt follows.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5 text-foreground" />
          Maintained by Salt
        </span>
      </div>

      <div className="space-y-5">
        {GROUP_ORDER.map((category) => {
          const meta = GROUPS[category];
          const items = resources.filter((r) => r.category === category);
          const Icon = meta.icon;
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground mt-0.5" strokeWidth={2} />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {meta.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                      {items.length}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {meta.blurb}
                  </p>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  {meta.empty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <ResourceRow key={`${category}-${item.name}`} resource={item} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className="space-y-3">
          <div className="flex items-start gap-2.5">
            <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-base font-semibold text-foreground">Configuration</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The exact rules Salt follows. You never have to touch this — Salt
                keeps it in sync — but you can review or override it here.
              </p>
            </div>
          </div>

          <ProfilePlaybookRulesEditor
            blueprintSlug={blueprintSlug}
            systemRules={systemRules}
            settings={settings}
            onSaved={onSaved}
          />
        </section>
      </div>
    </div>
  );
}

function ResourceRow({ resource }: { resource: PlaybookResource }) {
  const [showContent, setShowContent] = useState(false);
  const canPreview = Boolean(resource.content);

  return (
    <li className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
          {resource.name}
        </code>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {resource.description ?? "—"}
        </span>
        {resource.executable ? (
          <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Code
          </span>
        ) : null}
        {resource.sizeLabel ? (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
            {resource.sizeLabel}
          </span>
        ) : null}
      </div>

      {canPreview ? (
        <div className="mt-3 border-t border-border/50 pt-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            onClick={() => setShowContent((value) => !value)}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", showContent && "rotate-180")}
            />
            {showContent ? "Hide" : "Show"} contents
          </button>

          {showContent ? (
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-border/50 bg-background/80 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {resource.content}
            </pre>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
