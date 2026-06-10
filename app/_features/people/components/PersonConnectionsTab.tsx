import Link from "next/link";
import { Building2, Briefcase, CalendarClock, User, Users } from "lucide-react";
import type { Connection, Person } from "@/app/_lib/demo/people-demo-data";
import { cn } from "@repo/utils";

type LinkedItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  tone?: "default" | "good" | "watch" | "risk";
  work?: { status: string; progress: number };
};

type LinkedGroup = {
  key: string;
  label: string;
  icon: typeof Building2;
  items: LinkedItem[];
};

const WORK_TONE: Record<string, LinkedItem["tone"]> = {
  Active: "good",
  Renewing: "watch",
  Stalled: "risk",
  Wrapping: "default",
};

const TONE_DOT: Record<NonNullable<LinkedItem["tone"]>, string> = {
  default: "bg-muted-foreground/40",
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

function buildGroups(person: Person, connections: Connection[]): LinkedGroup[] {
  const orgMap = new Map<string, LinkedItem>();
  if (person.org) {
    orgMap.set(person.org.id, { id: person.org.id, title: person.org.name, subtitle: "Primary organization" });
  }
  connections
    .filter((c) => c.type === "org")
    .forEach((c) => {
      if (!orgMap.has(c.id)) orgMap.set(c.id, { id: c.id, title: c.name, subtitle: c.subtitle });
    });

  const people: LinkedItem[] = connections
    .filter((c) => c.type === "person")
    .map((c) => ({ id: c.id, title: c.name, subtitle: c.subtitle }));

  const workMap = new Map<string, LinkedItem>();
  person.work.forEach((w) =>
    workMap.set(w.id, {
      id: w.id,
      title: w.title,
      tone: WORK_TONE[w.status] ?? "default",
      work: { status: w.status, progress: w.progress },
    })
  );
  connections
    .filter((c) => c.type === "work")
    .forEach((c) => {
      if (!workMap.has(c.id)) workMap.set(c.id, { id: c.id, title: c.name, subtitle: c.subtitle });
    });

  const meetings: LinkedItem[] = [];
  if (person.metrics.meetingWithinDays != null) {
    meetings.push({
      id: "next-meeting",
      title: "Upcoming meeting",
      subtitle: `Scheduled in ${person.metrics.meetingWithinDays}d`,
      tone: person.metrics.meetingWithinDays <= 3 ? "good" : "default",
    });
  }

  const groups: LinkedGroup[] = [
    { key: "orgs", label: "Organizations", icon: Building2, items: Array.from(orgMap.values()) },
    { key: "work", label: "Work", icon: Briefcase, items: Array.from(workMap.values()) },
    { key: "meetings", label: "Meetings", icon: CalendarClock, items: meetings },
    { key: "people", label: "People", icon: User, items: people },
  ];

  return groups.filter((g) => g.items.length > 0);
}

export function PersonConnectionsTab({
  person,
  connections,
}: {
  person: Person;
  connections: Connection[];
}) {
  const groups = buildGroups(person, connections);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
        <Users className="size-6 mx-auto text-muted-foreground mb-2" strokeWidth={1.75} />
        <p className="text-sm text-muted-foreground">Nothing in memory is connected to this person yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <section key={group.key} className="space-y-3">
            <header className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
              <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                {group.label}
              </h3>
              <span className="text-[10px] tabular-nums text-muted-foreground/70">{group.items.length}</span>
            </header>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {group.items.map((item) => {
                const inner = item.work ? (
                  <div className="rounded-2xl border border-border/60 bg-card hover:bg-card/80 transition p-4 h-full">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
                        {item.work.status}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full surface-aurora" style={{ width: `${item.work.progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                      {item.work.progress}% complete
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card hover:bg-card/80 transition p-3.5 flex items-start gap-3 h-full">
                    <span
                      className={cn("mt-1.5 size-1.5 rounded-full shrink-0", TONE_DOT[item.tone ?? "default"])}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                    {item.meta && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 mt-0.5">
                        {item.meta}
                      </span>
                    )}
                  </div>
                );

                if (group.key === "people") {
                  return (
                    <Link key={item.id} href={`/people/${item.id}`} className="block">
                      {inner}
                    </Link>
                  );
                }
                if (group.key === "orgs") {
                  return (
                    <Link key={item.id} href="/orgs" className="block">
                      {inner}
                    </Link>
                  );
                }
                return <div key={item.id}>{inner}</div>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
