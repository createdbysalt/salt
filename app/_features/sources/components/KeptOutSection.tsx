"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2, ShieldX, Ban } from "lucide-react";
import { cn } from "@repo/utils";
import { moveKeptOutToWatching } from "@/app/_features/memory/actions/admission-decisions";
import { BlocklistManager } from "@/app/_features/capture/components/BlocklistManager";
import type { AdmissionItem } from "@/app/_features/memory/queries/admission-decisions";

/**
 * Kept Out Section — P11 compliant placement in Sources → Activity.
 *
 * Shows captures that Salt's admission gate rejected (noise, spam, blocklisted).
 * Users can override by moving items back to Watching.
 */

interface KeptOutSectionProps {
  keptOutCount: number;
  keptOutSample: AdmissionItem[];
  workspaceId: string;
  onUpdate?: () => void;
}

export function KeptOutSection({
  keptOutCount,
  keptOutSample,
  workspaceId,
  onUpdate,
}: KeptOutSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLetThisIn = (captureId: string) => {
    startTransition(async () => {
      await moveKeptOutToWatching(captureId, workspaceId);
      onUpdate?.();
    });
  };

  if (keptOutCount === 0) return null;

  return (
    <section className="glass-card overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
            <ShieldX className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Kept out</p>
            <p className="text-[12px] text-muted-foreground">
              {keptOutCount} {keptOutCount === 1 ? "capture" : "captures"} filtered this week
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          strokeWidth={1.75}
        />
      </button>

      {isOpen && (
        <div className="relative border-t border-border/40 px-5 py-4">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <p className="mb-3 text-[13px] text-muted-foreground">
            Salt kept these out of your world. Moving one back puts it on Watching — not straight in.
          </p>

          {keptOutSample.length > 0 ? (
            <ul className="space-y-2">
              {keptOutSample.map((item) => (
                <li
                  key={item.captureId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title ?? "Untitled capture"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.fromLabel ?? item.sourceType.replace(/_/g, " ")}
                      {item.reason ? ` — ${item.reason}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLetThisIn(item.captureId)}
                    disabled={isPending}
                    className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
                  >
                    Let this in
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent kept-out captures to show.
            </p>
          )}

          {keptOutCount > keptOutSample.length && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Showing {keptOutSample.length} of {keptOutCount} kept-out captures.
            </p>
          )}

          {/* Blocklist Manager — P11: moves with Kept out */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Ban className="size-4 text-muted-foreground" strokeWidth={1.75} />
              <div>
                <h3 className="text-sm font-medium text-foreground">Blocklist</h3>
                <p className="text-[12px] text-muted-foreground">
                  Domains, emails, and patterns Salt never lets in.
                </p>
              </div>
            </div>
            <BlocklistManager />
          </div>
        </div>
      )}
    </section>
  );
}
