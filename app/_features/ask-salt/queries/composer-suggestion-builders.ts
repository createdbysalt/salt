export type ComposerSuggestionStarter =
  | "create-play"
  | "run-play"
  | "search-or-add-memory";

const MAX_SUGGESTIONS = 3;

export const SEARCH_MEMORY_FALLBACKS = [
  "Search everything in Memory",
  "Add someone new to Memory",
  "Capture something Salt should remember",
] as const;

export const CREATE_PLAY_FALLBACKS = [
  "Follow up after every meeting",
  "Remind me when someone goes quiet",
  "Email quiet clients every Monday",
] as const;

export const RUN_PLAY_FALLBACKS = [
  "Run my weekly check-in play",
  "Run plays waiting in the queue",
] as const;

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "them";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function uniqueSuggestions(items: string[], limit = MAX_SUGGESTIONS): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function withFallbacks(
  primary: string[],
  fallbacks: readonly string[],
  limit = MAX_SUGGESTIONS,
): string[] {
  return uniqueSuggestions([...primary, ...fallbacks], limit);
}

export function buildSearchMemorySuggestions(input: {
  quietPeople: Array<{ name: string; daysSinceContact: number | null }>;
  recentWork: Array<{ title: string; personName: string | null; orgName: string | null }>;
  recentOrgs: Array<{ name: string }>;
  recentPeople: Array<{ name: string }>;
}): string[] {
  const suggestions: string[] = [];

  const quietest = input.quietPeople[0];
  if (quietest) {
    if (quietest.daysSinceContact === null) {
      suggestions.push(`When did I last talk to ${quietest.name}?`);
    } else {
      suggestions.push(
        `Follow up with ${firstName(quietest.name)} — no contact in ${quietest.daysSinceContact} days`,
      );
    }
  }

  const work = input.recentWork[0];
  if (work) {
    const subject = work.personName ?? work.orgName;
    if (subject) {
      suggestions.push(`What's the latest on ${work.title} with ${subject}?`);
    } else {
      suggestions.push(`Catch me up on ${work.title}`);
    }
  }

  const org = input.recentOrgs[0];
  if (org) {
    suggestions.push(`What do we know about ${org.name}?`);
  }

  const person = input.recentPeople[0];
  if (person) {
    suggestions.push(`Add a note about ${firstName(person.name)}`);
  }

  return withFallbacks(suggestions, SEARCH_MEMORY_FALLBACKS);
}

export function buildCreatePlaySuggestions(input: {
  playNames: string[];
  quietPersonName: string | null;
}): string[] {
  const suggestions: string[] = [];

  if (input.quietPersonName) {
    suggestions.push(`Remind me when ${firstName(input.quietPersonName)} goes quiet`);
  }

  for (const name of input.playNames.slice(0, 2)) {
    suggestions.push(`Refine my "${name}" play`);
  }

  return withFallbacks(suggestions, CREATE_PLAY_FALLBACKS);
}

export function buildRunPlaySuggestions(input: {
  playNames: string[];
  queuedTitles: string[];
}): string[] {
  const suggestions: string[] = [];

  for (const title of input.queuedTitles.slice(0, 2)) {
    suggestions.push(`Run "${title}"`);
  }

  for (const name of input.playNames.slice(0, 2)) {
    suggestions.push(`Run "${name}"`);
  }

  return withFallbacks(suggestions, RUN_PLAY_FALLBACKS);
}

export function starterMessageToKey(
  message: string,
): ComposerSuggestionStarter | null {
  switch (message) {
    case "Create a new Play":
      return "create-play";
    case "Run a Play":
      return "run-play";
    case "Search or add Memory":
      return "search-or-add-memory";
    default:
      return null;
  }
}
