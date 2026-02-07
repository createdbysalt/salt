#!/usr/bin/env npx tsx
/**
 * Content Scheduler - Automated Social Media Content Pipeline
 *
 * Runs on Google Cloud Run to handle the full 7-day posting schedule.
 * Determines what content to post based on day/time, generates drafts,
 * and creates Typefully posts with Gabi's voice.
 *
 * Usage:
 *   npx tsx scripts/content-scheduler.ts                    # Run for current slot
 *   npx tsx scripts/content-scheduler.ts --slot 8am-bip     # Specific slot
 *   npx tsx scripts/content-scheduler.ts --preview          # Show what would post
 *   npx tsx scripts/content-scheduler.ts --day monday       # Simulate specific day
 *
 * Slots:
 *   8am-bip      - Build in Public (from git)
 *   9am-thread   - Thread (Wed only)
 *   12pm-pillar  - Pillar rotation (Mon-Thu)
 *   2pm-pillar   - Pillar rotation (Mon, Tue, Thu)
 *   8am-linkedin - LinkedIn post (Mon, Wed, Thu)
 *   10am-saturday - Weekend casual
 *   11am-sunday  - Weekend reflective
 *
 * Environment:
 *   TYPEFULLY_API_KEY - Required for draft creation
 *
 * Security Note:
 *   Git commands use execFileSync with explicit arguments (no shell interpolation).
 *   Date inputs are validated before use.
 */

import { execFileSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

// =============================================================================
// ENVIRONMENT
// =============================================================================

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// =============================================================================
// TYPES
// =============================================================================

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type ContentSlot = "8am-bip" | "9am-thread" | "12pm-pillar" | "2pm-pillar" | "8am-linkedin" | "10am-saturday" | "11am-sunday";
type Platform = "x" | "linkedin";
type Pillar = "build_journey" | "identity_craft" | "industry_insight" | "community";

interface ScheduleSlot {
  time: string;
  slot: ContentSlot;
  platform: Platform;
  pillar: Pillar;
  contentType: "bip" | "thread" | "pillar" | "linkedin" | "weekend";
  days: DayOfWeek[];
}

interface ContentDraft {
  content: string;
  platform: Platform;
  pillar: Pillar;
  slot: ContentSlot;
  voiceScore?: number;
  humanScore?: number;
}

// =============================================================================
// SCHEDULE DEFINITION
// =============================================================================

const WEEKLY_SCHEDULE: ScheduleSlot[] = [
  // Monday-Friday 8am: Build in Public from git
  { time: "08:00", slot: "8am-bip", platform: "x", pillar: "build_journey", contentType: "bip", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },

  // Wednesday 9am: Thread
  { time: "09:00", slot: "9am-thread", platform: "x", pillar: "build_journey", contentType: "thread", days: ["wednesday"] },

  // Monday-Thursday 12pm: Pillar rotation
  { time: "12:00", slot: "12pm-pillar", platform: "x", pillar: "identity_craft", contentType: "pillar", days: ["monday", "tuesday", "wednesday", "thursday"] },

  // Monday, Tuesday, Thursday 2pm: Pillar rotation
  { time: "14:00", slot: "2pm-pillar", platform: "x", pillar: "industry_insight", contentType: "pillar", days: ["monday", "tuesday", "thursday"] },

  // Monday, Wednesday, Thursday 8am: LinkedIn
  { time: "08:00", slot: "8am-linkedin", platform: "linkedin", pillar: "identity_craft", contentType: "linkedin", days: ["monday", "wednesday", "thursday"] },

  // Saturday 10am: Casual weekend
  { time: "10:00", slot: "10am-saturday", platform: "x", pillar: "community", contentType: "weekend", days: ["saturday"] },

  // Sunday 11am: Reflective
  { time: "11:00", slot: "11am-sunday", platform: "x", pillar: "build_journey", contentType: "weekend", days: ["sunday"] },
];

// Pillar rotation for 12pm slot
const PILLAR_ROTATION_12PM: Record<DayOfWeek, Pillar> = {
  monday: "identity_craft",
  tuesday: "build_journey", // Thread day - lighter post
  wednesday: "community",
  thursday: "industry_insight",
  friday: "build_journey",
  saturday: "community",
  sunday: "build_journey",
};

// Pillar rotation for 2pm slot
const PILLAR_ROTATION_2PM: Record<DayOfWeek, Pillar> = {
  monday: "industry_insight",
  tuesday: "identity_craft",
  wednesday: "identity_craft",
  thursday: "community",
  friday: "identity_craft",
  saturday: "community",
  sunday: "build_journey",
};

// =============================================================================
// GABI'S VOICE (from profile)
// =============================================================================

const GABI_VOICE = {
  openers: ["okay so", "so", "finally", "honestly", "ngl", "tbh"],
  emoticons: [":)", ":(", ":D", ":/"],
  casualMarkers: ["lol", "tbh", "ngl", "you guys", "yall"],
  contractions: {
    "I'm": "im",
    "don't": "dont",
    "can't": "cant",
    "won't": "wont",
    "didn't": "didnt",
    "let's": "lets",
    "that's": "thats",
    "I've": "ive",
    "you're": "youre",
    "it's": "its",
  },
};

function applyGabiVoice(content: string): string {
  let result = content;

  // Lowercase the first character
  if (result.length > 0 && /[A-Z]/.test(result.charAt(0))) {
    result = result.charAt(0).toLowerCase() + result.slice(1);
  }

  // Replace contractions
  for (const [formal, casual] of Object.entries(GABI_VOICE.contractions)) {
    result = result.replace(new RegExp(formal, "gi"), casual);
  }

  // Add opener if not present
  const hasOpener = GABI_VOICE.openers.some(op => result.toLowerCase().startsWith(op));
  if (!hasOpener && Math.random() > 0.5) {
    const opener = GABI_VOICE.openers[Math.floor(Math.random() * 3)]; // Use first 3 (okay so, so, finally)
    result = `${opener} ${result}`;
  }

  return result;
}

// =============================================================================
// CONTENT GENERATION
// =============================================================================

// Content templates by pillar
const CONTENT_TEMPLATES: Record<Pillar, string[]> = {
  build_journey: [
    "working on {thing} today. its coming along.",
    "finally got {thing} working. took way longer than expected but we got there",
    "small win today: {thing}. progress is progress.",
    "debugging {thing} all morning. think i finally figured it out",
  ],
  identity_craft: [
    "something ive been thinking about: {insight}",
    "pricing is hard. heres what ive learned: {insight}",
    "one thing that changed how i run my studio: {insight}",
    "hot take on freelancing: {insight}",
  ],
  industry_insight: [
    "been seeing a lot of talk about {topic}. my take: {opinion}",
    "unpopular opinion: {opinion}",
    "something more devs should know: {insight}",
    "the {topic} discourse is interesting. heres what i think: {opinion}",
  ],
  community: [
    "question for you guys: {question}",
    "what are you all working on this week?",
    "curious: {question}",
    "shoutout to everyone building in public. its not easy but its worth it.",
  ],
};

const WEEKEND_TEMPLATES = {
  saturday: [
    "saturday morning coffee + code. the best.",
    "weekend project time. working on {thing}",
    "technically not working today. just fixing one small thing. (lies)",
    "saturdays are for side projects. today its {thing}",
  ],
  sunday: [
    "rested and ready for the week.",
    "one thing i learned this week: {insight}",
    "week ahead looks busy. excited though.",
    "taking it easy today. back at it tomorrow.",
  ],
};

const THREAD_TEMPLATES = [
  {
    opener: "okay so heres what i learned building {feature} this week:",
    points: [
      "1/ the problem: {problem}",
      "2/ what i tried first: {attempt1}",
      "3/ what actually worked: {solution}",
      "4/ the takeaway: {lesson}",
      "5/ if youre building something similar, {advice}",
    ],
  },
  {
    opener: "thread on {topic}:",
    points: [
      "1/ {point1}",
      "2/ {point2}",
      "3/ {point3}",
      "4/ {point4}",
      "5/ thats it. hope this helps someone :)",
    ],
  },
];

// =============================================================================
// GIT ANALYSIS (using execFileSync for security)
// =============================================================================

function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

interface GitCommit {
  hash: string;
  message: string;
  files: string[];
  insertions: number;
  deletions: number;
}

function getYesterdayCommits(): GitCommit[] {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const since = yesterday.toISOString().split("T")[0];
  const until = now.toISOString().split("T")[0];

  if (!isValidDateFormat(since) || !isValidDateFormat(until)) {
    return [];
  }

  try {
    // Using execFileSync with arguments array to prevent shell injection
    const logOutput = execFileSync("git", [
      "log",
      `--since=${since}`,
      `--until=${until}`,
      "--pretty=format:%H|||%s",
      "--shortstat",
    ], { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });

    const commits: GitCommit[] = [];
    const lines = logOutput.trim().split("\n");

    let currentCommit: Partial<GitCommit> = {};

    for (const line of lines) {
      if (line.includes("|||")) {
        if (currentCommit.hash) {
          commits.push(currentCommit as GitCommit);
        }
        const [hash, message] = line.split("|||");
        currentCommit = {
          hash: hash.substring(0, 7),
          message,
          files: [],
          insertions: 0,
          deletions: 0,
        };
      } else if (line.includes("file") && line.includes("changed")) {
        const insertMatch = line.match(/(\d+) insertions?/);
        const deleteMatch = line.match(/(\d+) deletions?/);
        currentCommit.insertions = insertMatch ? parseInt(insertMatch[1]) : 0;
        currentCommit.deletions = deleteMatch ? parseInt(deleteMatch[1]) : 0;
      }
    }

    if (currentCommit.hash) {
      commits.push(currentCommit as GitCommit);
    }

    return commits;
  } catch {
    return [];
  }
}

function generateBIPContent(): string {
  const commits = getYesterdayCommits();

  if (commits.length === 0) {
    // No commits - use honest no-code message
    const noCodeMessages = [
      "no code today. some days you need to step back and think.",
      "research day yesterday. reading, planning, not coding. back at it today.",
      "took yesterday off. rest is part of the process.",
    ];
    return noCodeMessages[Math.floor(Math.random() * noCodeMessages.length)];
  }

  if (commits.length === 1) {
    // Single commit - focus on it
    const commit = commits[0];
    const summary = commit.message
      .replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, "")
      .replace(/\(#\d+\)/g, "")
      .trim();

    const templates = [
      `shipped: ${summary.toLowerCase()}`,
      `finally got ${summary.toLowerCase()} working`,
      `yesterday: ${summary.toLowerCase()}. small win but progress.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Multiple commits - bullet points (keep under 280)
  const items = commits
    .slice(0, 3)
    .map(c => {
      let summary = c.message
        .replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, "")
        .replace(/\(#\d+\)/g, "")
        .trim()
        .toLowerCase();
      if (summary.length > 45) {
        summary = summary.substring(0, 42) + "...";
      }
      return `• ${summary}`;
    })
    .join("\n");

  return `shipped yesterday:\n\n${items}`;
}

// =============================================================================
// CONTENT BANK
// =============================================================================

interface ContentBankPost {
  content: string;
  pillar: string;
  platform: string;
}

function getFromContentBank(pillar: Pillar, platform: Platform): ContentBankPost | null {
  const pillarToFolder: Record<Pillar, string> = {
    build_journey: "lessons-learned",
    identity_craft: "identity-craft",
    industry_insight: "industry-takes",
    community: "curated-lists",
  };

  const folder = pillarToFolder[pillar];
  const bankPath = resolve(process.cwd(), `brand-identity/content-bank/${folder}`);

  if (!existsSync(bankPath)) {
    return null;
  }

  try {
    const files = readdirSync(bankPath).filter(f => f.endsWith(".md"));
    if (files.length === 0) return null;

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const content = readFileSync(resolve(bankPath, randomFile), "utf-8");

    // Parse the markdown to extract the right version
    const lines = content.split("\n");
    let inXVersion = false;
    let inLinkedInVersion = false;
    const extractedContent: string[] = [];

    for (const line of lines) {
      if (line.includes("## X Version") || line.includes("## X Version (280 chars)")) {
        inXVersion = platform === "x";
        inLinkedInVersion = false;
        continue;
      }
      if (line.includes("## LinkedIn Version")) {
        inLinkedInVersion = platform === "linkedin";
        inXVersion = false;
        continue;
      }
      if (line.startsWith("## ") || line.startsWith("---")) {
        inXVersion = false;
        inLinkedInVersion = false;
      }

      if ((platform === "x" && inXVersion) || (platform === "linkedin" && inLinkedInVersion)) {
        if (line.trim()) {
          extractedContent.push(line);
        }
      }
    }

    if (extractedContent.length > 0) {
      return {
        content: extractedContent.join("\n").trim(),
        pillar: folder,
        platform,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// CONTENT GENERATION BY SLOT
// =============================================================================

function generateContentForSlot(slot: ScheduleSlot, day: DayOfWeek): ContentDraft {
  let content = "";
  let pillar = slot.pillar;

  switch (slot.contentType) {
    case "bip":
      content = generateBIPContent();
      break;

    case "thread":
      // Threads need more context - for now, use a placeholder
      const template = THREAD_TEMPLATES[Math.floor(Math.random() * THREAD_TEMPLATES.length)];
      content = `${template.opener}\n\n${template.points.join("\n\n")}`;
      content = content.replace(/{[^}]+}/g, "[TBD - needs human input]");
      break;

    case "pillar":
      // Get pillar based on rotation
      if (slot.slot === "12pm-pillar") {
        pillar = PILLAR_ROTATION_12PM[day];
      } else if (slot.slot === "2pm-pillar") {
        pillar = PILLAR_ROTATION_2PM[day];
      }

      // Try content bank first
      const bankPost = getFromContentBank(pillar, slot.platform);
      if (bankPost) {
        content = bankPost.content;
      } else {
        // Use template
        const templates = CONTENT_TEMPLATES[pillar];
        content = templates[Math.floor(Math.random() * templates.length)];
        content = content.replace(/{[^}]+}/g, "[TBD - needs human input]");
      }
      break;

    case "linkedin":
      // LinkedIn posts - try content bank or use longer format
      const linkedInPost = getFromContentBank(pillar, "linkedin");
      if (linkedInPost) {
        content = linkedInPost.content;
      } else {
        content = "LinkedIn post - needs human drafting for authenticity";
      }
      break;

    case "weekend":
      const weekendTemplates = day === "saturday" ? WEEKEND_TEMPLATES.saturday : WEEKEND_TEMPLATES.sunday;
      content = weekendTemplates[Math.floor(Math.random() * weekendTemplates.length)];
      content = content.replace(/{[^}]+}/g, "[TBD]");
      break;
  }

  // Apply Gabi's voice for X posts
  if (slot.platform === "x") {
    content = applyGabiVoice(content);
  }

  return {
    content,
    platform: slot.platform,
    pillar,
    slot: slot.slot,
  };
}

// =============================================================================
// TYPEFULLY INTEGRATION
// =============================================================================

const TYPEFULLY_API_BASE = "https://api.typefully.com/v2";
const ACCOUNT_ID = "282093"; // Personal account

async function createTypefullyDraft(draft: ContentDraft): Promise<string | null> {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  if (!apiKey) {
    console.log("  ⚠️  No TYPEFULLY_API_KEY - skipping");
    return null;
  }

  try {
    const response = await fetch(`${TYPEFULLY_API_BASE}/social-sets/${ACCOUNT_ID}/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platforms: {
          [draft.platform]: {
            enabled: true,
            posts: [{ text: draft.content }],
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ Typefully error: ${error}`);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error(`  ❌ Typefully error: ${error}`);
    return null;
  }
}

// =============================================================================
// MAIN SCHEDULER
// =============================================================================

function getCurrentSlot(day: DayOfWeek, time: string): ScheduleSlot | null {
  // Find slot that matches day and time (within 30 min window)
  const [currentHour, currentMin] = time.split(":").map(Number);
  const currentMinutes = currentHour * 60 + currentMin;

  for (const slot of WEEKLY_SCHEDULE) {
    if (!slot.days.includes(day)) continue;

    const [slotHour, slotMin] = slot.time.split(":").map(Number);
    const slotMinutes = slotHour * 60 + slotMin;

    // Within 30 minute window
    if (Math.abs(currentMinutes - slotMinutes) <= 30) {
      return slot;
    }
  }

  return null;
}

function getDayOfWeek(date: Date = new Date()): DayOfWeek {
  const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

async function runScheduler(options: { slot?: ContentSlot; day?: DayOfWeek; preview?: boolean }) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                  CONTENT SCHEDULER                             ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const day = options.day || getDayOfWeek();
  const time = getCurrentTime();

  console.log(`  📅 Day: ${day.toUpperCase()}`);
  console.log(`  🕐 Time: ${time} PST\n`);

  let targetSlot: ScheduleSlot | null = null;

  if (options.slot) {
    // Find specific slot
    targetSlot = WEEKLY_SCHEDULE.find(s => s.slot === options.slot && s.days.includes(day)) || null;
    if (!targetSlot) {
      console.log(`  ⚠️  Slot "${options.slot}" not scheduled for ${day}\n`);
      return;
    }
  } else {
    // Find current slot based on time
    targetSlot = getCurrentSlot(day, time);
    if (!targetSlot) {
      console.log(`  ℹ️  No slot scheduled for ${time} on ${day}\n`);
      console.log("  Scheduled slots for today:");
      const todaySlots = WEEKLY_SCHEDULE.filter(s => s.days.includes(day));
      for (const s of todaySlots) {
        console.log(`    ${s.time} - ${s.slot} (${s.platform})`);
      }
      console.log("");
      return;
    }
  }

  console.log(`  🎯 Slot: ${targetSlot.slot}`);
  console.log(`  📱 Platform: ${targetSlot.platform.toUpperCase()}`);
  console.log(`  📊 Pillar: ${targetSlot.pillar}\n`);

  // Generate content
  console.log("  Generating content...\n");
  const draft = generateContentForSlot(targetSlot, day);

  console.log("  ─────────────────────────────────────────────────────────────");
  console.log("  DRAFT CONTENT");
  console.log("  ─────────────────────────────────────────────────────────────\n");
  console.log(`  ${draft.content.split("\n").join("\n  ")}\n`);
  console.log(`  Length: ${draft.content.length} chars\n`);

  if (draft.content.includes("[TBD")) {
    console.log("  ⚠️  Contains placeholders - needs human input\n");
  }

  if (options.preview) {
    console.log("  ⏸️  Preview mode - no draft created\n");
    return;
  }

  // Create Typefully draft
  const draftId = await createTypefullyDraft(draft);
  if (draftId) {
    console.log(`  ✅ Draft created: ${draftId}`);
    console.log("  👉 Review in Typefully\n");
  }

  console.log("═══════════════════════════════════════════════════════════════\n");
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.log(`
Content Scheduler - Automated social media content pipeline

Usage:
  npx tsx scripts/content-scheduler.ts                    # Run for current slot
  npx tsx scripts/content-scheduler.ts --slot 8am-bip     # Specific slot
  npx tsx scripts/content-scheduler.ts --preview          # Preview only
  npx tsx scripts/content-scheduler.ts --day monday       # Simulate day

Slots:
  8am-bip       Build in Public (Mon-Fri)
  9am-thread    Thread (Wed only)
  12pm-pillar   Pillar rotation (Mon-Thu)
  2pm-pillar    Pillar rotation (Mon, Tue, Thu)
  8am-linkedin  LinkedIn (Mon, Wed, Thu)
  10am-saturday Weekend casual
  11am-sunday   Weekend reflective

Options:
  --slot SLOT   Run specific slot
  --day DAY     Simulate specific day
  --preview     Show content without creating draft
  --help        Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let slot: ContentSlot | undefined;
  let day: DayOfWeek | undefined;
  let preview = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slot" && args[i + 1]) {
      slot = args[i + 1] as ContentSlot;
      i++;
    } else if (args[i] === "--day" && args[i + 1]) {
      day = args[i + 1].toLowerCase() as DayOfWeek;
      i++;
    } else if (args[i] === "--preview") {
      preview = true;
    }
  }

  await runScheduler({ slot, day, preview });
}

main();
