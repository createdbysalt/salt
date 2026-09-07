"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronsUpDown,
  CornerDownRight,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import type {
  PlaybookBranchStep,
  PlaybookDefinitionV2,
  PlaybookStep,
  PlaybookStepApproval,
  PlaybookTrigger,
  RecordConditionEntity,
  RecordConditionOp,
} from "../playbooks/schema/v2/types";
import type { PlaybookConnectorStats } from "../queries";
import {
  updatePlaybookDefinitionAction,
  resetPlaybookToDefaultAction,
} from "../actions/update-playbook-definition";
import {
  testRecordConditionAction,
  type RecordConditionTestResult,
} from "../actions/record-conditions";
import { addPlaybookApp, removePlaybookApp } from "../actions/playbook-settings";
import {
  collectPlaybookTriggers,
  getStepApproval,
  getStepPlainLanguage,
} from "../utils/playbook-display";
import { resolvePlaybookToolSlug } from "../lib/playbook-email-slot";
import { getActingTriggerSignals } from "@/app/_lib/learning/signals";
import type { SignalSurface } from "@/app/_lib/learning/types";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import { MemoryRecordTabHeader } from "@/app/_features/memory/components/MemoryRecordTabHeader";
import {
  defaultRecordConditionTrigger,
  findFieldDescriptor,
  listRecordConditionFields,
  RECORD_CONDITION_ENTITIES,
  RECORD_CONDITION_ENTITY_LABELS,
  RECORD_CONDITION_OP_LABELS,
  RECORD_CONDITION_OPS,
} from "../playbooks/record-conditions";

interface PlaybookOverviewTabProps {
  slug: string;
  definition: PlaybookDefinitionV2;
  /** "workspace" when the workspace has forked Salt's default. */
  origin: "workspace" | "repo";
  connectorStats?: PlaybookConnectorStats;
  appSelections: string[];
}

const SURFACE_LABELS: Record<string, string> = {
  person: "People",
  organization: "Organizations",
  work: "Work",
  billing: "Billing",
  meeting: "Meetings",
  resource: "Files",
  note: "Notes",
  operator: "You",
  capture: "Capture",
  workspace: "Workspace",
};

const DOW_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function PlaybookOverviewTab({
  slug,
  definition,
  origin,
  connectorStats,
  appSelections,
}: PlaybookOverviewTabProps) {
  return (
    <div className="space-y-4">
      <MemoryRecordTabHeader title="Overview" />
      <div className="space-y-8">
        {origin === "workspace" ? <CustomizedBanner slug={slug} /> : null}

        <WhatItDoesSection
          slug={slug}
          definition={definition}
          appSelections={appSelections}
        />
        <WhenItRunsSection slug={slug} definition={definition} />
        <WhatItNeedsSection
          slug={slug}
          definition={definition}
          connectorStats={connectorStats}
          appSelections={appSelections}
        />
      </div>
    </div>
  );
}

/* ── Customized-from-Salt banner (replaces ManagedPlaybookCallout) ────────── */

