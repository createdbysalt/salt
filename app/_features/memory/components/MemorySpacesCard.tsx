"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Target, Users } from "lucide-react";
import { STATUS_META, type Space } from "@/app/_lib/demo/spaces-demo-data";
import { cn } from "@repo/utils";

type MemorySpacesCardProps = {
  recordKind: "person" | "org" | "work";
  recordId: string;
  recordName: string;
  shortName: string;
  spaces: Space[];
};

function openAskSaltForSpace(recordName: string) {
  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: `Start a space for ${recordName} — `,
        mode: "ask" as const,
        context: null,
        autoSubmit: false,
      },
    })
  );
}

export function MemorySpacesCard({
  recordName,
  shortName,
  spaces,
}: MemorySpacesCardProps) {
  const total = spaces.length;

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="size-8 rounded-xl bg-foreground/8 grid place-items-center shrink-0">
            <Users className="size-4 text-foreground" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl tracking-tight leading-tight">
              Space for {shortName}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {total === 0 ? "No shared room yet" : total === 1 ? "1 active room" : `${total} rooms`}
            </p>
          </div>
        </div>
        <Link
          href="/spaces"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
        >
          Open Spaces
          <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
        </Link>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center space-y-4">
          <Target className="size-5 text-muted-foreground mx-auto" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">
            No space yet — start a shared room for decisions, files, and next moves.
          </p>
          <button
            type="button"
            onClick={() => openAskSaltForSpace(recordName)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Start space
            <ArrowRight className="size-3.5" strokeWidth={2.25} />
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {spaces.map((space) => {
            const status = STATUS_META[space.status];
            const StatusIcon = status.icon;
            return (
              <li key={space.id}>
                <Link
                  href={`/spaces/${space.id}`}
                  className="group block rounded-2xl border border-border/50 bg-card p-4 hover:border-border hover:bg-accent/30 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                            status.tone
                          )}
                        >
                          <StatusIcon className="size-3" strokeWidth={2.5} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{space.title}</p>
                      <div className="mt-2 flex items-start gap-2">
                        <Sparkles className="size-3.5 text-flame mt-0.5 shrink-0" strokeWidth={2.25} />
                        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                          {space.worthAttention}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0 mt-1"
                      strokeWidth={2}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
