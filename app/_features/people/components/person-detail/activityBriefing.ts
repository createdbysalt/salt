import type { MockPersonActivity } from "@/app/_lib/demo";
import type { BriefingItemData, BriefingItemType } from "@/app/_features/hq/components/briefing/types";
import { openAskSalt } from "./utils";

function activityToBriefingType(
  type: MockPersonActivity["type"]
): BriefingItemType {
  switch (type) {
    case "meeting":
      return "meeting";
    case "invoice_sent":
    case "invoice_paid":
      return "invoice";
    case "ai_filed_capture":
      return "project";
    default:
      return "message";
  }
}

export function personActivityToBriefingItem(
  activity: MockPersonActivity
): BriefingItemData {
  const subtitle =
    activity.content ??
    activity.reasoning ??
    (activity.confidence != null ? `${activity.confidence}% confidence` : undefined);

  const actions: BriefingItemData["actions"] =
    activity.status === "pending"
      ? [
          {
            label: "Review",
            variant: "outline",
            onClick: () =>
              openAskSalt(`Review this activity before I act: ${activity.title}`),
          },
        ]
      : [];

  return {
    id: activity.id,
    type: activityToBriefingType(activity.type),
    title: activity.title,
    subtitle,
    time: activity.timestamp,
    actions,
  };
}
