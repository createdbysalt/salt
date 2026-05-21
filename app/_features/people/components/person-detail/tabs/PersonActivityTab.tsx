"use client";

import { Clock } from "lucide-react";
import { EmptyState } from "@repo/patterns";
import { BriefingItem } from "@/app/_features/hq/components/briefing/BriefingItem";
import type { MockPersonActivity } from "@/app/_lib/demo";
import { personActivityToBriefingItem } from "../activityBriefing";
import { openAskSalt } from "../utils";

export function PersonActivityTab({
  activities,
  personName,
}: {
  activities: MockPersonActivity[];
  personName: string;
}) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-8" />}
        title="No activity yet"
        description="Salt actions, messages, and relationship updates for this person will show up here as briefing cards."
      />
    );
  }

  const items = activities.map(personActivityToBriefingItem);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card/30">
        {items.map((item, index) => (
          <BriefingItem
            key={item.id}
            item={item}
            showBorder={index < items.length - 1}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          openAskSalt(`Show earlier relationship activity for ${personName}.`)
        }
        className="mt-4 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Show earlier activity
      </button>
    </div>
  );
}
