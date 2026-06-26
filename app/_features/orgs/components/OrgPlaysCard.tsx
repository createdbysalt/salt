import Link from "next/link";
import { Sparkles, Clock, Users, ArrowRight, Inbox } from "lucide-react";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { QUEUE, SCHEDULED, TEAM_LOCKED, PLAYERS, TONE_SOFT, type QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import { cn } from "@repo/utils";

function matchesOrg(play: QueuePlay, org: Org) {
  return play.recipient.toLowerCase().includes(org.name.toLowerCase());
}

const STATE_META = {
  approval: { label: "Awaiting approval", icon: Sparkles, tone: "bg-flame/12 text-flame" },
  scheduled: { label: "Scheduled", icon: Clock, tone: "bg-sky/15 text-sky" },
  team: { label: "Routed to team", icon: Users, tone: "bg-violet/15 text-violet" },
} as const;

export function OrgPlaysCard({ org, useDemoPlays = true }: { org: Org; useDemoPlays?: boolean }) {
  const all = useDemoPlays ? [...QUEUE, ...SCHEDULED, ...TEAM_LOCKED].filter((p) => matchesOrg(p, org)) : [];

  const grouped = {
    approval: all.filter((p) => p.state === "approval"),
    scheduled: all.filter((p) => p.state === "scheduled"),
    team: all.filter((p) => p.state === "team"),
  };

  const total = all.length;
  const shortName = org.name.split(" ")[0];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="size-8 rounded-xl bg-foreground/8 grid place-items-center shrink-0">
            <Sparkles className="size-4 text-foreground" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl tracking-tight leading-tight">
              Plays for {shortName}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {total === 0 ? "Nothing in motion" : `${total} in motion`}
            </p>
          </div>
        </div>
        <Link
          href="/plays"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
        >
          Open Plays
          <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
        </Link>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 grid place-items-center text-center">
          <Inbox className="size-5 text-muted-foreground mb-2" strokeWidth={1.75} />
          <p className="text-sm text-muted-foreground">
            {useDemoPlays
              ? "No plays in approval, scheduled, or team queues."
              : "No org-specific plays yet. Salt will surface them here when something needs approval."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {(["approval", "scheduled", "team"] as const).map((state) => {
            const items = grouped[state];
            if (items.length === 0) return null;
            const meta = STATE_META[state];
            const Icon = meta.icon;
            return (
              <div key={state} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase", meta.tone)}>
                    <Icon className="size-3" strokeWidth={2.5} />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((play) => {
                    const player = PLAYERS.find((p) => p.id === play.playerId);
                    return (
                      <li
                        key={play.id}
                        className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-3 hover:border-border hover:bg-accent/30 transition cursor-pointer"
                      >
                        <span className={cn(
                          "size-9 rounded-xl grid place-items-center text-[11px] font-bold shrink-0",
                          player ? TONE_SOFT[player.tone] : "bg-muted text-muted-foreground"
                        )}>
                          {player?.monogram ?? "··"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{play.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {player?.name ?? "Salt"} · {play.channel}
                            {play.scheduledFor && <span> · {play.scheduledFor}</span>}
                            {play.playbook && state !== "scheduled" && <span> · {play.playbook}</span>}
                          </p>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" strokeWidth={2} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