function CustomizedBanner({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const reset = async () => {
    setBusy(true);
    const result = await resetPlaybookToDefaultAction(slug);
    setBusy(false);
    if (result.success) {
      toast.success("Back to Salt's default.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not reset");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Customized from Salt&apos;s default — your changes only affect this
        workspace.
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void reset()}
        disabled={busy}
        className="shrink-0"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
        Reset to default
      </Button>
    </div>
  );
}

/* ── What it does ─────────────────────────────────────────────────────────── */

function WhatItDoesSection({
  slug,
  definition,
  appSelections,
}: {
  slug: string;
  definition: PlaybookDefinitionV2;
  appSelections: string[];
}) {
  const steps = definition.steps ?? [];
  if (steps.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionTitle
        title="What it does"
        hint="Plain-language steps, each with its own autonomy."
      />
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        <ul className="divide-y divide-border/40">
          {steps.map((step, index) =>
            step.step === "branch" ? (
              <BranchStepGroup
                key={step.id ?? `branch-${index}`}
                slug={slug}
                step={step}
                number={String(index + 1)}
                appSelections={appSelections}
              />
            ) : (
              <StepAutonomyRow
                key={"id" in step && step.id ? step.id : `step-${index}`}
                slug={slug}
                step={step}
                number={String(index + 1)}
                appSelections={appSelections}
              />
            )
          )}
        </ul>
      </div>
    </section>
  );
}

/**
 * A decision step and the steps that only run when it proceeds. Renders as a
 * collapsible group: the rail drops from the decision row into an "If it
 * proceeds" panel. Child steps carry no number — the rail and caption already
 * say they're nested.
 */
function BranchStepGroup({
  slug,
  step,
  number,
  appSelections,
}: {
  slug: string;
  step: PlaybookBranchStep;
  /** Top-level position, e.g. "3". Omitted for nested groups. */
  number?: string;
  appSelections: string[];
}) {
  const [open, setOpen] = React.useState(true);
  const meta = getStepPlainLanguage(step);
  const children = step.steps ?? [];
  const panelId = `branch-${step.id ?? number ?? "nested"}-steps`;
  const caption = step.if ? "If it proceeds" : "When it applies";

  return (
    <li className="py-2.5 first:pt-1 last:pb-1">
      <div className="flex items-center gap-3">
        {number ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border/60 text-[11px] text-muted-foreground">
            {number}
          </span>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="truncate text-sm text-foreground">{meta.label}</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:text-foreground",
              !open && "-rotate-90"
            )}
          />
        </button>
        <span className="shrink-0 text-xs text-muted-foreground/70">
          Runs on its own
        </span>
      </div>

      <div className="ml-2.5 border-l border-border/50 pl-5">
        {open ? (
          <div id={panelId}>
            <p className="flex items-center gap-1.5 pb-0.5 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              <CornerDownRight className="size-3" />
              {caption}
            </p>
            <ul className="divide-y divide-border/40">
              {children.map((child, childIndex) =>
                child.step === "branch" ? (
                  <BranchStepGroup
                    key={child.id ?? `branch-${childIndex}`}
                    slug={slug}
                    step={child}
                    appSelections={appSelections}
                  />
                ) : (
                  <StepAutonomyRow
                    key={
                      "id" in child && child.id
                        ? child.id
                        : `step-${number}-${childIndex}`
                    }
                    slug={slug}
                    step={child}
                    appSelections={appSelections}
                  />
                )
              )}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={panelId}
            className="py-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            {children.length} step{children.length === 1 ? "" : "s"}{" "}
            {step.if ? "if it proceeds" : "when it applies"}
          </button>
        )}
      </div>
    </li>
  );
}

function StepAutonomyRow({
  slug,
  step,
  number,
  appSelections,
}: {
  slug: string;
  step: PlaybookStep;
  /** Top-level position, e.g. "2". Omitted inside a branch group. */
  number?: string;
  appSelections: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const resolvedTool =
    step.step === "action"
      ? resolvePlaybookToolSlug(step.tool, appSelections)
      : undefined;
  const meta = getStepPlainLanguage(step, { resolvedTool });
  const stepId = "id" in step && step.id ? step.id : null;
  const approval = getStepApproval(step);
  const current: PlaybookStepApproval =
    approval === "trust_dial" ? "auto" : approval;

  const changeApproval = async (value: string) => {
    if (!stepId) return;
    setBusy(true);
    const result = await updatePlaybookDefinitionAction(slug, {
      stepApprovals: { [stepId]: value as PlaybookStepApproval },
    });
    setBusy(false);
    if (result.success) {
      toast.success("Saved — future runs will follow this.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not save");
    }
  };

  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
      {number ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border/60 text-[11px] text-muted-foreground">
          {number}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{meta.label}</p>
        {meta.guardrail ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/80">
            <Lock className="size-3" />
            Salt needs this step to keep the play safe — you can change when it
            asks, not remove it.
          </p>
        ) : null}
      </div>
      {!stepId ? (
        <span className="shrink-0 text-xs text-muted-foreground/70">
          {current === "auto" ? "Runs on its own" : "Asks you first"}
        </span>
      ) : (
        <Select
          value={current}
          onValueChange={(value) => void changeApproval(value)}
          disabled={busy}
        >
          <SelectTrigger
            aria-label={
              number ? `Autonomy for step ${number}` : `Autonomy for ${meta.label}`
            }
            className="h-8 w-[150px] shrink-0 rounded-full text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Runs on its own</SelectItem>
            <SelectItem value="ask">Asks you first</SelectItem>
          </SelectContent>
        </Select>
      )}
    </li>
  );
}

