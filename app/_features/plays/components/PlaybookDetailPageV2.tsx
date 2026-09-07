"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Package,
  Wrench,
  Folder,
  File,
  FileText,
  Code2,
  Radio,
  Columns,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  memoryDetailShellClass,
  memoryTabsListClass,
  memoryTabTriggerClass,
  memoryTabPanelClass,
} from "@/app/_features/memory/utils/memory-layout";
import { PlaybookHeroV2 } from "./PlaybookHeroV2";
import { PlaybookOverviewTab } from "./PlaybookOverviewTab";
import { PlaybookActivityTab } from "./PlaybookActivityTab";
import { PlaybookCustomizeTab } from "./PlaybookCustomizeTab";
import { MemoryRecordTabHeader } from "@/app/_features/memory/components/MemoryRecordTabHeader";
import type { PlaybookListItem } from "../playbooks/queries-v2";
import type {
  PlaybookDefinitionV2,
} from "../playbooks/schema/v2/types";
import type { PackageData } from "../playbooks/read-package-files";
import type { PlaybookConnectorStats, PlaybookRunListItem } from "../queries";
import type { PlaybookRunStats } from "../run-stats";
import type { PlaybookApprovalRate } from "../services/earned-autonomy";
import type {
  PlaybookCustomizeEntry,
  PlaybookAdjustment,
} from "../customize/queries";
import {
  getPlaybookDataSources,
  getPlaybookTriggerSignals,
} from "../utils/playbook-display";
import { resolvePlaybookToolAllowlist } from "../lib/playbook-email-slot";

interface PlaybookDetailPageV2Props {
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
  /** "workspace" when the workspace has forked Salt's default. */
  origin: "workspace" | "repo";
  /** Real run stats over play_runs (Phase 5b). */
  runStats: PlaybookRunStats;
  /** Earned-autonomy analytics: approval rate + granted tools for this playbook. */
  approvalRate?: PlaybookApprovalRate | null;
  packageData?: PackageData | null;
  connectorStats?: PlaybookConnectorStats;
  /** Activity tab: every run attributed to this playbook, newest first. */
  runs: PlaybookRunListItem[];
  /** Customize tab data. */
  customizeEntries: PlaybookCustomizeEntry[];
  adjustments: PlaybookAdjustment[];
  openAutonomyOffers: Array<{
    playRunId: string;
    toolSlug: string;
    approvedCount: number;
  }>;
  /** Overview tab: providers the owner has opted this play into. */
  appSelections: string[];
}

/** Advanced is our debugging surface while in development — hidden in prod. */
const SHOW_ADVANCED = process.env.NODE_ENV !== "production";

