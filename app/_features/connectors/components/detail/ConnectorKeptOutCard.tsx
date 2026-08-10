"use client";

/**
 * Kept-out report card (Connector Rules & Learning, P5).
 *
 * Sits atop the connector detail pane's Activity tab: how much this
 * connector kept out in the trailing 30 days, whether rules or heuristics
 * caused it, and sample rows with the P4 category-dispatched correction
 * actions. The full stream lives on Sources → Activity.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { fetchConnectorKeptOut } from "@/app/_features/connectors/actions/kept-out";
import {
  alwaysAllowEntity,
  removeBlockRuleForCapture,
} from "@/app/_features/capture/actions/corrections";
import type { ConnectorKeptOutReport } from "@/app/_features/memory/queries/admission-decisions";

function alwaysAllowLabel(sourceType: string): string {
  switch (sourceType) {
    case "gmail":
    case "outlook":
      return "Always let this sender in";
    case "slack":
      return "Always let this channel in";
    case "googlecalendar":
    case "outlook_calendar":
    case "calcom":
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

export function ConnectorKeptOutCard({
  provider,
  enabled,
}: {
  provider: string;
  /** False when the connector isn't capture-capable — renders nothing. */
  enabled: boolean;
}) {
  const router = useRouter();
  const [report, setReport] = React.useState<ConnectorKeptOutReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const result = await fetchConnectorKeptOut({ provider });
    if (result.success) {
      setReport(result.data);
    }
    setLoading(false);
  }, [provider]);

  React.useEffect(() => {
    if (enabled) {
      void load();
    } else {
      setLoading(false);
    }
  }, [enabled, load]);

  if (!enabled) {
    return null;
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking what Salt kept out…
      </div>
    );
  }
  if (!report || report.total === 0) {
    return null;
  }

  const correct = (captureId: string, action: "allow" | "remove-rule") => {
    setPendingId(captureId);
    void (action === "allow"
      ? alwaysAllowEntity(captureId)
      : removeBlockRuleForCapture(captureId)
    ).then((result) => {
      setPendingId(null);
      if (result.success) {
        toast.success("Got it — Salt will remember that.");
        void load();
        router.refresh();
      } else {
        toast.error(result.error ?? "That didn't work — try again.");
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldX
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {report.total} kept out in the last 30 days
            </p>
            <p className="text-xs text-muted-foreground">
              {report.ruleCaused > 0 && report.heuristicCaused > 0
                ? `${report.ruleCaused} by your rules · ${report.heuristicCaused} by Salt's judgment`
                : report.ruleCaused > 0
                  ? "All by your rules"
                  : "All by Salt's judgment"}
            </p>
          </div>
        </div>
        <Link
          href="/sources?tab=activity"
          className="shrink-0 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {report.sample.length > 0 ? (
        <ul className="space-y-2">
          {report.sample.map((item) => (
            <li
              key={item.captureId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {item.title ?? "Untitled capture"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.fromLabel ?? item.sourceType.replace(/_/g, " ")}
                  {item.reason ? ` — ${item.reason}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  correct(
                    item.captureId,
                    item.cause === "rule" ? "remove-rule" : "allow",
                  )
                }
                disabled={pendingId !== null}
                className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                {pendingId === item.captureId ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : item.cause === "rule" ? (
                  "Remove keep-out rule"
                ) : (
                  alwaysAllowLabel(item.sourceType)
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
