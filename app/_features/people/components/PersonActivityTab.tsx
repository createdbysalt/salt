import { Sparkles, User, Settings } from "lucide-react";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";

const ICON = { salt: Sparkles, user: User, system: Settings };
const TONE = {
  salt: "text-flame bg-flame/10",
  user: "text-foreground bg-muted",
  system: "text-muted-foreground bg-muted",
};

export function PersonActivityTab({ person }: { person: Person }) {
  if (!person.activity.length) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border/60 ml-3 pl-6">
      {person.activity.map((e) => {
        const Icon = ICON[e.kind];
        return (
          <li key={e.id} className="relative">
            <span
              className={`absolute -left-[34px] top-0.5 size-6 rounded-full grid place-items-center ${TONE[e.kind]}`}
            >
              <Icon className="size-3" strokeWidth={2.25} />
            </span>
            <p className="text-sm text-foreground">{e.label}</p>
            {e.detail && <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>}
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">{relativeDays(e.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
