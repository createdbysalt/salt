"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles, User, Settings } from "lucide-react";
import { Button } from "@repo/ui";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "@/app/_lib/demo/people-demo-data";
import type { PersonActivityEvent } from "@/app/_features/people/utils/activity";
import { approveProfileFieldSuggestion } from "@/app/_features/people/actions/profile-fields";

type ActivityEntry = Person["activity"][number] | PersonActivityEvent;

const ICON = { ai: Bot, keeper: Sparkles, salt: Sparkles, user: User, system: Settings };
const TONE = {
  ai: "text-sky bg-sky/10",
  keeper: "text-flame bg-flame/10",
  salt: "text-flame bg-flame/10",
  user: "text-foreground bg-muted",
  system: "text-muted-foreground bg-muted",
};

function isProfileActivity(entry: ActivityEntry): entry is PersonActivityEvent {
  return "field" in entry && "status" in entry;
}

export function PersonActivityTab({
  activity,
  personId,
  onActivityChanged,
}: {
  activity: ActivityEntry[];
  personId: string;
  onActivityChanged?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleApprove(entry: PersonActivityEvent) {
    setPendingId(entry.id);
    const result = await approveProfileFieldSuggestion({ personId, field: entry.field });
    setPendingId(null);
    if (result.ok) onActivityChanged?.();
  }

  if (!activity.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm font-medium text-foreground">No activity yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Keeper updates, suggestions, and your profile corrections will appear here.
        </p>
      </div>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-border/60 ml-3 pl-6">
      {activity.map((e) => {
        const Icon = ICON[e.kind];
        const canApprove = isProfileActivity(e) && e.status === "pending" && e.source !== "manual";
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
            {canApprove && (
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pendingId === e.id}
                  onClick={() => handleApprove(e)}
                >
                  {pendingId === e.id ? <Loader2 className="size-3.5 animate-spin" /> : "Approve suggestion"}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
