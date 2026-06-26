"use client";

import Link from "next/link";
import { Briefcase, Building2, User, Users } from "lucide-react";
import { cn } from "@repo/utils";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

type WorkConnectionsTabProps = {
  connections: Connection[];
};

const TONE_DOT = {
  person: "bg-emerald-500",
  org: "bg-sky",
  work: "bg-flame",
};

const ICON = {
  person: User,
  org: Building2,
  work: Briefcase,
};

export function WorkConnectionsTab({ connections }: WorkConnectionsTabProps) {
  return (
    <div className="space-y-6">
      {connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
          <Users className="mx-auto mb-2 size-6 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">
            Nothing in memory is connected to this work yet.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <header className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Linked context
            </h3>
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              {connections.length}
            </span>
          </header>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {connections.map((connection) => {
              const Icon = ICON[connection.type];
              const href =
                connection.type === "person"
                  ? `/people/${connection.id}`
                  : connection.type === "org"
                    ? `/orgs/${connection.id}`
                    : `/work/${connection.id}`;

              return (
                <Link key={`${connection.type}-${connection.id}`} href={href} className="block">
                  <div className="flex h-full items-start gap-3 rounded-2xl border border-border/60 bg-card p-3.5 transition hover:bg-card/80">
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        TONE_DOT[connection.type],
                      )}
                    />
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {connection.name}
                      </p>
                      {connection.subtitle ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {connection.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