export function PlaybookDetailPageV2({
  playbook,
  definition,
  origin,
  runStats,
  approvalRate,
  packageData,
  connectorStats,
  runs,
  customizeEntries,
  adjustments,
  openAutonomyOffers,
  appSelections,
}: PlaybookDetailPageV2Props) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="relative min-h-full">
      <div className={memoryDetailShellClass}>
        <Link
          href="/plays?tab=playbooks"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-4"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to Playbooks
        </Link>

        <PlaybookHeroV2
          playbook={playbook}
          runStats={runStats}
          connectorStats={connectorStats}
          waitingRunCount={
            runs.filter(
              (run) =>
                run.state !== "ran" &&
                run.state !== "failed" &&
                run.state !== "dismissed"
            ).length
          }
          onEdit={() => setTab("overview")}
          onRan={() => setTab("activity")}
        />

        {playbook.enabled && (playbook.disabledTools?.length ?? 0) > 0 && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3.5"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-600" strokeWidth={2} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                This playbook can&apos;t run right now.
              </span>{" "}
              {playbook.disabledTools!.join(", ")} changed upstream and is
              pending security re-review. Runs will pause until the review
              lands — your approval settings are untouched.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:gap-6">
          <div className="min-w-0 space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-5">
              <TabsList className={memoryTabsListClass}>
                <TabsTrigger value="overview" className={memoryTabTriggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="customize" className={memoryTabTriggerClass}>
                  Customize
                </TabsTrigger>
                {SHOW_ADVANCED ? (
                  <TabsTrigger value="advanced" className={memoryTabTriggerClass}>
                    Advanced
                  </TabsTrigger>
                ) : null}
                <TabsTrigger value="activity" className={memoryTabTriggerClass}>
                  Activity
                </TabsTrigger>
              </TabsList>

              <div className={memoryTabPanelClass}>
                <TabsContent value="overview" className="m-0">
                  <PlaybookOverviewTab
                    slug={playbook.slug}
                    definition={definition}
                    origin={origin}
                    connectorStats={connectorStats}
                    appSelections={appSelections}
                  />
                </TabsContent>

                <TabsContent value="customize" className="m-0">
                  <PlaybookCustomizeTab
                    slug={playbook.slug}
                    entries={customizeEntries}
                    adjustments={adjustments}
                    approvalRate={approvalRate}
                    openOffers={openAutonomyOffers}
                  />
                </TabsContent>

                {SHOW_ADVANCED ? (
                  <TabsContent value="advanced" className="m-0">
                    <div className="space-y-4">
                      <MemoryRecordTabHeader title="Advanced" />
                      <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3.5">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Development only.
                          </span>{" "}
                          This tab is visible because we&apos;re building. Users
                          never see signal keys, tool slugs, or file lists.
                        </p>
                      </div>
                      {packageData ? (
                        <PackageAdvancedView
                          packageData={packageData}
                          playbook={playbook}
                          definition={definition}
                          appSelections={appSelections}
                        />
                      ) : (
                        <RawJsonToggle definition={definition} />
                      )}
                    </div>
                  </TabsContent>
                ) : null}

                <TabsContent value="activity" className="m-0">
                  <PlaybookActivityTab runs={runs} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PACKAGE ADVANCED VIEW - Clean unified view for package playbooks (dev-only)
 * ──────────────────────────────────────────────────────────────────────────── */

function PackageAdvancedView({
  packageData,
  playbook,
  definition,
  appSelections,
}: {
  packageData: PackageData;
  playbook: PlaybookListItem;
  definition: PlaybookDefinitionV2;
  appSelections: string[];
}) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  // Act-layer definitions declare signals in trigger/triggers and data access
  // in fetch steps — packageData.signals/fields only exist for the retired
  // learn-layer policy block, so derive from the definition first.
  const derivedSignals = getPlaybookTriggerSignals(definition);
  const signals = derivedSignals.length > 0 ? derivedSignals : packageData.signals;
  const usesPolicyFields = packageData.fields.length > 0;
  const fields = usesPolicyFields ? packageData.fields : getPlaybookDataSources(definition);
  const fieldsLabel = usesPolicyFields ? "Fields" : "Data sources";

  const visibleSignals = showAllSignals ? signals : signals.slice(0, 6);
  const visibleFields = showAllFields ? fields : fields.slice(0, 6);
  const tools = definition.tools?.length
    ? resolvePlaybookToolAllowlist(definition.tools, appSelections)
    : [];

  return (
    <div className="space-y-6">
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
                <span className="text-xs text-muted-foreground">({signals.length})</span>
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
            {signals.length > 6 && (
              <button
                onClick={() => setShowAllSignals(!showAllSignals)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showAllSignals ? (
                  <>Show less</>
                ) : (
                  <>Show all {signals.length}</>
                )}
              </button>
            )}
          </div>
        </section>

        {/* Fields / Data sources */}
        <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{fieldsLabel}</h3>
                <span className="text-xs text-muted-foreground">({fields.length})</span>
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
            {fields.length > 6 && (
              <button
                onClick={() => setShowAllFields(!showAllFields)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showAllFields ? (
                  <>Show less</>
                ) : (
                  <>Show all {fields.length}</>
                )}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Tools this play will actually run, given the inbox on Overview. */}
      <section className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Tools</h3>
            <span className="text-xs text-muted-foreground">({tools.length})</span>
          </div>
        </div>
        <div className="p-4">
          {tools.length ? (
            <div className="space-y-2">
              {tools.map((tool) => (
                <div key={tool} className="flex items-center justify-between text-sm font-mono bg-muted/30 px-3 py-2 rounded-lg">
                  <span className="text-foreground">{tool}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tools declared. Action steps must name a tool listed here.
            </p>
          )}
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
 * RAW JSON (dev-only fallback for non-package playbooks)
 * ──────────────────────────────────────────────────────────────────────────── */

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
