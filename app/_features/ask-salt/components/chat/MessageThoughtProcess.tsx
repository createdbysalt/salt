"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  XCircle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import { formatToolArguments, formatToolStepLabel } from "../../tool-preview";
import { ToolApprovalActions } from "./tool";
import type { ToolPartState } from "./tool";
import { Shimmer } from "./shimmer";

type ToolLikePart = {
  type: string;
  state?: ToolPartState;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
};

type DisplayStep = {
  part: ToolLikePart;
  label: string;
  count: number;
  key: string;
};

function toolPartName(part: ToolLikePart): string {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return "tool";
}

function effectiveState(part: ToolLikePart): ToolPartState {
  const state = part.state ?? "input-streaming";
  const isDenied =
    state === "output-denied" ||
    (state === "approval-responded" && part.approval?.approved === false);
  return isDenied ? "output-denied" : state;
}

function stepIsRunning(state: ToolPartState): boolean {
  return state === "input-streaming" || state === "input-available";
}

function stepIsError(state: ToolPartState): boolean {
  return state === "output-error";
}

function stepIsDone(state: ToolPartState): boolean {
  return state === "output-available" || state === "approval-responded";
}

function buildDisplaySteps(parts: ToolLikePart[]): DisplayStep[] {
  const steps: DisplayStep[] = [];

  for (const part of parts) {
    const label = formatToolStepLabel(toolPartName(part), part.input, part.output);
    const state = effectiveState(part);
    const last = steps[steps.length - 1];
    const canMerge =
      last &&
      last.label === label &&
      stepIsDone(effectiveState(last.part)) &&
      stepIsDone(state) &&
      state !== "approval-requested";

    if (canMerge) {
      last.count += 1;
      last.part = part;
      continue;
    }

    steps.push({
      part,
      label,
      count: 1,
      key: part.toolCallId ?? `${label}-${steps.length}`,
    });
  }

  return steps;
}

function StepStatus({ state }: { state: ToolPartState }) {
  if (stepIsRunning(state)) {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted">
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      </span>
    );
  }

  if (stepIsError(state) || state === "output-denied") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-destructive/10">
        <XCircle className="size-3 text-destructive" strokeWidth={2.25} />
      </span>
    );
  }

  if (state === "approval-requested") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-500/10">
        <span className="size-2 rounded-full bg-amber-500" />
      </span>
    );
  }

  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/10">
      <CheckCircle2 className="size-3 text-emerald-600" strokeWidth={2.5} />
    </span>
  );
}

function ThoughtStep({
  step,
  isLast,
  approvalsBusy,
  onApproval,
}: {
  step: DisplayStep;
  isLast: boolean;
  approvalsBusy: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const { part, label, count } = step;
  const toolName = toolPartName(part);
  const state = effectiveState(part);
  const approvalId = part.approval?.id;
  const needsApproval = state === "approval-requested" && Boolean(approvalId);

  const approvalArguments =
    needsApproval && part.input !== undefined
      ? formatToolArguments(toolName, part.input)
      : null;
  const safeErrorText =
    process.env.NODE_ENV === "development"
      ? part.errorText
      : "Salt could not complete that step. Please try again.";

  return (
    <li className="relative flex gap-3 px-3.5 py-2.5">
      <div className="flex flex-col items-center">
        <StepStatus state={state} />
        {!isLast ? <span className="mt-1 w-px flex-1 bg-border/50" aria-hidden /> : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5 pb-0.5">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-[13px] leading-snug text-foreground/90",
              stepIsError(state) && "text-destructive",
            )}
          >
            {label}
          </p>
          {count > 1 ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              ×{count}
            </span>
          ) : null}
        </div>

        {state === "output-error" && safeErrorText ? (
          <p className="text-xs leading-relaxed text-destructive/90">{safeErrorText}</p>
        ) : null}

        {approvalArguments ? (
          <div className="whitespace-pre-wrap rounded-lg border border-border/45 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {approvalArguments}
          </div>
        ) : null}

        {needsApproval && approvalId && onApproval ? (
          <ToolApprovalActions
            busy={approvalsBusy}
            onApprove={() => onApproval(approvalId, true)}
            onDeny={() => onApproval(approvalId, false)}
          />
        ) : null}
      </div>
    </li>
  );
}

export function MessageThoughtProcess({
  parts,
  isStreaming = false,
  approvalsBusy = false,
  onApproval,
}: {
  parts: ToolLikePart[];
  isStreaming?: boolean;
  approvalsBusy?: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const displaySteps = React.useMemo(() => buildDisplaySteps(parts), [parts]);
  const needsApproval = parts.some(
    (part) => effectiveState(part) === "approval-requested" && part.approval?.id,
  );
  const hasError = parts.some((part) => stepIsError(effectiveState(part)));
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (needsApproval || hasError) {
      setOpen(true);
    }
  }, [needsApproval, hasError]);

  const doneCount = parts.filter((part) => stepIsDone(effectiveState(part))).length;
  const stepCount = displaySteps.length;
  const isWorking = isStreaming && doneCount < parts.length;
  const stepLabel =
    stepCount === 1 ? "1 step" : `${stepCount} steps`;
  const collapsedSummary = hasError
    ? `${stepLabel} · 1 issue`
    : stepLabel;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full max-w-full"
      data-testid="message-thought-process"
    >
      <CollapsibleTrigger className="group/thought inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/55 bg-muted/35 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-muted/55 hover:text-foreground">
        {!open && isWorking ? (
          <>
            <Shimmer className="shrink-0 font-medium" duration={1.4}>
              Thinking…
            </Shimmer>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
          </>
        ) : null}
        <span className="truncate">{open ? "Hide steps" : collapsedSummary}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2.5">
        <div className="overflow-hidden rounded-xl border border-border/55 bg-card/45 shadow-[var(--shadow-card)]">
          <ol className="divide-y divide-border/40">
            {displaySteps.map((step, index) => (
              <ThoughtStep
                key={step.key}
                step={step}
                isLast={index === displaySteps.length - 1}
                approvalsBusy={approvalsBusy}
                onApproval={onApproval}
              />
            ))}
          </ol>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
