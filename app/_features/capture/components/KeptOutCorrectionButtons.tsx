"use client";

import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { moveKeptOutToWatching } from "@/app/_features/memory/actions/admission-decisions";
import {
  alwaysAllowEntity,
  escalateSenderToWatching,
  removeBlockRuleForCapture,
} from "@/app/_features/capture/actions/corrections";
import type { KeptOutCause } from "@/app/_features/memory/queries/admission-gate-result";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";

/**
 * Correction actions for a kept-out capture row in Sources → Activity
 * (the "Kept out" filter toggle). One obvious action plus an overflow
 * menu:
 *
 *   Let in            — one-off, this capture only (the safe default)
 *   Always let … in   — durable allow rule (overflow)
 *   Add to People     — the sender becomes a Memory record (overflow, email)
 *
 * Rule-caused rows collapse to a single "Remove keep-out rule".
 * Buttons sit inside the stream row's expand toggle, so every click
 * stops propagation.
 */

/** Per-category always-allow copy — the entity is resolved server-side. */
function alwaysAllowLabel(sourceType: string): string {
  switch (sourceType) {
    case "gmail":
    case "outlook":
      return "Always let this sender in";
    case "slack":
      return "Always let this channel in";
    case "googlecalendar":
    case "outlook_calendar":
    case "cal":
    case "calendly":
      return "Always let this organizer in";
    case "stripe":
    case "quickbooks":
    case "xero":
      return "Always let this customer in";
    default:
      return "Always let this in";
  }
}

const EMAIL_SOURCE_TYPES = new Set(["gmail", "outlook"]);

const actionButtonClass =
  "inline-flex h-9 items-center rounded-xl border border-border/50 bg-muted/60 px-3.5 text-[13px] font-medium text-foreground/80 shadow-sm transition-all duration-200 hover:border-border/80 hover:bg-background hover:text-foreground hover:shadow-md active:scale-[0.97] disabled:opacity-60";

export function KeptOutCorrectionButtons({
  captureId,
  sourceType,
  cause,
  workspaceId,
  onCorrected,
}: {
  captureId: string;
  sourceType: string;
  cause: KeptOutCause;
  workspaceId: string;
  onCorrected?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const runCorrection = (
    event: { stopPropagation: () => void } | undefined,
    action: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    event?.stopPropagation();
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        onCorrected?.();
      } else {
        toast.error(result.error ?? "That didn't work — try again.");
      }
    });
  };

  if (cause === "rule") {
    return (
      <button
        type="button"
        onClick={(event) =>
          runCorrection(event, () => removeBlockRuleForCapture(captureId))
        }
        disabled={isPending}
        className={actionButtonClass}
      >
        Remove keep-out rule
      </button>
    );
  }

  const overflowTrigger = (
    <button
      type="button"
      aria-label="More correction options"
      disabled={isPending}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground shadow-sm transition-all duration-200 hover:border-border/80 hover:bg-background hover:text-foreground disabled:opacity-60"
    >
      <MoreHorizontal className="size-4" />
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={(event) =>
          runCorrection(event, () =>
            moveKeptOutToWatching(captureId, workspaceId),
          )
        }
        disabled={isPending}
        className={actionButtonClass}
      >
        Let in
      </button>
      <RadixAfterHydration fallback={overflowTrigger}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{overflowTrigger}</DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(event) =>
                runCorrection(event, () => alwaysAllowEntity(captureId))
              }
            >
              {alwaysAllowLabel(sourceType)}
            </DropdownMenuItem>
            {EMAIL_SOURCE_TYPES.has(sourceType) ? (
              <DropdownMenuItem
                onClick={(event) =>
                  runCorrection(event, () => escalateSenderToWatching(captureId))
                }
              >
                Add to People
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </RadixAfterHydration>
    </>
  );
}
