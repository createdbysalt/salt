// Mock "Me" profile — Salt's model of the operator.
// Swap for real user/session data later.

export type AutonomyLevel = "ask_first" | "draft_then_send" | "fully_autonomous";

export type ChannelPreference = {
  contactName: string;
  channel: "Slack" | "Email" | "iMessage" | "WhatsApp" | "Phone";
  note?: string;
};

export type ConnectedAccount = {
  provider: string;
  identifier: string;
  status: "connected" | "needs_reauth" | "disconnected";
  lastSyncedRelative?: string;
};

export type Goal = {
  id: string;
  title: string;
  detail: string;
  horizon: "this_week" | "this_quarter" | "this_year";
  progress: number; // 0-100
};

export type AutonomyRule = {
  id: string;
  scope: string; // e.g. "Drafting outreach", "Scheduling meetings"
  level: AutonomyLevel;
  detail?: string;
};

export type SaltMemoryFact = {
  id: string;
  fact: string;
  source: "you" | "imported" | "salt_inferred";
  sourceLabel: string;
  freshness: string;
  confidence: "strong signal" | "needs review" | "limited context";
};

export type MeActivityEntry = {
  id: string;
  when: string;
  channel: "Plays" | "Convos" | "Capture" | "Spaces" | "Memory" | "Meetings";
  summary: string;
};