/* ── When it runs ─────────────────────────────────────────────────────────── */

function defaultTriggerForKind(kind: string): PlaybookTrigger | null {
  if (kind === "signal") {
    const first = getActingTriggerSignals()[0];
    return first ? { type: "signal", signal: first.key } : null;
  }
  if (kind === "schedule") return { type: "schedule", cron: "0 9 * * 1" };
  if (kind === "record_condition") return defaultRecordConditionTrigger();
  return { type: "manual" };
}

function WhenItRunsSection({
  slug,
  definition,
}: {
  slug: string;
  definition: PlaybookDefinitionV2;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const triggers = collectPlaybookTriggers(definition);
  const list = triggers.length > 0 ? triggers : [{ type: "manual" as const }];

  const saveList = async (next: PlaybookTrigger[]) => {
    setBusy(true);
    const result = await updatePlaybookDefinitionAction(slug, {
      triggers: next,
    });
    setBusy(false);
    if (result.success) {
      toast.success("Saved — future runs will follow this.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not save");
    }
  };

  return (
    <section className="space-y-3">
      <SectionTitle
        title="When it runs"
        hint="What sets this play off — any of these can start a run."
      />
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        <ul className="divide-y divide-border/40">
          {list.map((trigger, index) => (
            <TriggerRow
              key={`${trigger.type}-${index}`}
              trigger={trigger}
              busy={busy}
              canRemove={list.length > 1}
              onSave={(next) => {
                const updated = [...list];
                updated[index] = next;
                void saveList(updated);
              }}
              onRemove={() => {
                void saveList(list.filter((_, i) => i !== index));
              }}
            />
          ))}
        </ul>
        <div className="border-t border-border/40 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              const extra = defaultTriggerForKind("signal");
              if (!extra) return;
              void saveList([...list, extra]);
            }}
          >
            <Plus className="size-3.5" />
            Add another way to run
          </Button>
        </div>
        <TriggerAdjustments slug={slug} definition={definition} triggers={list} />
      </div>
    </section>
  );
}

/**
 * One trigger as a sentence: the kind pill leads, the detail editor flows
 * inline after it, and removal sits at the end of the row.
 */
