"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Pin, Sparkles } from "lucide-react";
import { cn } from "@repo/utils";
import { STATUS_META, VISIBILITY_META, type Space } from "../data";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function SpaceCard({ r, index = 0 }: { r: Space; index?: number }) {
  const status = STATUS_META[r.status];
  const vis = VISIBILITY_META[r.visibility];
  const StatusIcon = status.icon;
  const VisIcon = vis.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: APPLE_EASE, delay: index * 0.04 }}
    >
      <Link
        href={`/spaces/${r.id}`}
        className="group glass-card hover-lift block rounded-3xl p-6 transition lg:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={cn("chip", status.tone)}>
                <StatusIcon className="size-3" strokeWidth={2.5} />
                {status.label}
              </span>
              <span className="chip bg-muted text-muted-foreground">
                <VisIcon className="size-3" strokeWidth={2.25} />
                {vis.label}
              </span>
              {r.pinned && (
                <span className="chip bg-muted text-muted-foreground">
                  <Pin className="size-3" strokeWidth={2.25} />
                  Pinned
                </span>
              )}
            </div>
            <h3 className="font-display text-2xl leading-snug tracking-tight lg:text-[26px]">
              {r.title}
            </h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Linked to <span className="font-medium text-foreground/80">{r.linked.label}</span> ·
              Owner {r.owner}
            </p>
          </div>
          <ArrowUpRight
            className="size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground"
            strokeWidth={2}
          />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-flame" strokeWidth={2.25} />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Why this needs attention
            </p>
            <p className="text-[13.5px] leading-snug text-foreground/90">{r.worthAttention}</p>
          </div>
        </div>

        <footer className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-1.5">
            {r.roles.map((role) => (
              <span
                key={role}
                className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10.5px] font-medium"
              >
                {role}
              </span>
            ))}
          </div>
          <span className="tabular-nums">Last activity · {r.lastActivity}</span>
        </footer>
      </Link>
    </motion.div>
  );
}
