#!/usr/bin/env npx tsx
/**
 * BIP Digest - Build in Public Daily Content Generator
 *
 * Analyzes yesterday's git activity and generates daily BIP posts.
 * Uses the day-behind strategy: post about yesterday's work as if it's today.
 *
 * Usage:
 *   npx tsx scripts/bip-digest.ts                    # Analyze yesterday
 *   npx tsx scripts/bip-digest.ts --days 2           # Analyze last 2 days
 *   npx tsx scripts/bip-digest.ts --date 2026-02-05  # Specific date
 *   npx tsx scripts/bip-digest.ts --dry-run          # Don't create Typefully draft
 *   npx tsx scripts/bip-digest.ts --bank             # Use content bank instead
 *
 * Environment:
 *   TYPEFULLY_API_KEY - For creating drafts (optional with --dry-run)
 *
 * Security Note:
 *   This script uses execSync for git commands with controlled date inputs only.
 *   No user-provided strings are interpolated into shell commands.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
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

// =============================================================================
// TYPES
// =============================================================================

interface GitCommit {
  hash: string;
  message: string;
  body: string;
  date: string;
  files: string[];
  insertions: number;
  deletions: number;
}

interface CommitAnalysis {
  type: "feature" | "fix" | "refactor" | "docs" | "chore" | "test";
  scope: string;
  summary: string;
  impact: "high" | "medium" | "low";
  details: string[];
}

interface DayDigest {
  date: string;
  commits: GitCommit[];
  analysis: CommitAnalysis[];
  hero: CommitAnalysis | null;
  stats: {
    totalCommits: number;
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

interface PostDraft {
  content: string;
  platform: "x" | "linkedin";
  pillar: string;
  hook: string;
  score?: number;
}

// =============================================================================
// GIT ANALYSIS
// =============================================================================

// Validate date format to prevent injection (YYYY-MM-DD only)
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function getGitLog(since: string, until: string): GitCommit[] {
  // Validate date inputs
  if (!isValidDateFormat(since) || !isValidDateFormat(until)) {
    console.error("Invalid date format. Use YYYY-MM-DD.");
    return [];
  }

  try {
    // Get commits with stats - dates are validated above
    const logOutput = execSync(
      `git log --since="${since}" --until="${until}" --pretty=format:"COMMIT_START%n%H%n%s%n%b%nCOMMIT_END" --shortstat`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );

    const commits: GitCommit[] = [];
    const parts = logOutput.split("COMMIT_START").filter(Boolean);

    for (const part of parts) {
      const lines = part.trim().split("\n");
      if (lines.length < 2) continue;

      const hash = lines[0]?.trim() || "";
      const message = lines[1]?.trim() || "";

      // Find COMMIT_END and stats
      const endIndex = lines.findIndex(l => l.includes("COMMIT_END"));
      const body = lines.slice(2, endIndex > 0 ? endIndex : -1).join("\n").trim();

      // Parse stats line
      const statsLine = lines.find(l => l.includes("file") && l.includes("changed"));
      let insertions = 0;
      let deletions = 0;
      let filesChanged = 0;

      if (statsLine) {
        const filesMatch = statsLine.match(/(\d+) files? changed/);
        const insertMatch = statsLine.match(/(\d+) insertions?/);
        const deleteMatch = statsLine.match(/(\d+) deletions?/);
        filesChanged = filesMatch ? parseInt(filesMatch[1]) : 0;
        insertions = insertMatch ? parseInt(insertMatch[1]) : 0;
        deletions = deleteMatch ? parseInt(deleteMatch[1]) : 0;
      }

      // Get files for this commit - hash is from git output, safe to use
      let files: string[] = [];
      if (/^[a-f0-9]{40}$/.test(hash)) {
        try {
          const filesOutput = execSync(
            `git diff-tree --no-commit-id --name-only -r ${hash}`,
            { encoding: "utf-8" }
          );
          files = filesOutput.trim().split("\n").filter(Boolean);
        } catch {
          // Ignore file list errors
        }
      }

      if (hash && message) {
        commits.push({
          hash: hash.substring(0, 7),
          message,
          body,
          date: since,
          files,
          insertions,
          deletions,
        });
      }
    }

    return commits;
  } catch (error) {
    console.error("Error reading git log:", error);
    return [];
  }
}

function analyzeCommit(commit: GitCommit): CommitAnalysis {
  const message = commit.message.toLowerCase();

  // Determine type from conventional commit prefix or keywords
  let type: CommitAnalysis["type"] = "chore";
  if (message.startsWith("feat") || message.includes("add") || message.includes("implement") || message.includes("ship")) {
    type = "feature";
  } else if (message.startsWith("fix") || message.includes("bug") || message.includes("fix")) {
    type = "fix";
  } else if (message.startsWith("refactor") || message.includes("refactor") || message.includes("clean")) {
    type = "refactor";
  } else if (message.startsWith("docs") || message.includes("readme") || message.includes("documentation")) {
    type = "docs";
  } else if (message.startsWith("test") || message.includes("test")) {
    type = "test";
  }

  // Determine scope from files changed
  const scopes = new Set<string>();
  for (const file of commit.files) {
    if (file.includes("_features/")) {
      const match = file.match(/_features\/([^/]+)/);
      if (match) scopes.add(match[1]);
    } else if (file.includes("components/")) {
      scopes.add("ui");
    } else if (file.includes("supabase/")) {
      scopes.add("database");
    } else if (file.includes("scripts/")) {
      scopes.add("tooling");
    }
  }

  // Determine impact
  let impact: CommitAnalysis["impact"] = "low";
  if (type === "feature" || commit.insertions > 100) {
    impact = "high";
  } else if (type === "fix" || commit.insertions > 30) {
    impact = "medium";
  }

  // Extract key details
  const details: string[] = [];
  if (commit.files.length > 0) {
    details.push(`${commit.files.length} files changed`);
  }
  if (commit.insertions > 0) {
    details.push(`+${commit.insertions} lines`);
  }

  return {
    type,
    scope: Array.from(scopes).join(", ") || "core",
    summary: commit.message,
    impact,
    details,
  };
}

function createDigest(commits: GitCommit[], date: string): DayDigest {
  const analysis = commits.map(analyzeCommit);

  // Find hero commit (highest impact feature or fix)
  const hero = analysis
    .filter(a => a.type === "feature" || a.type === "fix")
    .sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    })[0] || null;

  const stats = {
    totalCommits: commits.length,
    filesChanged: commits.reduce((sum, c) => sum + c.files.length, 0),
    insertions: commits.reduce((sum, c) => sum + c.insertions, 0),
    deletions: commits.reduce((sum, c) => sum + c.deletions, 0),
  };

  return { date, commits, analysis, hero, stats };
}

// =============================================================================
// POST GENERATION
// =============================================================================

const POST_TEMPLATES = {
  feature: [
    "Shipped {summary} today.\n\n{details}\n\nBuilding SALT in public.",
    "{summary}.\n\nSmall win, but it's live.\n\n{details}",
    "New in SALT: {summary}\n\n{why}\n\nFollow along as I build.",
  ],
  fix: [
    "Fixed a bug where {summary}.\n\nThe kind of thing that takes 5 min to fix but 2 hours to find.\n\nBuilding in public.",
    "Bug squashed: {summary}\n\n{details}\n\nOnward.",
    "That annoying {scope} bug? Gone.\n\n{summary}\n\nShipping daily.",
  ],
  refactor: [
    "Cleaned up the {scope} code today.\n\nNo new features, but the codebase thanks me.\n\n{details}",
    "Refactoring day.\n\n{summary}\n\nSometimes you gotta slow down to speed up.",
    "Technical debt paydown: {summary}\n\n{details}\n\nNot glamorous, but necessary.",
  ],
  multiple: [
    "Shipped today:\n\n{bulletPoints}",
    "Today's progress:\n\n{bulletPoints}",
    "Building SALT:\n\n{bulletPoints}",
  ],
  noCode: [
    "No code today.\n\nSome days you need to step back, think, plan.\n\nBack at it tomorrow.",
    "Research day. Reading, thinking, not coding.\n\nBuilding a product is more than just shipping features.",
    "Taking a breather today.\n\nSustainability > hustle.\n\nSee you tomorrow.",
  ],
};

function generateWhyItMatters(analysis: CommitAnalysis): string {
  const whyMap: Record<string, string[]> = {
    clients: ["Client management just got easier.", "Your clients will notice."],
    projects: ["Project tracking, simplified.", "Less chaos, more clarity."],
    invoices: ["Getting paid shouldn't be hard.", "One less thing to worry about."],
    tasks: ["Task management that doesn't suck.", "Ship faster."],
    messaging: ["Communication, sorted.", "Keep clients in the loop."],
    ui: ["Small UI polish.", "Details matter."],
    database: ["Backend improvements.", "Faster, more reliable."],
    tooling: ["Developer experience upgrade.", "Build faster."],
  };

  const scopeKey = analysis.scope.split(",")[0]?.trim() || "core";
  const options = whyMap[scopeKey] || ["Moving forward.", "Progress."];
  return options[Math.floor(Math.random() * options.length)];
}

function generatePost(digest: DayDigest): PostDraft[] {
  const posts: PostDraft[] = [];

  // No commits - use no-code template
  if (digest.commits.length === 0) {
    const template = POST_TEMPLATES.noCode[Math.floor(Math.random() * POST_TEMPLATES.noCode.length)];
    posts.push({
      content: template,
      platform: "x",
      pillar: "build_journey",
      hook: "honest",
    });
    return posts;
  }

  // Single significant commit - focus on it
  if (digest.hero && digest.commits.length <= 3) {
    const templates = POST_TEMPLATES[digest.hero.type] || POST_TEMPLATES.feature;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const content = template
      .replace("{summary}", digest.hero.summary.replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, ""))
      .replace("{scope}", digest.hero.scope)
      .replace("{details}", digest.hero.details.join(" · "))
      .replace("{why}", generateWhyItMatters(digest.hero));

    posts.push({
      content,
      platform: "x",
      pillar: "build_journey",
      hook: digest.hero.type === "feature" ? "data" : "story",
    });
  }

  // Multiple commits - use bullet point format (keep under 280 chars)
  if (digest.commits.length > 1) {
    const items = digest.analysis
      .filter(a => a.type !== "chore" && a.type !== "docs")
      .slice(0, 3)
      .map(a => {
        // Clean and shorten the summary
        let summary = a.summary
          .replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, "")
          .replace(/\(#\d+\)/g, "") // Remove PR numbers
          .trim();
        // Truncate long summaries
        if (summary.length > 50) {
          summary = summary.substring(0, 47) + "...";
        }
        return `• ${summary}`;
      })
      .join("\n");

    if (items) {
      const template = POST_TEMPLATES.multiple[Math.floor(Math.random() * POST_TEMPLATES.multiple.length)];
      const content = template.replace("{bulletPoints}", items);

      posts.push({
        content,
        platform: "x",
        pillar: "build_journey",
        hook: "data",
      });
    }
  }

  // Generate LinkedIn version (longer, more context)
  if (digest.hero) {
    const linkedInContent = `Working on SALT yesterday, I shipped something I've been thinking about for a while:

${digest.hero.summary.replace(/^(feat|fix|refactor|docs|test|chore)(\(.+\))?:\s*/i, "")}