function TriggerRow({
  trigger,
  busy,
  canRemove,
  onSave,
  onRemove,
}: {
  trigger: PlaybookTrigger;
  busy: boolean;
  canRemove: boolean;
  onSave: (_next: PlaybookTrigger) => void;
  onRemove: () => void;
}) {
  const kind = trigger.type ?? "manual";

  const changeKind = (nextKind: string) => {
    if (nextKind === kind) return;
    const next = defaultTriggerForKind(nextKind);
    if (next) onSave(next);
  };

  return (
    <li className="py-3 first:pt-2 last:pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={changeKind} disabled={busy}>
          <SelectTrigger
            aria-label="Trigger kind"
            className="h-8 w-auto max-w-[260px] rounded-full text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="signal">When something happens (a signal)</SelectItem>
            <SelectItem value="record_condition">
              When a record matches a condition
            </SelectItem>
            <SelectItem value="schedule">On a schedule</SelectItem>
            <SelectItem value="manual">Only when I run it</SelectItem>
          </SelectContent>
        </Select>

        {kind === "signal" && trigger.type === "signal" ? (
          <SignalTriggerEditor
            trigger={trigger}
            busy={busy}
            onSave={async (next) => onSave(next)}
          />
        ) : null}
        {kind === "record_condition" && trigger.type === "record_condition" ? (
          <RecordConditionTriggerEditor
            trigger={trigger}
            busy={busy}
            onSave={async (next) => onSave(next)}
          />
        ) : null}
        {kind === "schedule" && trigger.type === "schedule" ? (
          <ScheduleTriggerEditor
            trigger={trigger}
            busy={busy}
            onSave={async (next) => onSave(next)}
          />
        ) : null}
        {kind === "manual" ? (
          <span className="text-xs text-muted-foreground">
            Runs only when you start it from the Plays page.
          </span>
        ) : null}

        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Remove this trigger"
            disabled={busy}
            onClick={onRemove}
            className="ml-auto shrink-0 text-muted-foreground/70 hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function SignalTriggerEditor({
  trigger,
  busy,
  onSave,
}: {
  trigger: Extract<PlaybookTrigger, { type: "signal" }>;
  busy: boolean;
  onSave: (_next: PlaybookTrigger) => Promise<void>;
}) {
  const signals = getActingTriggerSignals();
  const current = trigger.signal ?? trigger.signals?.[0] ?? "";
  const [open, setOpen] = React.useState(false);

  const grouped = new Map<string, typeof signals>();
  for (const signal of signals) {
    const label = SURFACE_LABELS[signal.surface as SignalSurface] ?? signal.surface;
    const list = grouped.get(label) ?? [];
    list.push(signal);
    grouped.set(label, list);
  }

  const currentSignal = signals.find((signal) => signal.key === current);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Signal"
        disabled={busy}
        className={cn(
          "flex h-8 w-auto min-w-[220px] max-w-[360px] items-center justify-between gap-1.5 rounded-full border border-input bg-background py-2 pl-2.5 pr-2 text-xs whitespace-nowrap transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"
        )}
      >
        <span className="line-clamp-1">
          {currentSignal?.description ?? "Pick a signal"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] gap-0 p-0">
        <Command>
          <CommandInput placeholder="Search signals…" />
          <CommandList>
            <CommandEmpty>No signal matches that search.</CommandEmpty>
            {[...grouped.entries()].map(([surface, surfaceSignals], index) => (
              <React.Fragment key={surface}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={surface}>
                  {surfaceSignals.map((signal) => (
                    <CommandItem
                      key={signal.key}
                      value={`${signal.description} ${signal.key.replace(/_/g, " ")}`}
                      data-checked={signal.key === current || undefined}
                      onSelect={() => {
                        setOpen(false);
                        if (signal.key !== current) {
                          void onSave({
                            ...trigger,
                            signal: signal.key,
                            signals: undefined,
                          });
                        }
                      }}
                    >
                      {signal.description}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RecordConditionTriggerEditor({
  trigger,
  busy,
  onSave,
}: {
  trigger: Extract<PlaybookTrigger, { type: "record_condition" }>;
  busy: boolean;
  onSave: (_next: PlaybookTrigger) => Promise<void>;
}) {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] =
    React.useState<RecordConditionTestResult | null>(null);

  const fieldOptions = listRecordConditionFields(trigger.entity);
  // Triggers may store either spelling; the picker selects by registry key.
  const fieldKey =
    findFieldDescriptor(trigger.entity, trigger.field)?.key ?? trigger.field;

  const save = (next: PlaybookTrigger) => {
    setTestResult(null);
    void onSave(next);
  };

  const changeEntity = (entity: string) => {
    const nextEntity = entity as RecordConditionEntity;
    const firstField = listRecordConditionFields(nextEntity)[0];
    if (!firstField) return;
    save({ ...trigger, entity: nextEntity, field: firstField.key });
  };

  const runTest = async () => {
    setTesting(true);
    const result = await testRecordConditionAction({
      entity: trigger.entity,
      field: trigger.field,
      op: trigger.op,
      value: trigger.value,
    });
    setTesting(false);
    setTestResult(result);
  };

  return (
    <div className="contents">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={trigger.entity}
          onValueChange={changeEntity}
          disabled={busy}
        >
          <SelectTrigger
            aria-label="Record type"
            className="h-8 w-[150px] rounded-full text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORD_CONDITION_ENTITIES.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {RECORD_CONDITION_ENTITY_LABELS[entity]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={fieldKey}
          onValueChange={(field) => save({ ...trigger, field })}
          disabled={busy}
        >
          <SelectTrigger
            aria-label="Field"
            className="h-8 w-[170px] rounded-full text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={trigger.op}
          onValueChange={(op) =>
            save({ ...trigger, op: op as RecordConditionOp })
          }
          disabled={busy}
        >
          <SelectTrigger
            aria-label="Operator"
            className="h-8 w-[130px] rounded-full text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORD_CONDITION_OPS.map((op) => (
              <SelectItem key={op} value={op}>
                {RECORD_CONDITION_OP_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SettingTextInput
          ariaLabel="Value"
          value={trigger.value}
          busy={busy}
          onCommit={(value) => {
            if (value.trim().length > 0) save({ ...trigger, value });
          }}
        />
      </div>

      <div className="w-full space-y-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void runTest()}
          disabled={busy || testing || trigger.value.trim().length === 0}
        >
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Test against the last 30 days
        </Button>

        {testResult ? (
          testResult.success ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {testResult.matches && testResult.matches.length > 0 ? (
                  <>
                    Would have fired{" "}
                    <span className="font-medium text-foreground">
                      {testResult.matches.length}
                    </span>{" "}
                    time{testResult.matches.length === 1 ? "" : "s"} across{" "}
                    {testResult.scanned ?? 0} recent record
                    {(testResult.scanned ?? 0) === 1 ? "" : "s"}.
                  </>
                ) : (
                  <>
                    Would not have fired — {testResult.scanned ?? 0} recent
                    record{(testResult.scanned ?? 0) === 1 ? "" : "s"} checked,
                    none matched.
                  </>
                )}
              </p>
              {testResult.matches && testResult.matches.length > 0 ? (
                <ul className="space-y-1">
                  {testResult.matches.slice(0, 5).map((match) => (
                    <li
                      key={match.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span className="text-foreground">{match.label}</span>
                      <span>
                        — {match.actualValue}
                        {match.updatedAt
                          ? `, ${new Date(match.updatedAt).toLocaleDateString()}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-destructive">
              {testResult.error ?? "Could not test the condition"}
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function ScheduleTriggerEditor({
  trigger,
  busy,
  onSave,
}: {
  trigger: Extract<PlaybookTrigger, { type: "schedule" }>;
  busy: boolean;
  onSave: (_next: PlaybookTrigger) => Promise<void>;
}) {
  // Weekday + time ↔ cron ("m h * * d"). Non-weekly crons show raw.
  const parts = trigger.cron.trim().split(/\s+/);
  const isWeekly =
    parts.length === 5 &&
    /^\d+$/.test(parts[0]) &&
    /^\d+$/.test(parts[1]) &&
    parts[2] === "*" &&
    parts[4] !== "*";

  const minute = isWeekly ? Number(parts[0]) : 0;
  const hour = isWeekly ? Number(parts[1]) : 9;
  const dow = isWeekly ? Number(parts[4]) : 1;

  const save = (nextDow: number, nextHour: number, nextMinute: number) =>
    void onSave({
      ...trigger,
      cron: `${nextMinute} ${nextHour} * * ${nextDow}`,
    });

  if (!isWeekly) {
    return (
      <p className="text-xs text-muted-foreground">
        Runs on a custom schedule ({trigger.cron}). Edit the cron in the
        Advanced tab.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Every</span>
      <Select
        value={String(dow)}
        onValueChange={(value) => save(Number(value), hour, minute)}
        disabled={busy}
      >
        <SelectTrigger
          aria-label="Weekday"
          className="h-8 w-[130px] rounded-full text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOW_LABELS.map((label, index) => (
            <SelectItem key={label} value={String(index)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">at</span>
      <Input
        type="time"
        aria-label="Time"
        value={`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
        onChange={(event) => {
          const [h, m] = event.target.value.split(":").map(Number);
          if (Number.isFinite(h) && Number.isFinite(m)) save(dow, h, m);
        }}
        disabled={busy}
        className="h-8 w-[110px] rounded-full text-xs"
      />
    </div>
  );
}

/** Play-declared adjustments: trigger.adjust keys rendered from settings. */
function TriggerAdjustments({
  slug,
  definition,
  triggers,
}: {
  slug: string;
  definition: PlaybookDefinitionV2;
  triggers: PlaybookTrigger[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const adjustKeys = [
    ...new Set(
      triggers.flatMap((trigger) =>
        trigger && "adjust" in trigger ? (trigger.adjust ?? []) : []
      )
    ),
  ];
  const settings = definition.settings ?? {};
  const fields = adjustKeys
    .map((key) => ({ key, field: settings[key] }))
    .filter((entry) => entry.field);

  if (fields.length === 0) return null;

  const save = async (key: string, value: string | number | boolean) => {
    setBusyKey(key);
    const result = await updatePlaybookDefinitionAction(slug, {
      settings: { [key]: value },
    });
    setBusyKey(null);
    if (result.success) {
      toast.success("Saved — future runs will follow this.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not save");
    }
  };

  return (
    <div className="border-t border-border/40 pb-2 pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        This play&apos;s adjustments
      </p>
      <ul className="mt-1 divide-y divide-border/30">
        {fields.map(({ key, field }) => {
          const setting = field!;
          const control =
            setting.type === "number" ? (
              <SettingNumberInput
                ariaLabel={setting.label}
                value={Number(setting.value ?? setting.default)}
                busy={busyKey === key}
                onCommit={(value) => void save(key, value)}
              />
            ) : setting.type === "select" ? (
              <Select
                value={String(setting.value ?? setting.default)}
                onValueChange={(value) => void save(key, value)}
                disabled={busyKey === key}
              >
                <SelectTrigger
                  aria-label={setting.label}
                  className="h-8 w-auto min-w-[120px] rounded-full text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(setting.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <SettingTextInput
                ariaLabel={setting.label}
                value={String(setting.value ?? setting.default)}
                busy={busyKey === key}
                onCommit={(value) => void save(key, value)}
              />
            );

          // Labels declare where the control sits with a {value} placeholder
          // ("Wait {value} days after the due date") — render the sentence
          // with the input inline. Fallback: label followed by the control.
          const parts = setting.label.split("{value}");

          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-x-1.5 gap-y-2 py-2"
            >
              {parts.length > 1 ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {parts[0].trim()}
                  </span>
                  {control}
                  <span className="text-sm text-muted-foreground">
                    {parts.slice(1).join("{value}").trim()}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    {setting.label}
                  </span>
                  {control}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SettingNumberInput({
  ariaLabel,
  value,
  busy,
  onCommit,
}: {
  ariaLabel: string;
  value: number;
  busy: boolean;
  onCommit: (_value: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next === value) {
      setDraft(String(value));
      return;
    }
    onCommit(next);
  };

  return (
    <Input
      type="number"
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      disabled={busy}
      className="h-8 w-16 rounded-full text-center text-xs"
    />
  );
}

function SettingTextInput({
  ariaLabel,
  value,
  busy,
  onCommit,
}: {
  ariaLabel: string;
  value: string;
  busy: boolean;
  onCommit: (_value: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft === value) return;
    onCommit(draft);
  };

  return (
    <Input
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      disabled={busy}
      className="h-8 w-56 rounded-full text-xs"
    />
  );
}

/* ── What it needs ────────────────────────────────────────────────────────── */

function WhatItNeedsSection({
  slug,
  definition,
  connectorStats,
  appSelections,
}: {
  slug: string;
  definition: PlaybookDefinitionV2;
  connectorStats?: PlaybookConnectorStats;
  appSelections: string[];
}) {
  const categories = definition.requirements?.categories;
  if (!categories || (!categories.required?.length && !categories.optional?.length)) {
    return null;
  }

  const requiredSet = new Set<string>(categories.required ?? []);
  const optionalSet = new Set<string>(categories.optional ?? []);
  const rows = (connectorStats?.coverage ?? []).filter(
    (c) => requiredSet.has(c.category) || optionalSet.has(c.category)
  );

  return (
    <section className="space-y-3">
      <SectionTitle
        title="What it needs"
        hint="Apps this play is allowed to touch. Email is one inbox."
      />
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-2 sm:px-5">
        <ul className="divide-y divide-border/40">
          {rows.map((row) => (
            <CategoryAppRow
              key={row.category}
              slug={slug}
              category={row.category}
              required={requiredSet.has(row.category)}
              apps={row.apps}
              providers={row.providers}
              catalogIds={row.catalogIds}
              selections={appSelections}
            />
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 py-2">
          <p className="text-xs text-muted-foreground/80">
            Only apps you add are used. Adding another inbox switches this play
            over. New connections stay out until you add them.
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sources?tab=connectors">
              <Plus className="size-3.5" />
              Connect more apps
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function CategoryAppRow({
  slug,
  category,
  required,
  apps,
  providers,
  catalogIds,
  selections,
}: {
  slug: string;
  category: string;
  required: boolean;
  apps: string[];
  providers: string[];
  catalogIds: string[];
  selections: string[];
}) {
  const router = useRouter();
  const [busyProvider, setBusyProvider] = React.useState<string | null>(null);
  const selected = providers
    .map((provider, index) => ({
      provider,
      app: apps[index] ?? provider,
      catalogId: catalogIds[index] ?? provider,
    }))
    .filter((entry) => selections.includes(entry.provider));
  const available = providers
    .map((provider, index) => ({
      provider,
      app: apps[index] ?? provider,
      catalogId: catalogIds[index] ?? provider,
    }))
    .filter((entry) => !selections.includes(entry.provider));

  const add = async (provider: string) => {
    setBusyProvider(provider);
    const result = await addPlaybookApp(slug, provider);
    setBusyProvider(null);
    if (result.success) {
      const added = available.find((entry) => entry.provider === provider);
      if (category === "email" && added) {
        toast.success(`This play now drafts in ${added.app}.`);
      }
      router.refresh();
    } else {
      toast.error(result.error ?? "Could not add");
    }
  };

  const remove = async (provider: string) => {
    setBusyProvider(provider);
    const result = await removePlaybookApp(slug, provider);
    setBusyProvider(null);
    if (result.success) router.refresh();
    else toast.error(result.error ?? "Could not remove");
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 first:pt-1 last:pb-1">
      <div className="flex w-24 shrink-0 flex-col gap-0.5">
        <span className="text-sm font-medium capitalize text-foreground">
          {category}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            required
              ? "text-amber-600 dark:text-amber-500"
              : "text-muted-foreground/70"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              required ? "bg-amber-500" : "bg-muted-foreground/40"
            )}
          />
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {providers.length === 0 ? (
          <span className="text-xs text-muted-foreground/70">
            No app connected yet — connect one to add it here
          </span>
        ) : selected.length === 0 ? (
          <span className="text-xs text-muted-foreground/70">
            No apps added — this play can&apos;t use {category} yet
          </span>
        ) : (
          selected.map((entry) => (
            <span
              key={entry.provider}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-foreground"
            >
              <ConnectorIcon
                id={entry.catalogId as ConnectorCatalogId}
                size={12}
              />
              {entry.app}
              <button
                type="button"
                aria-label={`Remove ${entry.app}`}
                disabled={busyProvider === entry.provider}
                onClick={() => void remove(entry.provider)}
                className="text-muted-foreground hover:text-foreground"
              >
                {busyProvider === entry.provider ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            </span>
          ))
        )}
        {available.length > 0 ? (
          <Select
            value=""
            onValueChange={(provider) => void add(provider)}
            disabled={busyProvider !== null}
          >
            <SelectTrigger
              aria-label={`Add ${category} app`}
              className="h-[26px]! w-auto min-w-[88px] rounded-full border-dashed py-0 text-xs text-muted-foreground"
            >
              <Plus className="size-3.5" />
              <SelectValue
                placeholder={
                  category === "email" && selected.length > 0
                    ? "Switch inbox"
                    : "Add app"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {available.map((entry) => (
                <SelectItem key={entry.provider} value={entry.provider}>
                  <ConnectorIcon
                    id={entry.catalogId as ConnectorCatalogId}
                    size={14}
                  />
                  {entry.app}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </li>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────────── */

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