export const ME = {
  name: "Nikita Ostrovsky",
  initials: "NO",
  role: "Founder & operator",
  tagline: "Building Salt. Allergic to busywork.",
  timezone: "America/New_York",
  location: "Brooklyn, NY",
  workingHours: "9:00–6:30 ET · Deep work mornings",
  pronouns: "he/him",
  currentFocus: "Q3: ship Connections + Insights surface; land 10 design-partner accounts.",
  identities: ["nikita@withsalt.ai", "nikita@nikitaost.com", "@nikitaost"],

  accounts: [
    { provider: "Google Calendar", identifier: "nikita@withsalt.ai", status: "connected", lastSyncedRelative: "2m ago" },
    { provider: "Gmail", identifier: "nikita@withsalt.ai", status: "connected", lastSyncedRelative: "2m ago" },
    { provider: "Slack", identifier: "Salt workspace", status: "connected", lastSyncedRelative: "Live" },
    { provider: "Stripe", identifier: "Salt Labs LLC", status: "connected", lastSyncedRelative: "1h ago" },
    { provider: "Notion", identifier: "salt-hq", status: "needs_reauth", lastSyncedRelative: "3d ago" },
    { provider: "LinkedIn", identifier: "in/nikitaost", status: "disconnected" },
  ] satisfies ConnectedAccount[],

  signature: "— Nikita\nFounder, Salt · withsalt.ai",
  tone: "Direct, warm, low ceremony. Use contractions. Never start emails with 'I hope this finds you well.'",

  channelPreferences: [
    { contactName: "Sarah Chen", channel: "Slack", note: "Hates email for quick stuff" },
    { contactName: "Ari Mendez", channel: "iMessage", note: "Async only on weekends" },
    { contactName: "Elena Marquez", channel: "Email", note: "Prefers threads with subject lines" },
    { contactName: "Marcus Webb", channel: "Phone", note: "Walk-and-talk Fridays" },
  ] satisfies ChannelPreference[],

  quietHours: "Weekdays after 7pm · Weekends until 10am · No notifications during deep work blocks",
  doNotContact: ["press@…", "old-investor-list@…", "Anyone from Brex sales until 2026"],

  autonomyRules: [
    {
      id: "ar-1",
      scope: "Drafting outreach to known contacts",
      level: "draft_then_send",
      detail: "Draft, show me, send on approve. Never send without me seeing it.",
    },
    {
      id: "ar-2",
      scope: "Scheduling internal meetings",
      level: "fully_autonomous",
      detail: "Salt can book, reschedule, and cancel internal meetings under 30 min.",
    },
    {
      id: "ar-3",
      scope: "Anything involving billing or contracts",
      level: "ask_first",
      detail: "Always pause and ask. No autonomous moves on money or legal.",
    },
    {
      id: "ar-4",
      scope: "Adding people to Spaces",
      level: "draft_then_send",
    },
    {
      id: "ar-5",
      scope: "Updating Memory facts about people",
      level: "fully_autonomous",
      detail: "Salt can update freely; I'll see the diff in Capture.",
    },
  ] satisfies AutonomyRule[],

  goals: [
    {
      id: "g-1",
      title: "10 design-partner accounts active by end of Q3",
      detail: "Weekly outreach cadence. Salt surfaces warm paths every Monday.",
      horizon: "this_quarter",
      progress: 60,
    },
    {
      id: "g-2",
      title: "Ship Insights + Paths v1",
      detail: "Already in flight. Targeting public beta this month.",
      horizon: "this_quarter",
      progress: 75,
    },
    {
      id: "g-3",
      title: "Close pre-seed round",
      detail: "Three term sheets in motion. Don't lose momentum.",
      horizon: "this_quarter",
      progress: 40,
    },
    {
      id: "g-4",
      title: "Founder dinner series — 1 per month",
      detail: "Atlas, Luma, and one new each month.",
      horizon: "this_year",
      progress: 25,
    },
  ] satisfies Goal[],

  saltMemory: [
    {
      id: "sm-1",
      fact: "I prefer terse summaries. Two sentences, then bullets.",
      source: "you",
      sourceLabel: "You told Salt · Apr 14",
      freshness: "Active",
      confidence: "strong signal",
    },
    {
      id: "sm-2",
      fact: "Always cc Ari Mendez on contract redlines.",
      source: "you",
      sourceLabel: "You told Salt · May 2",
      freshness: "Active",
      confidence: "strong signal",
    },
    {
      id: "sm-3",
      fact: "I write follow-ups within 24h of any first meeting.",
      source: "salt_inferred",
      sourceLabel: "Pattern across 23 meetings",
      freshness: "Updated 2d ago",
      confidence: "strong signal",
    },
    {
      id: "sm-4",
      fact: "Morning standups are sacred — never schedule before 10am ET.",
      source: "salt_inferred",
      sourceLabel: "Inferred from calendar declines",
      freshness: "Updated 1w ago",
      confidence: "needs review",
    },
    {
      id: "sm-5",
      fact: "Strong preference for Linear over Jira when discussing tooling.",
      source: "imported",
      sourceLabel: "From Slack history",
      freshness: "2w ago",
      confidence: "limited context",
    },
  ] satisfies SaltMemoryFact[],

  activity: [
    { id: "a-1", when: "12m ago", channel: "Plays", summary: "Approved 'Follow up with Elena re: kickoff timing'" },
    { id: "a-2", when: "1h ago", channel: "Capture", summary: "Saved a note: 'Atlas wants weekly recap on Fridays'" },
    { id: "a-3", when: "3h ago", channel: "Convos", summary: "Sent draft to Sarah Chen about Q3 scope" },
    { id: "a-4", when: "Yesterday", channel: "Spaces", summary: "Added Marcus to the Luma space" },
    { id: "a-5", when: "Yesterday", channel: "Memory", summary: "Updated Atlas Coaching → status: active" },
    { id: "a-6", when: "2d ago", channel: "Meetings", summary: "Recap saved from intro call with Priya Shah" },
  ] satisfies MeActivityEntry[],
};

export const AUTONOMY_META: Record<AutonomyLevel, { label: string; tone: string; description: string }> = {
  ask_first: {
    label: "Ask first",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
    description: "Salt pauses and asks you before doing anything in this scope.",
  },
  draft_then_send: {
    label: "Draft, then approve",
    tone: "bg-flame/15 text-flame border-flame/30",
    description: "Salt drafts and waits for your approval before executing.",
  },
  fully_autonomous: {
    label: "Fully autonomous",
    tone: "bg-sky/15 text-sky border-sky/30",
    description: "Salt acts on its own; you see the result in Capture.",
  },
};
