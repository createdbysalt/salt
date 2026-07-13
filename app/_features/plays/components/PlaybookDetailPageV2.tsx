"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Clock,
  MousePointer,
  Database,
  Filter,
  PenLine,
  CheckCircle2,
  FileText,
  Code2,
  Settings,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Package,
  Wrench,
  Folder,
  File,
  Radio,
  Columns,
  Sparkles,
} from "lucide-react";
import { Label, Slider, Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  memoryDetailShellClass,
  memoryDetailGridClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
  memoryTabPanelClass,
} from "@/app/_features/memory/utils/memory-layout";
import { updateProfilePlaybookSettings } from "@/app/_features/people/actions/profile-fields";
import { PlaybookHeroV2 } from "./PlaybookHeroV2";
import { MemoryPlaybookOverviewTab } from "./MemoryPlaybookOverviewTab";
import { getSectionColorStyles } from "./PlaybookSectionNav";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type {
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookClassifyStep,
  PlaybookSection,
} from "../playbooks/schema/v2/types";
import type {
  ProfileFillRule,
  ProfilePlaybookSettings,
  ProfileProvenanceStats,
} from "../playbooks/records-engine/types";
import type { PackageData } from "../playbooks/read-package-files";
import type { PlaybookConnectorStats } from "../queries";

interface PlaybookDetailPageV2Props {
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
  stats: ProfileProvenanceStats;
  settings: ProfilePlaybookSettings | null;
  settingsBlueprintSlug: string;
  playbookMdContent?: string | null;
  packageData?: PackageData | null;
  connectorStats?: PlaybookConnectorStats;
}

