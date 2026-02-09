#!/usr/bin/env npx tsx
/**
 * Weekly Prep Assistant - Friday Batch Content Generation
 *
 * Generates all content drafts for the upcoming week in one session.
 * Run on Friday afternoon to have everything ready for the week.
 *
 * Usage:
 *   npx tsx scripts/weekly-prep.ts              # Full prep report + create drafts
 *   npx tsx scripts/weekly-prep.ts --preview    # Show report without creating drafts
 *   npx tsx scripts/weekly-prep.ts --json       # Output as JSON
 *
 * Environment:
 *   TYPEFULLY_API_KEY - Required for draft creation
 */

import { execFileSync } from "child_process";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "fs";
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
type Platform = "x" | "linkedin";
type Pillar = "build_journey" | "identity_craft" | "industry_insight" | "community";

interface WeeklyPost {
  day: DayOfWeek;
  time: string;
  platform: Platform;
  pillar: Pillar;
  contentType: string;
  content: string;
  status: "ready" | "needs_input" | "created";
  draftId?: string;
}

interface ContentBankStatus {
  folder: string;
  count: number;
  needsMore: boolean;
}

interface WeeklyPrepReport {
  generatedAt: string;
  weekOf: string;
  posts: WeeklyPost[];
  contentBank: ContentBankStatus[];
  stats: {
    totalPosts: number;
    readyPosts: number;
    needsInputPosts: number;
    xPosts: number;
    linkedInPosts: number;
  };
}

// =============================================================================
// SCHEDULE
// =============================================================================

const WEEKLY_POSTS: Omit<WeeklyPost, "content" | "status">[] = [
  // Monday
  { day: "monday", time: "8:00 AM", platform: "x", pillar: "build_journey", contentType: "bip" },
  { day: "monday", time: "8:00 AM", platform: "linkedin", pillar: "identity_craft", contentType: "linkedin" },
  { day: "monday", time: "12:00 PM", platform: "x", pillar: "identity_craft", contentType: "pillar" },
  { day: "monday", time: "2:00 PM", platform: "x", pillar: "industry_insight", contentType: "pillar" },

  // Tuesday
  { day: "tuesday", time: "8:00 AM", platform: "x", pillar: "build_journey", contentType: "bip" },
  { day: "tuesday", time: "12:00 PM", platform: "x", pillar: "build_journey", contentType: "thread" },
  { day: "tuesday", time: "2:30 PM", platform: "x", pillar: "community", contentType: "question" },

  // Wednesday
  { day: "wednesday", time: "8:00 AM", platform: "x", pillar: "build_journey", contentType: "bip" },
  { day: "wednesday", time: "8:00 AM", platform: "linkedin", pillar: "identity_craft", contentType: "linkedin" },
  { day: "wednesday", time: "9:00 AM", platform: "x", pillar: "build_journey", contentType: "thread" },
  { day: "wednesday", time: "1:00 PM", platform: "x", pillar: "community", contentType: "engagement" },

  // Thursday
  { day: "thursday", time: "8:00 AM", platform: "x", pillar: "build_journey", contentType: "bip" },
  { day: "thursday", time: "8:00 AM", platform: "linkedin", pillar: "build_journey", contentType: "linkedin-repurpose" },
  { day: "thursday", time: "12:00 PM", platform: "x", pillar: "industry_insight", contentType: "pillar" },
  { day: "thursday", time: "2:00 PM", platform: "x", pillar: "community", contentType: "tool-share" },

  // Friday
  { day: "friday", time: "9:00 AM", platform: "x", pillar: "build_journey", contentType: "bip-or-recap" },
  { day: "friday", time: "12:00 PM", platform: "x", pillar: "identity_craft", contentType: "casual" },

  // Saturday
  { day: "saturday", time: "10:00 AM", platform: "x", pillar: "community", contentType: "weekend-casual" },

  // Sunday
  { day: "sunday", time: "11:00 AM", platform: "x", pillar: "build_journey", contentType: "weekend-reflective" },
];

// =============================================================================
// GABI'S VOICE
// =============================================================================

const GABI_VOICE = {
  openers: ["okay so", "so", "finally", "honestly"],
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

  return result;
}

