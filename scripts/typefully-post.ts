#!/usr/bin/env npx tsx
/**
 * Typefully Post Script
 *
 * Creates drafts in Typefully after running Voice Guardian checks.
 * Integrates content generation → voice check → Typefully draft creation.
 *
 * Usage:
 *   npx tsx scripts/typefully-post.ts "Your content here"
 *   npx tsx scripts/typefully-post.ts --platform x "Your tweet"
 *   npx tsx scripts/typefully-post.ts --platform linkedin "Your LinkedIn post"
 *   npx tsx scripts/typefully-post.ts --platform both "Cross-post content"
 *   npx tsx scripts/typefully-post.ts --list-accounts
 *   npx tsx scripts/typefully-post.ts --thread "Tweet 1" "Tweet 2" "Tweet 3"
 *
 * Options:
 *   --platform    Target platform: x, linkedin, both (default: x)
 *   --account     Account ID (auto-detected if you have one account)
 *   --list-accounts  Show available Typefully accounts
 *   --thread      Create a thread (multiple arguments = multiple tweets)
 *   --skip-check  Skip Voice Guardian check
 *   --publish     Publish immediately (default: create as draft)
 *   --schedule    Schedule for later (ISO timestamp or relative like "tomorrow 9am")
 *
 * Environment:
 *   TYPEFULLY_API_KEY - Your Typefully API key (required)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local
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

const TYPEFULLY_API_BASE = "https://api.typefully.com/v2";

// Account aliases for easy access
const ACCOUNT_ALIASES: Record<string, string> = {
  personal: "282093",
  me: "282093",
  gabi: "282093",
  product: "282089",
  saltcore: "282089",
  sc: "282089",
};

// Blocked accounts - never post to these
const BLOCKED_ACCOUNTS: Record<string, string> = {
  "282094": "@createdbysalt - SALT Studio (blocked)",
};

// =============================================================================
// VOICE GUARDIAN (inline for single-file simplicity)
// =============================================================================

const FLAGGED_WORDS: Record<string, string> = {
  utilize: "use",
  leverage: "use",
  delve: "explore, dig into",
  streamline: "speed up, simplify",
  optimize: "improve",
  robust: "solid, strong",
  scalable: "grows with you",
  seamless: "smooth, easy",
  revolutionize: "change",
  "cutting-edge": "new, modern",
  holistic: "(delete)",
  comprehensive: "(delete)",
  "game-changing": "different, better",
  elevate: "improve",
  synergy: "(delete)",
  empower: "help",
  innovative: "new",
  transformative: "changes how you",
};

const BANNED_PHRASES: string[] = [
  "in today's fast-paced world",
  "in the ever-evolving landscape",
  "it's no secret that",
  "in today's digital age",
  "let's dive in",
  "here's the thing",
  "unlock the full potential",
  "take your x to the next level",
  "supercharge your",
  "harness the power of",
  "seamless integration",
  "we're excited to announce",
  "we're thrilled to share",
  "moreover",
  "furthermore",
  "it's worth noting that",
];

interface VoiceResult {
  score: number;
  passed: boolean;
  issues: string[];
}

function checkVoice(content: string, platform: string): VoiceResult {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();
  let score = 100;

  // Check flagged words
  for (const word of Object.keys(FLAGGED_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lowerContent)) {
      issues.push(`"${word}" → ${FLAGGED_WORDS[word]}`);
      score -= 15;
    }
  }

  // Check banned phrases
  for (const phrase of BANNED_PHRASES) {
    if (lowerContent.includes(phrase)) {
      issues.push(`Banned phrase: "${phrase}"`);
      score -= 15;
    }
  }

  // Check em-dashes
  const emDashCount = (content.match(/—/g) || []).length;
  if (emDashCount > 1) {
    issues.push(`${emDashCount} em-dashes (max 1)`);
    score -= 8;
  }

  // Check exclamations
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    issues.push(`${exclamationCount} exclamation points (max 1)`);
    score -= 8;
  }

  // Check starts with I
  if (content.trim().startsWith("I ") || content.trim().startsWith("I'")) {
    issues.push("Starts with 'I' - less engaging");
    score -= 3;
  }

  // Platform length checks
  const limits: Record<string, number> = { x: 280, linkedin: 3000 };
  if (limits[platform] && content.length > limits[platform]) {
    issues.push(`Too long for ${platform}: ${content.length}/${limits[platform]} chars`);
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= 60,
    issues,
  };
}

// =============================================================================
// TYPEFULLY API
// =============================================================================

interface SocialSet {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface TypefullyDraft {
  id: string;
  status: string;
  created_at: string;
  url?: string;
}

async function getApiKey(): Promise<string> {
  const key = process.env.TYPEFULLY_API_KEY;
  if (!key) {
    console.error("❌ TYPEFULLY_API_KEY not found in environment");
    console.error("   Add it to .env.local: TYPEFULLY_API_KEY=your_key_here");
    process.exit(1);
  }
  return key;
}

async function fetchTypefully(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = await getApiKey();
  return fetch(`${TYPEFULLY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function listAccounts(): Promise<SocialSet[]> {
  const response = await fetchTypefully("/social-sets?limit=50");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list accounts: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function createDraft(
  socialSetId: string,
  content: string | string[],
  platforms: ("x" | "linkedin")[],
  options: { publish?: boolean; schedule?: string } = {}
): Promise<TypefullyDraft> {
  // Block protected accounts
  if (BLOCKED_ACCOUNTS[socialSetId]) {
    throw new Error(`🚫 Cannot post to ${BLOCKED_ACCOUNTS[socialSetId]}. This account is protected.`);
  }

  const posts = Array.isArray(content)
    ? content.map((text) => ({ text }))
    : [{ text: content }];

  const platformsPayload: Record<string, { enabled: boolean; posts: { text: string }[] }> = {};

  for (const platform of platforms) {
    platformsPayload[platform] = {
      enabled: true,
      posts,
    };
  }

  const body: Record<string, unknown> = {
    platforms: platformsPayload,
  };

  if (options.publish) {
    body.share = true;
  }

  if (options.schedule) {
    body.scheduled_date = options.schedule;
  }

  const response = await fetchTypefully(`/social-sets/${socialSetId}/drafts`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create draft: ${response.status} ${error}`);
  }

  return response.json();
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.log(`
Typefully Post - Create drafts with Voice Guardian checks

Usage:
  npx tsx scripts/typefully-post.ts "Your content here"
  npx tsx scripts/typefully-post.ts --account product "Salt Core update"
  npx tsx scripts/typefully-post.ts --platform linkedin "Your post"
  npx tsx scripts/typefully-post.ts --thread "Tweet 1" "Tweet 2" "Tweet 3"

Accounts:
  --account personal   @gabimartinsdev_1 (default)
  --account product    @saltcorehq

Options:
  --platform     x, linkedin, or both (default: x)
  --account      personal, product, or account ID
  --list-accounts  Show your Typefully accounts
  --thread       Create a thread (multiple content args)
  --skip-check   Skip Voice Guardian
  --publish      Publish immediately

Examples:
  npx tsx scripts/typefully-post.ts "Shipped a new feature today."
  npx tsx scripts/typefully-post.ts --account product "New feature in Salt Core"
  npx tsx scripts/typefully-post.ts --platform linkedin "Thoughts on pricing..."
  npx tsx scripts/typefully-post.ts --thread "1/ Thread" "2/ Point one" "3/ Done"
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  // Parse arguments
  let platform: "x" | "linkedin" | "both" = "x";
  let accountId: string | undefined;
  let skipCheck = false;
  let publish = false;
  let schedule: string | undefined;
  let isThread = false;
  let listAccountsOnly = false;
  const contentParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--platform" && args[i + 1]) {
      platform = args[i + 1] as "x" | "linkedin" | "both";
      i++;
    } else if (arg === "--account" && args[i + 1]) {
      const input = args[i + 1].toLowerCase();
      accountId = ACCOUNT_ALIASES[input] || args[i + 1];
      i++;
    } else if (arg === "--skip-check") {
      skipCheck = true;
    } else if (arg === "--publish") {
      publish = true;
    } else if (arg === "--schedule" && args[i + 1]) {
      schedule = args[i + 1];
      i++;
    } else if (arg === "--thread") {
      isThread = true;
    } else if (arg === "--list-accounts") {
      listAccountsOnly = true;
    } else if (!arg.startsWith("--")) {
      contentParts.push(arg);
    }
  }

  // List accounts mode
  if (listAccountsOnly) {
    console.log("\n📋 Your Typefully Accounts:\n");
    try {
      const accounts = await listAccounts();
      if (accounts.length === 0) {
        console.log("   No accounts found. Connect an account in Typefully first.");
      } else {
        for (const account of accounts) {
          const isBlocked = BLOCKED_ACCOUNTS[account.id];
          const status = isBlocked ? " 🚫 BLOCKED" : "";
          console.log(`   ${account.name} (@${account.username})${status}`);
          console.log(`   ID: ${account.id}\n`);
        }
      }
    } catch (error) {
      console.error(`❌ ${error}`);
      process.exit(1);
    }
    process.exit(0);
  }

  // Validate content
  if (contentParts.length === 0) {
    console.error("❌ No content provided");
    printUsage();
    process.exit(1);
  }

  const content = isThread ? contentParts : contentParts.join(" ");
  const contentForCheck = Array.isArray(content) ? content.join("\n") : content;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    TYPEFULLY POST                              ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Voice check
  if (!skipCheck) {
    const platformToCheck = platform === "both" ? "x" : platform;
    const voiceResult = checkVoice(contentForCheck, platformToCheck);

    const scoreEmoji = voiceResult.score >= 80 ? "🟢" : voiceResult.score >= 60 ? "🟡" : "🔴";
    console.log(`  Voice Score: ${scoreEmoji} ${voiceResult.score}/100`);

    if (voiceResult.issues.length > 0) {
      console.log("\n  Issues:");
      for (const issue of voiceResult.issues) {
        console.log(`    ⚠️  ${issue}`);
      }
    }

    if (!voiceResult.passed) {
      console.log("\n  ❌ Voice check failed. Fix issues or use --skip-check to bypass.\n");
      process.exit(1);
    }

    console.log("");
  }

  // Get account - default to personal
  if (!accountId) {
    accountId = ACCOUNT_ALIASES.personal;
    console.log(`  Account: @gabimartinsdev_1 (personal)`);
  } else {
    // Show which account was selected
    const accountNames: Record<string, string> = {
      [ACCOUNT_ALIASES.personal]: "@gabimartinsdev_1 (personal)",
      [ACCOUNT_ALIASES.product]: "@saltcorehq (product)",
    };
    console.log(`  Account: ${accountNames[accountId] || accountId}`);
  }

  // Determine platforms
  const platforms: ("x" | "linkedin")[] =
    platform === "both" ? ["x", "linkedin"] : [platform];

  console.log(`  Platform: ${platforms.join(" + ")}`);
  console.log(`  Mode: ${publish ? "Publish Now" : schedule ? `Schedule: ${schedule}` : "Draft"}`);

  if (isThread) {
    console.log(`  Thread: ${contentParts.length} posts`);
  }

  // Create draft
  console.log("\n  Creating draft...");

  try {
    const draft = await createDraft(accountId, content, platforms, {
      publish,
      schedule,
    });

    console.log("\n  ✅ Draft created successfully!");
    console.log(`  Draft ID: ${draft.id}`);
    console.log(`  Status: ${draft.status}`);
    console.log(`\n  👉 Open Typefully to review and schedule.\n`);
  } catch (error) {
    console.error(`\n  ❌ ${error}\n`);
    process.exit(1);
  }
}

main();
