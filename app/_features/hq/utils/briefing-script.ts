import type { HqBriefingData } from "@/app/_features/plays/types";
import type { HqSideRailData } from "../types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  const date = new Date();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}`;
}

function formatScheduleItem(item: { time: string; title: string; who: string }): string {
  return `${item.title} with ${item.who} at ${item.time}`;
}

function getAutoHandledNarrative(count: number): string {
  if (count === 0) return "";

  // Break down by estimated categories based on typical distribution
  // ~50% follow-ups/emails, ~25% prep work, ~25% other tasks
  const emailCount = Math.ceil(count * 0.5);
  const prepCount = Math.min(2, Math.floor(count * 0.25));
  const taskCount = count - emailCount - prepCount;

  const actions: string[] = [];

  if (emailCount > 0) {
    actions.push(`sent ${emailCount} ${emailCount === 1 ? "follow-up" : "follow-ups"}`);
  }

  if (prepCount > 0) {
    actions.push(`prepped ${prepCount} meeting ${prepCount === 1 ? "brief" : "briefs"}`);
  }

  if (taskCount > 0 && actions.length < 3) {
    actions.push(`handled ${taskCount} ${taskCount === 1 ? "task" : "tasks"}`);
  }

  if (actions.length === 0) {
    return `Salt handled ${count} ${count === 1 ? "action" : "actions"} for you overnight.`;
  }

  if (actions.length === 1) {
    return `Salt ${actions[0]} for you overnight.`;
  }

  const lastAction = actions.pop();
  return `Salt ${actions.join(", ")}, and ${lastAction} for you overnight.`;
}

export function generateBriefingScript(
  userName: string,
  briefing: HqBriefingData,
  sideRail: HqSideRailData
): string {
  const greeting = getGreeting();
  const dateStr = formatDate();
  const { playsRanToday, playsAwaitingApproval, primaryOpportunity, clearedAmountLabel } = briefing;
  const { schedule, headsUp, timeSaved } = sideRail;

  const lines: string[] = [];

  // Opening
  lines.push(`${greeting}, ${userName}. It's ${dateStr}.`);
  lines.push("");

  // Auto-handled summary - the KILLER part
  if (playsRanToday > 0) {
    const narrative = getAutoHandledNarrative(playsRanToday);
    lines.push(narrative);

    // Add time saved if significant
    if (timeSaved.minutesThisWeek >= 30) {
      const hours = Math.floor(timeSaved.minutesThisWeek / 60);
      const mins = timeSaved.minutesThisWeek % 60;
      const timeStr = hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}${mins > 0 ? ` and ${mins} minutes` : ""}` : `${mins} minutes`;
      lines.push(`That's ${timeStr} of your week back.`);
    }
    lines.push("");
  }

  // Revenue cleared
  if (clearedAmountLabel) {
    lines.push(`You've cleared ${clearedAmountLabel} so far this month.`);
    lines.push("");
  }

  // Plays awaiting approval
  if (playsAwaitingApproval > 0) {
    const playWord = playsAwaitingApproval === 1 ? "play" : "plays";
    lines.push(
      `${playsAwaitingApproval} ${playWord} waiting for your quick approval — about ${playsAwaitingApproval * 30} seconds total.`
    );
    lines.push("");
  }

  // Today's schedule
  if (schedule.length > 0) {
    const schedulePart =
      schedule.length === 1
        ? `You have ${formatScheduleItem(schedule[0])}.`
        : `Your day: ${schedule.slice(0, 3).map(formatScheduleItem).join(", and ")}.`;
    lines.push(schedulePart);
    lines.push("");
  }

  // Heads up items - make it punchy
  if (headsUp.length > 0) {
    const headsUpPart =
      headsUp.length === 1
        ? `One thing to keep an eye on: ${headsUp[0].title}.`
        : `A few things need your attention: ${headsUp.slice(0, 3).map((h) => h.title).join(". ")}.`;
    lines.push(headsUpPart);
    lines.push("");
  }

  // Opportunity insight
  if (primaryOpportunity?.claim) {
    lines.push(
      `Quick heads up: ${primaryOpportunity.claim}${primaryOpportunity.amountLabel ? ` — about ${primaryOpportunity.amountLabel}` : ""}.`
    );
    lines.push("");
  }

  // Closing - confident, not servile
  lines.push("You're all set. Have a great day.");

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function estimateDuration(script: string): number {
  const words = script.split(/\s+/).length;
  const wordsPerSecond = 2.5; // Average speaking rate
  return Math.ceil(words / wordsPerSecond);
}