// =============================================================================
// CONTENT TEMPLATES
// =============================================================================

const TEMPLATES: Record<string, string[]> = {
  bip: [
    "shipped yesterday:\n\n{commits}",
    "finally:\n\n{commits}\n\nsmall wins add up.",
    "yesterday:\n\n{commits}\n\nprogress.",
  ],
  "bip-or-recap": [
    "week in review:\n\n{weekSummary}",
    "this week i shipped:\n\n{weekSummary}",
    "friday feels. wrapped up:\n\n{weekSummary}",
  ],
  pillar: [
    "{insight}",
  ],
  thread: [
    "okay so heres what i learned this week:\n\n1/ {point1}\n\n2/ {point2}\n\n3/ {point3}\n\n4/ {takeaway}",
  ],
  question: [
    "question for you guys: {question}",
    "curious: {question}",
  ],
  engagement: [
    "shoutout to everyone building in public. its not easy but its worth it.",
    "what are you all working on this week?",
  ],
  "tool-share": [
    "tool that helped me this week: {tool}. {why}",
  ],
  linkedin: [
    "{longformInsight}\n\nwhat are you working on this week?",
  ],
  "linkedin-repurpose": [
    "[repurpose best X content from this week]",
  ],
  casual: [
    "friday vibes. wrapping up the week.",
    "almost weekend. one more push.",
  ],
  "weekend-casual": [
    "saturday morning coffee + code. the best.",
    "technically not working today. just fixing one small thing. (lies)",
  ],
  "weekend-reflective": [
    "rested and ready for the week.",
    "one thing i learned this week: {insight}",
  ],
};

// =============================================================================
// GIT ANALYSIS
// =============================================================================

