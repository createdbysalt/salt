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

export function generateBriefingScript(
  userName: string,
  briefing: HqBriefingData,
  sideRail: HqSideRailData
): string {
  const greeting = getGreeting();
  const dateStr = formatDate();
  const { playsRanToday, playsAwaitingApproval, primaryOpportunity } = briefing;
  const { schedule, headsUp } = sideRail;

  const lines: string[] = [];

  // Opening
  lines.push(`${greeting}, ${userName}. It's ${dateStr}.`);
  lines.push("");

  // Plays summary
  if (playsRanToday > 0 || playsAwaitingApproval > 0) {
    if (playsRanToday > 0) {
      const playWord = playsRanToday === 1 ? "play" : "plays";
      lines.push(`Salt ran ${playsRanToday} ${playWord} for you overnight.`);
    }

    if (playsAwaitingApproval > 0) {
      const playWord = playsAwaitingApproval === 1 ? "play" : "plays";
      const isAre = playsAwaitingApproval === 1 ? "is" : "are";
      lines.push(
        `${playsAwaitingApproval} more ${isAre} waiting for your approval — about ${playsAwaitingApproval * 30} seconds of work.`
      );
    }
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

  // Heads up items
  if (headsUp.length > 0) {
    const headsUpPart =
      headsUp.length === 1
        ? `One thing to note: ${headsUp[0].title}.`
        : `A few things need your attention: ${headsUp.map((h) => h.title).join(", ")}.`;
    lines.push(headsUpPart);
    lines.push("");
  }

  // Opportunity insight
  if (primaryOpportunity?.claim) {
    lines.push(
      `One thing worth knowing: ${primaryOpportunity.claim}${primaryOpportunity.amountLabel ? ` — about ${primaryOpportunity.amountLabel}` : ""}.`
    );
    lines.push("");
  }

  // Closing
  lines.push("That's your briefing. Have a great day.");

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function estimateDuration(script: string): number {
  const words = script.split(/\s+/).length;
  const wordsPerSecond = 2.5; // Average speaking rate
  return Math.ceil(words / wordsPerSecond);
}
