"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  File,
  User,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { PlaybookMemoryPolicy } from "../playbooks/schema/v2/types";

type RecordTypeMeta = {
  icon: LucideIcon;
  href?: string;
  iconClass: string;
  bgClass: string;
};

const RECORD_TYPE_META: Record<string, RecordTypeMeta> = {
  People: {
    icon: Users,
    href: "/people",
    iconClass: "text-violet",
    bgClass: "bg-violet/10",
  },
  Organizations: {
    icon: Building2,
    href: "/orgs",
    iconClass: "text-sky",
    bgClass: "bg-sky/10",
  },
  Work: {
    icon: Briefcase,
    href: "/work",
    iconClass: "text-sky",
    bgClass: "bg-sky/10",
  },
  Billing: {
    icon: CreditCard,
    href: "/billing",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  Meetings: {
    icon: Calendar,
    href: "/meetings",
    iconClass: "text-flame",
    bgClass: "bg-flame/10",
  },
  Resources: {
    icon: File,
    href: "/resources",
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  Me: {
    icon: User,
    href: "/me",
    iconClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
  },
};

const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-foreground mt-6 mb-3 first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-foreground/80 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 space-y-1.5 pl-5 list-disc text-sm text-foreground/80 marker:text-muted-foreground/50">
      {children}
    </ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
};

interface MemoryPlaybookOverviewTabProps {
  policy: PlaybookMemoryPolicy;
}

export function MemoryPlaybookOverviewTab({ policy }: MemoryPlaybookOverviewTabProps) {
  const hasStructuredOverview = Boolean(
    policy.manages?.length ||
      policy.runs_when?.length ||
      policy.learns?.length ||
      policy.confidence_explanation ||
      policy.review_examples?.length
  );

  return (
    <div className="space-y-8">
      {policy.summary ? (
        <p className="text-base text-foreground/85 leading-relaxed max-w-3xl">{policy.summary}</p>
      ) : null}

      {policy.manages?.length ? (
        <OverviewSection
          icon={Database}
          title="Records Salt keeps up to date"
          description="Memory surfaces this playbook watches and maintains."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {policy.manages.map((item) => (
              <RecordTypeCard
                key={item.record_type}
                recordType={item.record_type}
                description={item.description}
              />
            ))}
          </div>
        </OverviewSection>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {policy.runs_when?.length ? (
          <OverviewPanel icon={Zap} title="When Salt updates records">
            <ul className="space-y-2.5">
              {policy.runs_when.map((trigger) => (
                <li
                  key={trigger}
                  className="flex items-start gap-2.5 text-sm text-foreground/85 leading-snug"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/35" />
                  {trigger}
                </li>
              ))}
            </ul>
          </OverviewPanel>
        ) : null}

        {policy.confidence_explanation ? (
          <OverviewPanel icon={CheckCircle2} title="How Salt decides">
            <ConfidenceExplainer
              explanation={policy.confidence_explanation}
              threshold={policy.auto_apply_threshold}
            />
          </OverviewPanel>
        ) : null}
      </div>

      {policy.learns?.length ? (
        <OverviewSection
          icon={Database}
          title="What Salt figures out"
          description="Fields Salt infers from connected account signals."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {policy.learns.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  Evidence from {item.confidence_sources}
                </p>
              </div>
            ))}
          </div>
        </OverviewSection>
      ) : null}

      {policy.review_examples?.length ? (
        <OverviewSection
          icon={AlertCircle}
          title="What you might see for review"
          description="Rare cases where Salt waits for you instead of guessing."
        >
          <div className="space-y-2">
            {policy.review_examples.map((example) => (
              <div
                key={example}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-foreground/80"
              >
                {example}
              </div>
            ))}
          </div>
        </OverviewSection>
      ) : null}

      {!hasStructuredOverview && policy.procedure ? (
        <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-4">
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {policy.procedure}
            </ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OverviewSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function OverviewPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/15 p-4 sm:p-5 h-full">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RecordTypeCard({
  recordType,
  description,
}: {
  recordType: string;
  description: string;
}) {
  const meta = RECORD_TYPE_META[recordType] ?? {
    icon: Database,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted/50",
  };
  const Icon = meta.icon;

  const content = (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          meta.bgClass
        )}
      >
        <Icon className={cn("size-4", meta.iconClass)} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{recordType}</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </>
  );

  const className =
    "flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 px-4 py-3 transition-colors";

  if (meta.href) {
    return (
      <Link href={meta.href} className={cn(className, "hover:border-border hover:bg-muted/30")}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function ConfidenceExplainer({
  explanation,
  threshold,
}: {
  explanation: string;
  threshold: number;
}) {
  const paragraphs = explanation
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Auto-apply at
          </p>
          <p className="font-display text-xl tabular-nums text-foreground">{threshold}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70"
            style={{ width: `${threshold}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm text-foreground/80 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
