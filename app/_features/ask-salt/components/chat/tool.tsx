"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { formatToolName } from "../../tool-preview";

/**
 * In-message tool collapsible, adapted from vercel/chatbot ai-elements/tool.tsx
 * to @repo/ui primitives and Salt voice (sentence case, calm status copy).
 */

export type ToolPartState =
  | "approval-requested"
  | "approval-responded"
  | "input-available"
  | "input-streaming"
  | "output-available"
  | "output-denied"
  | "output-error";

const STATUS_LABELS: Record<ToolPartState, string> = {
  "approval-requested": "Needs your approval",
  "approval-responded": "Approved",
  "input-available": "Running",
  "input-streaming": "Preparing",
  "output-available": "Done",
  "output-denied": "Denied",
  "output-error": "Error",
};

const STATUS_ICONS: Record<ToolPartState, React.ReactNode> = {
  "approval-requested": <Clock className="size-3.5 text-warning" />,
  "approval-responded": <CheckCircle2 className="size-3.5 text-info" />,
  "input-available": <Loader2 className="size-3.5 animate-spin" />,
  "input-streaming": <Circle className="size-3.5" />,
  "output-available": <CheckCircle2 className="size-3.5 text-success" />,
  "output-denied": <XCircle className="size-3.5 text-warning" />,
  "output-error": <XCircle className="size-3.5 text-destructive" />,
};

export type ToolProps = React.ComponentProps<typeof Collapsible>;

export function Tool({ className, ...props }: ToolProps) {
  return (
    <Collapsible
      className={cn(
        "group/tool w-full max-w-full rounded-xl border border-border/60 bg-card/60",
        className,
      )}
      {...props}
    />
  );
}

export function ToolHeader({
  toolName,
  state,
  className,
}: {
  toolName: string;
  state: ToolPartState;
  className?: string;
}) {
  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="truncate text-xs font-medium">{formatToolName(toolName)}</span>
        <Badge className="gap-1 rounded-full text-[10px]" variant="secondary">
          {STATUS_ICONS[state]}
          {STATUS_LABELS[state]}
        </Badge>
      </div>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-180" />
    </CollapsibleTrigger>
  );
}

export type ToolContentProps = React.ComponentProps<typeof CollapsibleContent>;

export function ToolContent({ className, ...props }: ToolContentProps) {
  return (
    <CollapsibleContent
      className={cn("space-y-3 border-t border-border/50 px-3 py-3", className)}
      {...props}
    />
  );
}

/** Human-readable parameters block (Gmail/Calendar previews or pretty JSON). */
export function ToolPreview({ preview }: { preview: string }) {
  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-foreground">
      {preview}
    </pre>
  );
}

export function ToolApprovalActions({
  busy = false,
  onApprove,
  onDeny,
}: {
  busy?: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={busy}
        onClick={onDeny}
      >
        Deny
      </Button>
      <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Approve"}
      </Button>
    </div>
  );
}
