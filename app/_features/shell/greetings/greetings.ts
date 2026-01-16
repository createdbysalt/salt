/**
 * Personalized greeting copy and rotation rules
 * See brand/personalized-greetings.md for the full catalog
 */

// Page keys for dashboard and bridge
export type DashboardPageKey =
  | "overview"
  | "clients"
  | "projects"
  | "tasks"
  | "meetings"
  | "insights"
  | "studio"
  | "settings"
  | "support"
  | "inbox";

export type BridgePageKey =
  | "home"
  | "requests"
  | "project"
  | "invoices";

export type GreetingPageKey = DashboardPageKey | BridgePageKey;

export type GreetingVariant = "dashboard" | "bridge";

// Time-of-day buckets
export type TimeBucket = "late-night" | "morning" | "afternoon" | "evening";

// Page titles (H1) per variant
const dashboardPageTitles: Record<DashboardPageKey, string> = {
  overview: "Overview",
  clients: "Clients",
  projects: "Projects",
  tasks: "Tasks",
  meetings: "Meetings",
  insights: "Insights",
  studio: "Studio",
  settings: "Settings",
  support: "Support",
  inbox: "Inbox",
};

const bridgePageTitles: Record<BridgePageKey, string> = {
  home: "Home",
  requests: "Requests",
  project: "Project",
  invoices: "Invoices",
};

export function getPageTitle(page: GreetingPageKey, variant: GreetingVariant): string {
  return variant === "dashboard"
    ? dashboardPageTitles[page as DashboardPageKey]
    : bridgePageTitles[page as BridgePageKey];
}

/**
 * Get time bucket from browser local hour (0-23)
 */
export function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 0 && hour <= 4) return "late-night";
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  return "evening"; // 18-23
}

/**
 * Get title greeting (with or without name)
 */
export function getGreetingTitle(bucket: TimeBucket, firstName?: string): string {
  const nameStr = firstName ? `, ${firstName}` : "";
  
  switch (bucket) {
    case "late-night":
      return firstName ? `Late night, ${firstName}` : "Late night session";
    case "morning":
      return `Good morning${nameStr}`;
    case "afternoon":
      return `Good afternoon${nameStr}`;
    case "evening":
      return `Good evening${nameStr}`;
  }
}

// Dashboard subtitle variants per page
export const dashboardSubtitles: Record<DashboardPageKey, string[]> = {
  overview: [
    "Your studio is looking good",
    "Time to check the pulse",
    "Let's wrap up the day",
    "Here's what's happening",
    "The studio is humming along nicely",
    "Another day of building great things",
  ],
  clients: [
    "Your clients are in good hands",
    "Time to check in on everyone",
    "All clients accounted for",
    "Who needs attention today?",
    "Strong relationships = strong business",
    "You've got a great roster here",
  ],
  projects: [
    "Let's ship some work",
    "Projects are looking solid",
    "Everything on track",
    "What are we building today?",
    "Great work deserves great delivery",
    "Your project game is tight",
  ],
  tasks: [
    "Let's knock some tasks out",
    "What's on the list today?",
    "Time to close some loops",
    "Progress over perfection",
    "One task at a time wins the race",
    "Small wins add up fast",
  ],
  meetings: [
    "Who are we talking to today?",
    "Your calendar is under control",
    "All meetings wrapped",
    "Great conversations create great projects",
    "Strong meetings = strong projects",
    "Discovery calls are where the magic starts",
  ],
  insights: [
    "Let's look at the numbers",
    "Data tells the truth",
    "The metrics are looking good",
    "Numbers don't lie, but context matters",
    "What you measure, you improve",
    "Data-driven decisions for the win",
  ],
  studio: [
    "Your studio, your rules",
    "The engine is running smooth",
    "All systems operational",
    "This is your foundation",
    "Strong foundations scale effortlessly",
    "You've got the architecture right",
  ],
  settings: [
    "Let's get this dialed in",
    "Making tweaks?",
    "Everything where you want it?",
    "Customization is control",
    "Your setup, your way",
    "This is your cockpit, adjust accordingly",
  ],
  support: [
    "We're here if you need us",
    "How can we help?",
    "Support is standing by",
    "Stuck? We've got your back",
    "We respond fast, we fix faster",
    "You're not alone in this",
  ],
  inbox: [
    "Let's see what came in",
    "Staying on top of messages",
    "Almost caught up",
    "Communication is half the job",
    "Clear inbox = clear mind",
    "Your response time is impressive",
  ],
};

// Bridge subtitle variants per page (warm-neutral, white-labelable)
export const bridgeSubtitles: Record<BridgePageKey, string[]> = {
  home: [
    "Everything you need is right here",
    "Your projects are looking great",
    "Let's see what's new",
    "All your updates in one place",
  ],
  requests: [
    "We're here to help",
    "Have a question? Just ask",
    "Let's get you what you need",
    "Your requests matter to us",
  ],
  project: [
    "Here's where we're at",
    "Progress is looking good",
    "Let's see what's next",
    "Everything on schedule",
  ],
  invoices: [
    "Your billing information",
    "All transactions in one place",
    "Let's keep things clear",
    "Everything accounted for",
  ],
};

/**
 * Select a subtitle that's different from the last one shown
 */
export function selectSubtitle(
  page: GreetingPageKey,
  variant: GreetingVariant,
  lastIndex?: number
): { subtitle: string; index: number } {
  const subtitles = variant === "dashboard" 
    ? dashboardSubtitles[page as DashboardPageKey]
    : bridgeSubtitles[page as BridgePageKey];

  if (!subtitles || subtitles.length === 0) {
    return { subtitle: "", index: 0 };
  }

  // If only one option, use it
  if (subtitles.length === 1) {
    return { subtitle: subtitles[0], index: 0 };
  }

  // Filter out last index if possible
  const availableIndices = subtitles
    .map((_, i) => i)
    .filter(i => i !== lastIndex);

  const indices = availableIndices.length > 0 ? availableIndices : subtitles.map((_, i) => i);
  const randomIndex = indices[Math.floor(Math.random() * indices.length)];

  return {
    subtitle: subtitles[randomIndex],
    index: randomIndex,
  };
}

/**
 * LocalStorage key for last subtitle index
 */
export function getSubtitleStorageKey(page: GreetingPageKey, variant: GreetingVariant): string {
  return `salt-greeting-${variant}-${page}`;
}


