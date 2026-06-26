"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, Loader2, XCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import { formatToolArguments, formatToolStepLabel } from "../../tool-preview";
import { ToolApprovalActions } from "./tool";
import type { ToolPartState } from "./tool";

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

function StepIcon({ state }: { state: ToolPartState }) {
  if (stepIsRunning(state)) {
    return <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />;
  }
  if (stepIsError(state) || state === "output-denied") {
    return <XCircle className="size-3.5 shrink-0 text-destructive" />;
  }
  if (stepIsDone(state) || state === "approval-requested") {
    return <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />;
}

function ThoughtStep({
  part,
  approvalsBusy,
  onApproval,
}: {
  part: ToolLikePart;
  approvalsBusy: boolean;
  onApproval?: (approvalId: string, approved: boolean) => void;
}) {
  const toolName = toolPartName(part);
  const state = effectiveState(part);
  const approvalId = part.approval?.id;
  const needsApproval = state === "approval-requested" && Boolean(approvalId);
  const label = formatToolStepLabel(toolName, part.input);

  const approvalArguments =
    needsApproval && part.input !== undefined
      ? formatToolArguments(toolName, part.input)
      : null;
  const safeErrorText =
    process.env.NODE_ENV === "development"
      ? part.errorText
      : "Salt could not complete that step. Please try again.";

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2 text-[13px] leading-snug">
        <StepIcon state={state} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-foreground/85",
              stepIsError(state) && "text-destructive",
            )}
          >
            {label}
          </p>
          {state === "output-error" && safeErrorText && (
            <p className="mt-0.5 text-xs text-destructive/90">{safeErrorText}</p>
          )}
        </div>
      </div>

      {approvalArguments && (
        <div className="ml-5 whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {approvalArguments}
        </div>
      )}

      {needsApproval && approvalId && onApproval && (
        <div className="ml-5">
          <ToolApprovalActions
            busy={approvalsBusy}
            onApprove={() => onApproval(approvalId, true)}
            onDeny={() => onApproval(approvalId, false)}
          />
        </div>
      )}
    </div>
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
  const summary =
    isStreaming && doneCount < parts.length
      ? "Working through this…"
      : hasError
        ? `Worked through ${parts.length} steps · 1 issue`
        : parts.length === 1
          ? "Worked through 1 step"
          : `Worked through ${parts.length} steps`;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full max-w-full"
      data-testid="message-thought-process"
    >
      <CollapsibleTrigger className="group/thought flex w-full items-center gap-1.5 text-left text-[13px] text-muted-foreground transition hover:text-foreground">
        <span className="font-medium">Thought</span>
        <span>{open ? "briefly" : summary}</span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2.5 border-l border-border/40 pl-3">
        {parts.map((part, index) => (
          <ThoughtStep
            key={part.toolCallId ?? `thought-step-${index}`}
            part={part}
            approvalsBusy={approvalsBusy}
            onApproval={onApproval}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