export function PlaybookDetailPageV2({
  playbook,
  definition,
  stats,
  settings,
  settingsBlueprintSlug,
  playbookMdContent,
  packageData,
  connectorStats,
}: PlaybookDetailPageV2Props) {
  const [tab, setTab] = useState("overview");
  const sectionStyles = getSectionColorStyles(playbook.section as PlaybookSection);
  const isMemoryPlaybook = playbook.layer === "learn";
  const policy = definition.policy;
  const showSidebar = isMemoryPlaybook && !!policy;
  const hasPlaybookMd = !!playbookMdContent;
  const hasPackage = !!packageData;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryDetailShellClass}>
        <Link
          href="/plays?tab=customize&customize=playbooks"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-4"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Playbooks
        </Link>

        <PlaybookHeroV2 playbook={playbook} stats={stats} connectedAppCount={connectorStats?.connected ?? 0} />

        <div
          className={
            showSidebar
              ? memoryDetailGridClass
              : "grid grid-cols-1 gap-5 sm:gap-6"
          }
        >
          {/* Main content area */}
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="advanced" className={memoryTabTriggerClass}>
                  Advanced
                </TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
              {/* ═══════════════════════════════════════════════════════════════
                  OVERVIEW TAB - User friendly (renders PLAYBOOK.md if available)
                  ═══════════════════════════════════════════════════════════════ */}
              <TabsContent value="overview" className="m-0">
                {/* Package playbooks: render PLAYBOOK.md content */}
                {hasPlaybookMd ? (
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={playbookMarkdownComponents}
                    >
                      {playbookMdContent}
                    </ReactMarkdown>
                  </div>
                ) : isMemoryPlaybook && policy ? (
                  <MemoryPlaybookOverviewTab policy={policy} />
                ) : (
                  /* Fallback: Action Playbook Overview */
                  <div className="space-y-6">
                    {/* Steps summary */}
                    {definition.steps?.length ? (
                      <ContentCard title="What it does" icon={<Zap className="size-4" />}>
                        <div className="space-y-4">
                          {definition.steps.map((step, idx) => (
                            <StepCard
                              key={"id" in step && step.id ? step.id : `step-${idx}`}
                              step={step}
                              index={idx}
                              isLast={idx === definition.steps!.length - 1}
                              sectionStyles={sectionStyles}
                            />
                          ))}
                        </div>
                      </ContentCard>
                    ) : null}

                    {/* Instructions */}
                    {definition.instructions?.system && (
                      <ContentCard title="Instructions" icon={<FileText className="size-4" />}>
                        <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                          {definition.instructions.system}
                        </p>
                      </ContentCard>
                    )}

                    {/* Guidelines */}
                    {definition.instructions?.guidelines?.length ? (
                      <ContentCard title="Guidelines" icon={<CheckCircle2 className="size-4" />}>
                        <ul className="space-y-2">
                          {definition.instructions.guidelines.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle2 className="size-4 mt-0.5 text-emerald-500 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </ContentCard>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              {/* ═══════════════════════════════════════════════════════════════
                  ADVANCED TAB - Clean package view
                  ═══════════════════════════════════════════════════════════════ */}
              <TabsContent value="advanced" className="m-0 space-y-6">
                {/* Package playbooks get the clean unified view */}
                {hasPackage && packageData ? (
                  <PackageAdvancedView
                    packageData={packageData}
                    playbook={playbook}
                    definition={definition}
                    isMemoryPlaybook={isMemoryPlaybook}
                    policy={policy}
                  />
                ) : (
                  /* Fallback for non-package playbooks */
                  <div className="space-y-6">
                    <ManagedPlaybookCallout />
                    {isMemoryPlaybook && policy && (
                      <RuleConfiguration policy={policy} definition={definition} />
                    )}
                    {!isMemoryPlaybook && (
                      <RawJsonToggle definition={definition} />
                    )}
                  </div>
                )}
              </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Sidebar */}
          {showSidebar ? (
            <PlaybookSidebar
              playbook={playbook}
              definition={definition}
              settings={settings}
              settingsBlueprintSlug={settingsBlueprintSlug}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PLAYBOOK MARKDOWN COMPONENTS
 * ───────────────────────────────────────────────────────────────────────────── */

const playbookMarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4 first:mt-0">{children}</h2>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h4>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-sm font-semibold text-foreground mt-4 mb-2">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-foreground leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-2 mb-4 text-sm text-foreground">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-2 mb-4 text-sm text-foreground">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-foreground">{children}</li>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block font-mono text-xs bg-muted/50 rounded-lg border border-border/40 p-4 overflow-x-auto mb-4">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-4">{children}</pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/30">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left px-3 py-2 text-xs font-semibold text-foreground border-b border-border/50">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-sm text-foreground border-b border-border/30">{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground mb-4">
      {children}
    </blockquote>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-6 border-border/50" />,
};

/* ─────────────────────────────────────────────────────────────────────────────
 * MANAGED PLAYBOOK CALLOUT
 * ───────────────────────────────────────────────────────────────────────────── */

function ManagedPlaybookCallout() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky/20 bg-sky/5 px-4 py-3.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-sky/25 bg-sky/10">
        <Sparkles className="size-4 text-sky" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">Salt-managed playbook</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Read-only reference for how Salt configures and runs this play. Nothing to change here.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PACKAGE ADVANCED VIEW - Clean unified view for package playbooks
 * ───────────────────────────────────────────────────────────────────────────── */

function PackageAdvancedView({
  packageData,
  playbook,
  definition,
  isMemoryPlaybook,
  policy,
}: {
  packageData: PackageData;
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
  isMemoryPlaybook: boolean;
  policy: PlaybookDefinitionV2["policy"];
}) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const visibleSignals = showAllSignals ? packageData.signals : packageData.signals.slice(0, 6);
  const visibleFields = showAllFields ? packageData.fields : packageData.fields.slice(0, 6);

  return (
    <div className="space-y-6">
      <ManagedPlaybookCallout />

      {/* Package Files */}
      <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Package Files</h3>
            <span className="text-xs text-muted-foreground">({packageData.files.length})</span>
          </div>
        </div>
        <div className="p-4 space-y-1">
          <div className="font-mono text-sm flex items-center gap-2 text-muted-foreground mb-2">
            <Folder className="size-4" />
            <span>{playbook.slug}/</span>
          </div>
          {packageData.files.map((file) => (
            <div key={file.path}>
              <button
                onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                className="w-full flex items-center gap-2 pl-6 py-1.5 hover:bg-muted/50 rounded-lg transition-colors text-left"
              >
                <ChevronRight className={cn("size-3 text-muted-foreground transition-transform", expandedFile === file.path && "rotate-90")} />
                <FileIcon type={file.type} />
                <span className="text-sm font-mono text-foreground flex-1">{file.path}</span>
                <Check className="size-3 text-emerald-500" />
              </button>
              {expandedFile === file.path && file.content && (
                <div className="ml-6 mt-2 mb-3">
                  <pre className="text-xs font-mono bg-muted/50 rounded-lg border border-border/40 p-4 overflow-x-auto max-h-[400px] overflow-y-auto text-foreground/80">
                    {file.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Signals & Fields - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signals */}
        <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Signals</h3>
                <span className="text-xs text-muted-foreground">({packageData.signals.length})</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-1.5">
              {visibleSignals.map((signal) => (
                <div key={signal} className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded">
                  {signal}
                </div>
              ))}
            </div>
            {packageData.signals.length > 6 && (
              <button
                onClick={() => setShowAllSignals(!showAllSignals)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showAllSignals ? (
                  <>Show less</>
                ) : (
                  <>Show all {packageData.signals.length}</>
                )}
              </button>
            )}
          </div>
        </section>

        {/* Fields */}
        <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Fields</h3>
                <span className="text-xs text-muted-foreground">({packageData.fields.length})</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-1.5">
              {visibleFields.map((field, idx) => (
                <div key={`${field}-${idx}`} className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded">
                  {field}
                </div>
              ))}
            </div>
            {packageData.fields.length > 6 && (
              <button
                onClick={() => setShowAllFields(!showAllFields)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showAllFields ? (
                  <>Show less</>
                ) : (
                  <>Show all {packageData.fields.length}</>
                )}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Tools */}
      <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Tools</h3>
            <span className="text-xs text-muted-foreground">({packageData.tools.length})</span>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {packageData.tools.map((tool) => (
              <div key={tool.name} className="flex items-center justify-between text-sm font-mono bg-muted/30 px-3 py-2 rounded-lg">
                <span className="text-foreground">{tool.name}</span>
                {tool.protection && (
                  <span className="text-xs text-muted-foreground">{tool.protection}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  switch (type) {
    case "yaml":
      return <File className="size-4 text-amber-500" />;
    case "md":
      return <FileText className="size-4 text-blue-500" />;
    case "ts":
      return <Code2 className="size-4 text-emerald-500" />;
    default:
      return <File className="size-4 text-muted-foreground" />;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SUB-COMPONENTS
 * ───────────────────────────────────────────────────────────────────────────── */

function ContentCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("mt-0.5 capitalize", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function FillRuleCard({ rule, threshold }: { rule: ProfileFillRule; threshold: number }) {
  const autoApplies = rule.confidence >= threshold;

  return (
    <div className="rounded-lg border border-border/50 p-3 bg-muted/20 font-mono text-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-muted-foreground">
            <span className="text-foreground font-semibold">{rule.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">when </span>
            <span className="text-foreground">{rule.when.signal}</span>
            <span className="text-muted-foreground"> {rule.when.op} </span>
            <span className="text-foreground">{String(rule.when.value)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">set </span>
            <span className="text-foreground">{rule.field}</span>
            <span className="text-muted-foreground"> = </span>
            <span className="text-emerald-600 dark:text-emerald-400">"{rule.set.value}"</span>
          </div>
        </div>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums px-2 py-1 rounded shrink-0",
            autoApplies
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}
        >
          {rule.confidence}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 font-sans text-xs">{rule.because}</p>
    </div>
  );
}

function StepCard({
  step,
  index,
  isLast,
  sectionStyles,
}: {
  step: PlaybookStep;
  index: number;
  isLast: boolean;
  sectionStyles: ReturnType<typeof getSectionColorStyles>;
}) {
  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "size-8 rounded-lg grid place-items-center shrink-0",
              step.step === "fetch" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              step.step === "classify" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              step.step === "draft" && cn(sectionStyles.bg, sectionStyles.text)
            )}
          >
            {step.step === "fetch" && <Database className="size-4" strokeWidth={2} />}
            {step.step === "classify" && <Filter className="size-4" strokeWidth={2} />}
            {step.step === "draft" && <PenLine className="size-4" strokeWidth={2} />}
          </span>
          {!isLast && <div className="w-px h-6 bg-border/50 mt-2" />}
        </div>
        <div className="flex-1 min-w-0 pb-2">
          <p className="text-sm font-medium text-foreground">
            {step.step === "fetch" ? "Gather data" : step.step === "classify" ? "Apply rules" : "Create draft"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step.step === "fetch" && `Pull ${step.id} from ${step.from}`}
            {step.step === "classify" && `Sort using ${(step as PlaybookClassifyStep).rules?.length ?? 0} rules`}
            {step.step === "draft" && (step.prompt.length > 80 ? step.prompt.slice(0, 80) + "…" : step.prompt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function TriggerIcon({ type }: { type: string }) {
  if (type === "signal") return <Zap className="size-4" />;
  if (type === "schedule") return <Clock className="size-4" />;
  return <MousePointer className="size-4" />;
}

function getTriggerDescription(definition: PlaybookDefinitionV2): string {
  const trigger = definition.trigger ?? definition.triggers?.[0];
  if (!trigger) return "You run this playbook manually when needed.";

  if (trigger.type === "signal") {
    const signalMap: Record<string, string> = {
      person_created: "Runs when a new person is added to Memory.",
      person_updated: "Runs when a person record is updated.",
      billing_due_date_passed: "Runs when an invoice becomes overdue.",
      meeting_end_passed: "Runs after a meeting ends.",
    };
    // Support both single signal and signals array
    const signal = "signal" in trigger && trigger.signal
      ? trigger.signal
      : ("signals" in trigger && trigger.signals?.[0]) || "unknown";
    return signalMap[signal] ?? `Runs on "${signal.replace(/_/g, " ")}" signal.`;
  }
  if (trigger.type === "schedule") {
    if (trigger.cron === "0 9 * * *") return "Runs every day at 9:00 AM.";
    return `Scheduled: ${trigger.cron}`;
  }
  return "You run this playbook manually when needed.";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SIDEBAR
 * ───────────────────────────────────────────────────────────────────────────── */

function PlaybookSidebar({
  playbook,
  definition,
  settings,
  settingsBlueprintSlug,
}: {
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
  settings: ProfilePlaybookSettings | null;
  settingsBlueprintSlug: string;
}) {
  const isMemory = playbook.layer === "learn";
  const policy = definition.policy;
  const defaultThreshold = policy?.auto_apply_threshold ?? 85;

  if (!isMemory || !policy) {
    return null;
  }

  return (
    <div className="space-y-5">
      <SidebarCard title="Threshold">
        <ThresholdControl
          blueprintSlug={settingsBlueprintSlug}
          defaultThreshold={defaultThreshold}
          settings={settings}
        />
      </SidebarCard>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

type ThresholdSaveStatus = "idle" | "saving" | "saved";

function ThresholdControl({
  blueprintSlug,
  defaultThreshold,
  settings,
}: {
  blueprintSlug: string;
  defaultThreshold: number;
  settings: ProfilePlaybookSettings | null;
}) {
  const [threshold, setThreshold] = useState(settings?.autoApplyThreshold ?? defaultThreshold);
  const [status, setStatus] = useState<ThresholdSaveStatus>("idle");
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const current = settingsRef.current;
      setStatus("saving");

      const result = await updateProfilePlaybookSettings({
        blueprintSlug,
        contextFacts: current?.contextFacts ?? {},
        autoApplyThreshold: threshold,
        aiFallbackEnabled: current?.aiFallbackEnabled ?? true,
      });

      if (!result.ok) {
        console.error("[ThresholdControl] Failed to save:", result.message);
      }

      setStatus("saved");
    }, 500);

    return () => clearTimeout(timer);
  }, [threshold, blueprintSlug]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor="playbook-threshold" className="text-xs text-muted-foreground font-normal">
          Auto-apply confidence
        </Label>
        <div className="flex items-center gap-2">
          {status === "saving" && (
            <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden />
          )}
          {status === "saved" && (
            <Check className="size-3 text-muted-foreground" aria-hidden />
          )}
          <span className="font-display text-2xl text-foreground tabular-nums">{threshold}%</span>
        </div>
      </div>

      <Slider
        id="playbook-threshold"
        min={50}
        max={100}
        step={1}
        value={[threshold]}
        onValueChange={(value) => setThreshold(value[0] ?? defaultThreshold)}
        aria-label="Auto-apply confidence threshold"
      />

      <p className="text-xs text-muted-foreground">
        At {threshold}% or higher, Salt applies changes on its own. Below that, it waits for your review.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MARKDOWN COMPONENTS
 * ───────────────────────────────────────────────────────────────────────────── */

function AdvancedSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-muted-foreground mt-0.5">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="pl-7">
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function RuleConfiguration({
  policy,
  definition,
}: {
  policy: NonNullable<PlaybookDefinitionV2["policy"]>;
  definition: PlaybookDefinitionV2;
}) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Rule configuration</h4>
        <p className="text-xs text-muted-foreground">
          {policy.fill_rules.length} rules across {policy.fields.length} fields. Repeated manual corrections become proposed rule changes for your review.
        </p>

        <button
          onClick={() => setShowJson(!showJson)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronRight className={cn("size-3 transition-transform", showJson && "rotate-90")} />
          {showJson ? "Hide" : "Show"} raw JSON
        </button>

        {showJson && (
          <div className="mt-3 font-mono text-xs bg-muted/50 rounded-lg border border-border/40 p-4 overflow-x-auto max-h-[400px]">
            <pre className="text-foreground/80">
              {JSON.stringify(definition, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function RawJsonToggle({ definition }: { definition: PlaybookDefinitionV2 }) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowJson(!showJson)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ChevronRight className={cn("size-3 transition-transform", showJson && "rotate-90")} />
        {showJson ? "Hide" : "Show"} raw JSON
      </button>

      {showJson && (
        <div className="mt-3 font-mono text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto max-h-[400px]">
          <pre className="text-foreground/80">
            {JSON.stringify(definition, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
