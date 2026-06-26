import Link from "next/link";
import { Sparkles, Clock, Users, ArrowRight, Inbox } from "lucide-react";
import { cn } from "@repo/utils";
import type { BillingPlaySummary } from "../detail-types";

const STATE_META = {
  approval: { label: "Awaiting approval", icon: Sparkles, tone: "bg-flame/12 text-flame" },
  scheduled: { label: "Scheduled", icon: Clock, tone: "bg-sky/15 text-sky" },
  team: { label: "Routed to team", icon: Users, tone: "bg-violet/15 text-violet" },
} as const;

type BillingPlaysCardProps = {
  partyLabel: string;
  plays: BillingPlaySummary[];
};

export function BillingPlaysCard({ partyLabel, plays }: BillingPlaysCardProps) {
  const grouped = {
    approval: plays.filter((play) => play.state === "approval"),
    scheduled: plays.filter((play) => play.state === "scheduled"),
    team: plays.filter((play) => play.state === "team"),
  };
  const total = plays.length;
  const shortName = partyLabel.split(" ")[0] ?? partyLabel;

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/8">
            <Sparkles className="size-4 text-foreground" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg tracking-tight leading-tight">Plays for billing</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {total === 0 ? "Nothing in motion" : `${total} in motion`}
            </p>
          </div>
        </div>
        <Link
          href="/plays"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Open Plays
          <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
        </Link>
      </div>

      {total === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <Inbox className="mb-2 size-5 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">
            Salt will surface payment reminders and billing plays for {shortName} here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["approval", "scheduled", "team"] as const).map((state) => {
            const items = grouped[state];
            if (items.length === 0) return null;
            const meta = STATE_META[state];
            const Icon = meta.icon;
            return (
              <div key={state} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      meta.tone,
                    )}
                  >
                    <Icon className="size-3" strokeWidth={2.5} />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((play) => (
                    <li
                      key={play.id}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border/50 bg-card p-3 transition hover:border-border hover:bg-accent/30"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-[11px] font-bold text-muted-foreground">
                        {play.playerMonogram}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{play.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {play.playerName} · {play.channel}
                        </p>
                      </div>
                      <ArrowRight
                        className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                        strokeWidth={2}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