${generateWhyItMatters(digest.hero)}

The boring details: ${digest.stats.totalCommits} commits, ${digest.stats.filesChanged} files changed.

Building in public means sharing the small wins too. Not everything is a launch day.

What are you shipping this week?`;

    posts.push({
      content: linkedInContent,
      platform: "linkedin",
      pillar: "build_journey",
      hook: "story",
    });
  }

  return posts;
}

// =============================================================================
// CONTENT BANK FALLBACK
// =============================================================================

function getContentFromBank(): PostDraft | null {
  const bankPath = resolve(process.cwd(), "brand-identity/content-bank");

  if (!existsSync(bankPath)) {
    return null;
  }

  const categories = ["lessons-learned", "industry-takes", "identity-craft"];

  for (const category of categories) {
    const categoryPath = resolve(bankPath, category);
    if (existsSync(categoryPath)) {
      try {
        const files = readdirSync(categoryPath).filter(f => f.endsWith(".md"));
        if (files.length > 0) {
          const randomFile = files[Math.floor(Math.random() * files.length)];
          const content = readFileSync(resolve(categoryPath, randomFile), "utf-8");

          const lines = content.split("\n").filter(l => !l.startsWith("#") && l.trim());
          const postContent = lines.slice(0, 5).join("\n").trim();

          if (postContent) {
            return {
              content: postContent,
              platform: "x",
              pillar: category.replace("-", "_"),
              hook: "evergreen",
            };
          }
        }
      } catch {
        // Continue to next category
      }
    }
  }

  return null;
}

// =============================================================================
// VOICE GUARDIAN (inline check)
// =============================================================================

const FLAGGED_WORDS = ["leverage", "utilize", "delve", "streamline", "optimize", "robust", "seamless", "cutting-edge", "game-changing", "synergy"];
const BANNED_PHRASES = ["in today's", "let's dive", "here's the thing", "we're excited", "unlock the"];

function checkVoice(content: string, platform: "x" | "linkedin" = "x"): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  const lower = content.toLowerCase();

  for (const word of FLAGGED_WORDS) {
    if (lower.includes(word)) {
      issues.push(`"${word}" sounds AI`);
      score -= 15;
    }
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push(`"${phrase}..." is banned`);
      score -= 15;
    }
  }

  // Platform-specific length checks
  const maxLength = platform === "x" ? 280 : 3000;
  if (content.length > maxLength) {
    issues.push(`Too long for ${platform} (${content.length}/${maxLength})`);
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

// =============================================================================
// TYPEFULLY INTEGRATION
// =============================================================================

const TYPEFULLY_API_BASE = "https://api.typefully.com/v2";
const ACCOUNT_ALIASES: Record<string, string> = {
  personal: "282093",
  product: "282089",
};

async function createTypefullyDraft(content: string, platform: "x" | "linkedin"): Promise<string | null> {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  if (!apiKey) {
    console.log("  ⚠️  No TYPEFULLY_API_KEY - skipping draft creation");
    return null;
  }

  const accountId = ACCOUNT_ALIASES.personal;

  try {
    const response = await fetch(`${TYPEFULLY_API_BASE}/social-sets/${accountId}/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platforms: {
          [platform]: {
            enabled: true,
            posts: [{ text: content }],
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
// CLI
// =============================================================================

function printUsage() {
  console.log(`
BIP Digest - Generate Build in Public posts from git activity

Usage:
  npx tsx scripts/bip-digest.ts                    # Analyze yesterday
  npx tsx scripts/bip-digest.ts --days 2           # Analyze last N days
  npx tsx scripts/bip-digest.ts --date 2026-02-05  # Specific date
  npx tsx scripts/bip-digest.ts --dry-run          # Preview only
  npx tsx scripts/bip-digest.ts --bank             # Use content bank

Options:
  --days N       Look back N days (default: 1)
  --date DATE    Analyze specific date (YYYY-MM-DD)
  --dry-run      Don't create Typefully drafts
  --bank         Force use content bank
  --account      Account: personal (default) or product
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let daysBack = 1;
  let specificDate: string | null = null;
  let dryRun = false;
  let useBank = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days" && args[i + 1]) {
      daysBack = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--date" && args[i + 1]) {
      specificDate = args[i + 1];
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--bank") {
      useBank = true;
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    BIP DIGEST                                  ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const now = new Date();
  let since: string;
  let until: string;

  if (specificDate) {
    if (!isValidDateFormat(specificDate)) {
      console.error("  ❌ Invalid date format. Use YYYY-MM-DD.\n");
      process.exit(1);
    }
    since = specificDate;
    const nextDay = new Date(specificDate);
    nextDay.setDate(nextDay.getDate() + 1);
    until = nextDay.toISOString().split("T")[0];
  } else {
    const sinceDate = new Date(now);
    sinceDate.setDate(sinceDate.getDate() - daysBack);
    since = sinceDate.toISOString().split("T")[0];
    until = now.toISOString().split("T")[0];
  }

  console.log(`  📅 Analyzing: ${since} to ${until}`);

  if (useBank) {
    console.log("  📚 Using content bank (--bank flag)\n");
    const bankPost = getContentFromBank();
    if (bankPost) {
      console.log("  Content from bank:\n");
      console.log("  ─────────────────────────────────────────────────────────────\n");
      console.log(`  ${bankPost.content.split("\n").join("\n  ")}\n`);
      console.log("  ─────────────────────────────────────────────────────────────\n");

      if (!dryRun) {
        const draftId = await createTypefullyDraft(bankPost.content, "x");
        if (draftId) {
          console.log(`  ✅ Draft created: ${draftId}\n`);
        }
      }
    } else {
      console.log("  ⚠️  Content bank is empty. Create posts in brand-identity/content-bank/\n");
    }
    return;
  }

  const commits = getGitLog(since, until);
  console.log(`  📝 Found ${commits.length} commits\n`);

  if (commits.length === 0) {
    console.log("  No commits found. Options:\n");
    console.log("  1. Use content bank: npx tsx scripts/bip-digest.ts --bank");
    console.log("  2. Skip today (be honest with audience)");
    console.log("  3. Expand date range: npx tsx scripts/bip-digest.ts --days 3\n");

    const bankPost = getContentFromBank();
    if (bankPost) {
      console.log("  📚 Suggested from content bank:\n");
      console.log("  ─────────────────────────────────────────────────────────────\n");
      console.log(`  ${bankPost.content.split("\n").join("\n  ")}\n`);
    }
    return;
  }

  const digest = createDigest(commits, since);

  console.log("  STATS");
  console.log("  ─────────────────────────────────────────────────────────────");
  console.log(`  Commits: ${digest.stats.totalCommits}`);
  console.log(`  Files changed: ${digest.stats.filesChanged}`);
  console.log(`  Lines: +${digest.stats.insertions} / -${digest.stats.deletions}`);
  if (digest.hero) {
    console.log(`  Hero: ${digest.hero.summary} (${digest.hero.type}, ${digest.hero.impact} impact)`);
  }
  console.log("");

  const posts = generatePost(digest);

  console.log(`  GENERATED ${posts.length} POST(S)\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const voice = checkVoice(post.content, post.platform);
    post.score = voice.score;

    const scoreEmoji = voice.score >= 80 ? "🟢" : voice.score >= 60 ? "🟡" : "🔴";

    console.log(`  ─────────────────────────────────────────────────────────────`);
    console.log(`  POST ${i + 1} | ${post.platform.toUpperCase()} | ${scoreEmoji} ${voice.score}/100`);
    console.log(`  ─────────────────────────────────────────────────────────────\n`);
    console.log(`  ${post.content.split("\n").join("\n  ")}\n`);

    if (voice.issues.length > 0) {
      console.log(`  Issues: ${voice.issues.join(", ")}\n`);
    }

    if (!dryRun && voice.score >= 60) {
      const draftId = await createTypefullyDraft(post.content, post.platform);
      if (draftId) {
        console.log(`  ✅ Draft created: ${draftId}\n`);
      }
    } else if (dryRun) {
      console.log(`  ⏸️  Dry run - no draft created\n`);
    }
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  👉 Open Typefully to review and schedule");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main();