function getThisWeekCommits(): string[] {
  try {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const since = monday.toISOString().split("T")[0];
    const until = now.toISOString().split("T")[0];

    const output = execFileSync("git", [
      "log",
      `--since=${since}`,
      `--until=${until}`,
      "--pretty=format:%s",
    ], { encoding: "utf-8" });

    return output.trim().split("\n").filter(Boolean).map(msg =>
      msg.replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, "")
         .replace(/\(#\d+\)/g, "")
         .trim()
         .toLowerCase()
    );
  } catch {
    return [];
  }
}

// =============================================================================
// CONTENT BANK
// =============================================================================

function getContentBankStatus(): ContentBankStatus[] {
  const folders = ["lessons-learned", "industry-takes", "identity-craft", "curated-lists"];
  const status: ContentBankStatus[] = [];

  for (const folder of folders) {
    const path = resolve(process.cwd(), `brand-identity/content-bank/${folder}`);
    let count = 0;

    if (existsSync(path)) {
      count = readdirSync(path).filter(f => f.endsWith(".md")).length;
    }

    status.push({
      folder,
      count,
      needsMore: count < 3,
    });
  }

  return status;
}

function getFromBank(pillar: Pillar, platform: Platform): string | null {
  const pillarToFolder: Record<Pillar, string> = {
    build_journey: "lessons-learned",
    identity_craft: "identity-craft",
    industry_insight: "industry-takes",
    community: "curated-lists",
  };

  const folder = pillarToFolder[pillar];
  const bankPath = resolve(process.cwd(), `brand-identity/content-bank/${folder}`);

  if (!existsSync(bankPath)) return null;

  try {
    const files = readdirSync(bankPath).filter(f => f.endsWith(".md"));
    if (files.length === 0) return null;

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const content = readFileSync(resolve(bankPath, randomFile), "utf-8");

    // Parse for platform version
    const lines = content.split("\n");
    let inSection = false;
    const extracted: string[] = [];

    const sectionMarker = platform === "x" ? "## X Version" : "## LinkedIn Version";

    for (const line of lines) {
      if (line.includes(sectionMarker)) {
        inSection = true;
        continue;
      }
      if (inSection && (line.startsWith("## ") || line.startsWith("---"))) {
        break;
      }
      if (inSection && line.trim()) {
        extracted.push(line);
      }
    }

    return extracted.length > 0 ? extracted.join("\n").trim() : null;
  } catch {
    return null;
  }
}

// =============================================================================
// CONTENT GENERATION
// =============================================================================

function generateContent(post: Omit<WeeklyPost, "content" | "status">): { content: string; status: "ready" | "needs_input" } {
  const templates = TEMPLATES[post.contentType] || TEMPLATES.pillar;
  let content = templates[Math.floor(Math.random() * templates.length)];

  // Try content bank for certain types
  if (["pillar", "linkedin"].includes(post.contentType)) {
    const bankContent = getFromBank(post.pillar, post.platform);
    if (bankContent) {
      content = bankContent;
    }
  }

  // Fill in commits for BIP posts
  if (post.contentType === "bip" || post.contentType === "bip-or-recap") {
    const commits = getThisWeekCommits();
    if (commits.length > 0) {
      // Convert to past tense and format as bullets
      const bulletPoints = commits.slice(0, 3).map(c => {
        // Convert imperative to past tense (add -> added, fix -> fixed, etc.)
        let past = c
          .replace(/^add\b/i, "added")
          .replace(/^fix\b/i, "fixed")
          .replace(/^update\b/i, "updated")
          .replace(/^remove\b/i, "removed")
          .replace(/^implement\b/i, "implemented")
          .replace(/^create\b/i, "created")
          .replace(/^improve\b/i, "improved")
          .replace(/^resolve\b/i, "resolved")
          .replace(/^refactor\b/i, "refactored")
          .replace(/^clean\b/i, "cleaned")
          .replace(/^move\b/i, "moved")
          .replace(/^rename\b/i, "renamed");
        // Truncate at 70 chars (more generous) but only at word boundary
        if (past.length > 70) {
          past = past.substring(0, 67).replace(/\s+\S*$/, "") + "...";
        }
        return `• ${past}`;
      }).join("\n");
      content = content.replace("{commits}", bulletPoints);
      content = content.replace("{weekSummary}", bulletPoints);
    } else {
      content = content.replace("{commits}", "[no commits yet - will update]");
      content = content.replace("{weekSummary}", "[week summary TBD]");
    }
  }

  // Apply Gabi's voice for X
  if (post.platform === "x") {
    content = applyGabiVoice(content);
  }

  // Check for unfilled placeholders
  const hasPlaceholders = content.includes("{") && content.includes("}");
  const hasTBD = content.includes("[TBD") || content.includes("[repurpose") || content.includes("[no commits");

  return {
    content,
    status: hasPlaceholders || hasTBD ? "needs_input" : "ready",
  };
}

// =============================================================================
// TYPEFULLY INTEGRATION
// =============================================================================

const TYPEFULLY_API_BASE = "https://api.typefully.com/v2";
const ACCOUNT_ID = "282093";

async function createDraft(content: string, platform: Platform): Promise<string | null> {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${TYPEFULLY_API_BASE}/social-sets/${ACCOUNT_ID}/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platforms: {
          [platform]: { enabled: true, posts: [{ text: content }] },
        },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id;
  } catch {
    return null;
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport(posts: WeeklyPost[], contentBank: ContentBankStatus[]): string {
  const lines: string[] = [];
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    WEEKLY PREP REPORT                          ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`  Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
  lines.push(`  Week of: ${nextMonday.toLocaleDateString()}`);
  lines.push("");

  // Stats
  const ready = posts.filter(p => p.status === "ready" || p.status === "created").length;
  const needsInput = posts.filter(p => p.status === "needs_input").length;
  const xPosts = posts.filter(p => p.platform === "x").length;
  const linkedInPosts = posts.filter(p => p.platform === "linkedin").length;

  lines.push("  📊 STATS");
  lines.push("  ─────────────────────────────────────────────────────────────");
  lines.push(`  Total posts: ${posts.length}`);
  lines.push(`  Ready: ${ready} ✅ | Needs input: ${needsInput} ⚠️`);
  lines.push(`  X posts: ${xPosts} | LinkedIn posts: ${linkedInPosts}`);
  lines.push("");

  // Content bank status
  lines.push("  📦 CONTENT BANK STATUS");
  lines.push("  ─────────────────────────────────────────────────────────────");
  for (const folder of contentBank) {
    const status = folder.needsMore ? "⚠️" : "✅";
    lines.push(`  ${status} ${folder.folder}: ${folder.count} posts`);
  }
  const lowFolders = contentBank.filter(f => f.needsMore);
  if (lowFolders.length > 0) {
    lines.push(`  ⚠️ Add posts to: ${lowFolders.map(f => f.folder).join(", ")}`);
  }
  lines.push("");

  // Posts by day
  const days: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  for (const day of days) {
    const dayPosts = posts.filter(p => p.day === day);
    if (dayPosts.length === 0) continue;

    lines.push(`  📅 ${day.toUpperCase()}`);
    lines.push("  ─────────────────────────────────────────────────────────────");

    for (const post of dayPosts) {
      const statusIcon = post.status === "ready" || post.status === "created" ? "✅" : "⚠️";
      const platformIcon = post.platform === "x" ? "𝕏" : "in";
      const preview = post.content.split("\n")[0].substring(0, 50);

      lines.push(`  ${post.time} | ${platformIcon} | ${statusIcon}`);
      lines.push(`    ${preview}${post.content.length > 50 ? "..." : ""}`);

      if (post.draftId) {
        lines.push(`    Draft ID: ${post.draftId}`);
      }
      lines.push("");
    }
  }

  // Action items
  lines.push("  ✅ YOUR ACTION ITEMS");
  lines.push("  ─────────────────────────────────────────────────────────────");
  const created = posts.filter(p => p.status === "created").length;
  if (created > 0) {
    lines.push(`  ✓ ${created} drafts created in Typefully!`);
  }
  lines.push(`  1. Open Typefully and schedule your drafts`);
  if (needsInput > 0) {
    lines.push(`  2. Fill in ${needsInput} posts marked with ⚠️`);
  }
  if (lowFolders.length > 0) {
    lines.push(`  3. Add content to low folders: ${lowFolders.map(f => f.folder).join(", ")}`);
  }
  lines.push("");

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("  👉 Open Typefully to schedule your week's posts");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  return lines.join("\n");
}

// =============================================================================
// MAIN
// =============================================================================

async function runWeeklyPrep(options: { preview?: boolean; json?: boolean }) {
  console.log("\n🗓️  Running Weekly Prep...\n");

  // Generate all posts
  const posts: WeeklyPost[] = [];

  for (const postTemplate of WEEKLY_POSTS) {
    const { content, status } = generateContent(postTemplate);
    posts.push({
      ...postTemplate,
      content,
      status,
    });
  }

  // Get content bank status
  const contentBank = getContentBankStatus();

  // Create drafts if not preview
  if (!options.preview) {
    console.log("  Creating drafts in Typefully...\n");
    for (const post of posts) {
      if (post.status === "ready") {
        const draftId = await createDraft(post.content, post.platform);
        if (draftId) {
          post.draftId = draftId;
          post.status = "created";
          console.log(`  ✓ ${post.day} ${post.time} (${post.platform}) → draft created`);
        }
      }
    }
    console.log("");
  }

  // Generate report
  if (options.json) {
    const report: WeeklyPrepReport = {
      generatedAt: new Date().toISOString(),
      weekOf: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      posts,
      contentBank,
      stats: {
        totalPosts: posts.length,
        readyPosts: posts.filter(p => p.status === "ready" || p.status === "created").length,
        needsInputPosts: posts.filter(p => p.status === "needs_input").length,
        xPosts: posts.filter(p => p.platform === "x").length,
        linkedInPosts: posts.filter(p => p.platform === "linkedin").length,
      },
    };
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(generateReport(posts, contentBank));
  }

  if (options.preview) {
    console.log("  ⏸️  Preview mode - no drafts created\n");
  }
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.log(`
Weekly Prep - Friday batch content generation

Usage:
  npx tsx scripts/weekly-prep.ts              # Generate all drafts
  npx tsx scripts/weekly-prep.ts --preview    # Preview only
  npx tsx scripts/weekly-prep.ts --json       # Output as JSON

Options:
  --preview   Show report without creating drafts
  --json      Output as JSON for automation
  --help      Show this help
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const preview = args.includes("--preview");
  const json = args.includes("--json");

  await runWeeklyPrep({ preview, json });
}

main();
