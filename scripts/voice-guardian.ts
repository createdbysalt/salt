#!/usr/bin/env npx tsx
/**
 * Voice Guardian CLI
 *
 * Checks content against Salt's voice principles to catch AI-sounding
 * patterns before publishing. Returns a voice score (0-100) and specific flags.
 *
 * For X/Twitter, also checks against Gabi's personal voice profile for
 * authenticity (human score).
 *
 * Usage:
 *   npx tsx scripts/voice-guardian.ts "Your content here"
 *   npx tsx scripts/voice-guardian.ts --file path/to/content.txt
 *   npx tsx scripts/voice-guardian.ts --platform twitter "Your tweet"
 *   npx tsx scripts/voice-guardian.ts --platform linkedin "Your post"
 *   npx tsx scripts/voice-guardian.ts --platform x --voice gabi "Your tweet"
 *
 * Options:
 *   --platform  Platform-specific checks (twitter, x, linkedin, instagram)
 *   --voice     Voice profile to check against (gabi)
 *   --file      Read content from a file
 *   --json      Output as JSON (for programmatic use)
 *   --fix       Suggest replacements for flagged words
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// =============================================================================
// AI DETECTION KILL LIST (from voice-principles.md)
// =============================================================================

const FLAGGED_WORDS: Record<string, string> = {
  utilize: "use",
  leverage: "use",
  delve: "explore, dig into, look at",
  streamline: "speed up, simplify",
  optimize: "improve",
  robust: "solid, strong",
  scalable: "grows with you",
  seamless: "smooth, easy",
  revolutionize: "change",
  multifaceted: "complex",
  "cutting-edge": "new, modern, latest",
  holistic: "(delete—just describe what's included)",
  comprehensive: "(delete—just name the things)",
  "game-changing": "different, better",
  "best-in-class": "(delete—describe why it's good)",
  elevate: "improve",
  synergy: "(delete)",
  paradigm: "(delete)",
  empower: "help",
  harness: "use",
  innovative: "new",
  transformative: "changes how you",
  curated: "selected, chosen",
  bespoke: "custom",
  ecosystem: "system",
  actionable: "(delete or be specific)",
  impactful: "effective",
  granular: "detailed",
  bandwidth: "time, capacity",
  deliverables: "work, output",
  stakeholders: "people involved",
  learnings: "lessons, insights",
  cadence: "schedule, rhythm",
  touchpoint: "interaction, contact",
};

const BANNED_PHRASES: string[] = [
  // Opener killers
  "in today's fast-paced world",
  "in the ever-evolving landscape",
  "it's no secret that",
  "in today's digital age",
  "in this day and age",
  "now more than ever",
  "let's dive in",
  "here's the thing",
  "without further ado",

  // Empty superlatives
  "unlock the full potential",
  "take your x to the next level",
  "supercharge your",
  "experience the future of",
  "the ultimate solution",
  "harness the power of",
  "a testament to",
  "sky's the limit",
  "game changer",
  "next level",

  // Corporate zombies
  "seamless integration",
  "drive synergies",
  "move the needle",
  "circle back",
  "low-hanging fruit",
  "paradigm shift",
  "at the end of the day",
  "going forward",
  "win-win",
  "think outside the box",
  "best practices",
  "value-add",
  "deep dive",
  "pivot",
  "disrupt",

  // Filler (just delete)
  "moreover",
  "furthermore",
  "it's worth noting that",
  "it's important to note",
  "needless to say",
  "as we all know",
  "interestingly enough",
  "to be honest",
  "at this point in time",

  // Excited AI
  "we're excited to announce",
  "we're thrilled to share",
  "i'm excited to",
  "i'm thrilled to",
  "can't wait to share",
  "so excited about",
];

const PLATFORM_LIMITS: Record<string, { maxLength: number; hookLength: number }> = {
  twitter: { maxLength: 280, hookLength: 200 },
  x: { maxLength: 280, hookLength: 200 },
  linkedin: { maxLength: 3000, hookLength: 300 },
  instagram: { maxLength: 2200, hookLength: 125 },
};

// =============================================================================
// GABI'S VOICE PROFILE (X/Twitter authenticity checks)
// =============================================================================

interface VoiceProfile {
  bannedStarters: string[];
  preferredOpeners: string[];
  contractionStyle: "no_apostrophes" | "standard";
  capitalization: "lowercase" | "standard";
  humanitySignals: string[];
  emoticons: string[];
}

const GABI_VOICE_PROFILE: VoiceProfile = {
  bannedStarters: [
    "Just shipped",
    "Excited to",
    "Here's the thing",
    "I've been thinking",
    "Let me share",
    "Quick thread",
    "Thread time",
    "Hot take:",
    "Unpopular opinion:",
    "Thrilled to",
    "Proud to",
  ],
  preferredOpeners: ["okay so", "so", "finally", "honestly", "ngl", "tbh"],
  contractionStyle: "no_apostrophes",
  capitalization: "lowercase",
  humanitySignals: [
    "lol",
    "tbh",
    "ngl",
    "you guys",
    "yall",
    ":)",
    ":(",
    ":/",
    ":D",
  ],
  emoticons: [":)", ":(", ":D", ":/", ":P"],
};

// Check if content matches Gabi's voice patterns
function checkGabiVoice(content: string): { humanScore: number; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let humanScore = 100;

  // Check 1: Banned starters
  for (const starter of GABI_VOICE_PROFILE.bannedStarters) {
    if (content.toLowerCase().startsWith(starter.toLowerCase())) {
      issues.push(`Starts with "${starter}" - too polished`);
      suggestions.push(`Try starting with: "${GABI_VOICE_PROFILE.preferredOpeners[Math.floor(Math.random() * GABI_VOICE_PROFILE.preferredOpeners.length)]}..."`);
      humanScore -= 20;
      break;
    }
  }

  // Check 2: Capitalization (should be lowercase)
  if (content.charAt(0) === content.charAt(0).toUpperCase() && /[a-zA-Z]/.test(content.charAt(0))) {
    // Starts with capital letter
    const words = content.split(" ");
    const capitalWords = words.filter(w => w.charAt(0) === w.charAt(0).toUpperCase() && /[a-zA-Z]/.test(w.charAt(0)));
    const capitalRatio = capitalWords.length / words.length;

    if (capitalRatio > 0.3) {
      issues.push("Too many capital letters - feels formal");
      suggestions.push("Try lowercase: \"" + content.charAt(0).toLowerCase() + content.slice(1, 50) + "...\"");
      humanScore -= 10;
    }
  }

  // Check 3: Apostrophes in contractions (should NOT have them)
  const contractionWithApostrophe = /\b(I'm|don't|can't|won't|didn't|isn't|aren't|I've|you're|they're|let's|that's|it's|I'll|you'll|we'll)\b/g;
  const matches = content.match(contractionWithApostrophe);
  if (matches && matches.length > 0) {
    issues.push(`Found ${matches.length} contractions with apostrophes`);
    suggestions.push("Gabi's style: im, dont, cant, wont, didnt, lets, thats, ive, youre");
    humanScore -= 5 * Math.min(matches.length, 3);
  }

  // Check 4: Humanity signals (bonus for having them)
  let hasHumanitySignal = false;
  for (const signal of GABI_VOICE_PROFILE.humanitySignals) {
    if (content.toLowerCase().includes(signal)) {
      hasHumanitySignal = true;
      break;
    }
  }
  if (!hasHumanitySignal && content.length > 50) {
    issues.push("No casual markers (emoticons, 'lol', 'you guys', etc.)");
    suggestions.push("Add personality: :) or :( or 'you guys' or 'lol'");
    humanScore -= 10;
  }

  // Check 5: Sentence length (should be short and punchy)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(" ").length, 0) / sentences.length;
  if (avgSentenceLength > 15) {
    issues.push(`Average sentence is ${Math.round(avgSentenceLength)} words - too long`);
    suggestions.push("Break into shorter sentences. Punchy wins.");
    humanScore -= 10;
  }

  // Check 6: Perfect punctuation (AI tell)
  const hasPerfectPunctuation = !content.includes("...") &&
                                 !content.includes("..") &&
                                 content.endsWith(".") &&
                                 !content.includes("!") &&
                                 !content.includes(":(") &&
                                 !content.includes(":)");
  if (hasPerfectPunctuation && content.length > 100) {
    issues.push("Punctuation is too perfect");
    suggestions.push("Add some imperfection: trailing thought... or an emoticon");
    humanScore -= 5;
  }

  // Bonus: Preferred openers
  for (const opener of GABI_VOICE_PROFILE.preferredOpeners) {
    if (content.toLowerCase().startsWith(opener)) {
      humanScore += 10;
      break;
    }
  }

  // Bonus: Has emoticon
  for (const emoticon of GABI_VOICE_PROFILE.emoticons) {
    if (content.includes(emoticon)) {
      humanScore += 5;
      break;
    }
  }

  return {
    humanScore: Math.max(0, Math.min(100, humanScore)),
    issues,
    suggestions,
  };
}

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

interface VoiceFlag {
  type: "word" | "phrase" | "pattern" | "structure";
  severity: "high" | "medium" | "low";
  message: string;
  position?: number;
  suggestion?: string;
}

interface VoiceAnalysis {
  score: number;
  humanScore?: number;
  flags: VoiceFlag[];
  humanFlags?: {
    issues: string[];
    suggestions: string[];
  };
  stats: {
    wordCount: number;
    sentenceCount: number;
    emDashCount: number;
    colonCount: number;
    exclamationCount: number;
    questionCount: number;
  };
  platform?: {
    name: string;
    lengthOk: boolean;
    hookLengthOk: boolean;
  };
  voiceProfile?: string;
}

function countPattern(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function analyzeContent(content: string, platform?: string, voiceProfile?: string): VoiceAnalysis {
  const flags: VoiceFlag[] = [];
  const lowerContent = content.toLowerCase();

  // Stats
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const sentenceCount = sentences.length;
  const emDashCount = countPattern(content, /—/g);
  const colonCount = countPattern(content, /:/g);
  const exclamationCount = countPattern(content, /!/g);
  const questionCount = countPattern(content, /\?/g);

  // Calculate paragraphs for em-dash check
  const paragraphs = content.split(/\n\n+/);

  // ==========================================================================
  // CHECK 1: Flagged words
  // ==========================================================================
  for (const [word, replacement] of Object.entries(FLAGGED_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const match = lowerContent.match(regex);
    if (match) {
      flags.push({
        type: "word",
        severity: "high",
        message: `"${word}" sounds AI-generated`,
        suggestion: replacement,
      });
    }
  }

  // ==========================================================================
  // CHECK 2: Banned phrases
  // ==========================================================================
  for (const phrase of BANNED_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      flags.push({
        type: "phrase",
        severity: "high",
        message: `"${phrase}" is a banned AI phrase`,
        suggestion: "Delete or rewrite naturally",
      });
    }
  }

  // ==========================================================================
  // CHECK 3: Em-dash overuse (max 1 per paragraph)
  // ==========================================================================
  for (let i = 0; i < paragraphs.length; i++) {
    const paraEmDashes = countPattern(paragraphs[i], /—/g);
    if (paraEmDashes > 1) {
      flags.push({
        type: "pattern",
        severity: "medium",
        message: `Paragraph ${i + 1} has ${paraEmDashes} em-dashes (max 1)`,
        suggestion: "Use commas, periods, or parentheses instead",
      });
    }
  }

  // ==========================================================================
  // CHECK 4: Colon overload
  // ==========================================================================
  const colonRatio = colonCount / sentenceCount;
  if (colonRatio > 0.3) {
    flags.push({
      type: "pattern",
      severity: "medium",
      message: `Colon overload: ${colonCount} colons in ${sentenceCount} sentences`,
      suggestion: "Rewrite some as natural sentences",
    });
  }

  // ==========================================================================
  // CHECK 5: Exclamation overload
  // ==========================================================================
  if (exclamationCount > 1) {
    flags.push({
      type: "pattern",
      severity: "medium",
      message: `${exclamationCount} exclamation points (max 1 per piece)`,
      suggestion: "Use periods. Earn the one exclamation.",
    });
  }

  // ==========================================================================
  // CHECK 6: Starts with "I" (social media anti-pattern)
  // ==========================================================================
  if (content.trim().startsWith("I ") || content.trim().startsWith("I'")) {
    flags.push({
      type: "structure",
      severity: "low",
      message: "Starts with 'I' - less engaging for social",
      suggestion: "Lead with insight, question, or bold claim",
    });
  }

  // ==========================================================================
  // CHECK 7: Perfect parallel structure (AI tell)
  // ==========================================================================
  const bulletLines = content.split("\n").filter(l => l.trim().startsWith("•") || l.trim().startsWith("-"));
  if (bulletLines.length >= 3) {
    const firstWords = bulletLines.map(l => l.replace(/^[•\-]\s*/, "").split(" ")[0]);
    const allSamePattern = firstWords.every(w =>
      w === firstWords[0] ||
      (firstWords[0].endsWith("ing") && w.endsWith("ing"))
    );
    if (allSamePattern && bulletLines.length >= 4) {
      flags.push({
        type: "structure",
        severity: "low",
        message: "Bullet points have perfect parallel structure (AI pattern)",
        suggestion: "Vary the rhythm. Mix it up.",
      });
    }
  }

  // ==========================================================================
  // CHECK 8: Too many numbered lists
  // ==========================================================================
  const numberedLines = content.split("\n").filter(l => /^\d+[.)]\s/.test(l.trim()));
  if (numberedLines.length >= 5) {
    flags.push({
      type: "structure",
      severity: "low",
      message: `${numberedLines.length} numbered items - AI loves lists`,
      suggestion: "Use prose when a list isn't needed",
    });
  }

  // ==========================================================================
  // CHECK 9: Platform-specific checks
  // ==========================================================================
  let platformResult;
  if (platform && PLATFORM_LIMITS[platform]) {
    const limits = PLATFORM_LIMITS[platform];
    const lengthOk = content.length <= limits.maxLength;
    const firstLine = content.split("\n")[0];
    const hookLengthOk = firstLine.length <= limits.hookLength;

    if (!lengthOk) {
      flags.push({
        type: "structure",
        severity: "high",
        message: `Content is ${content.length} chars (${platform} max: ${limits.maxLength})`,
      });
    }

    if (!hookLengthOk) {
      flags.push({
        type: "structure",
        severity: "medium",
        message: `Hook is ${firstLine.length} chars (${platform} ideal: ${limits.hookLength})`,
        suggestion: "Tighten the first line for better engagement",
      });
    }

    platformResult = {
      name: platform,
      lengthOk,
      hookLengthOk,
    };
  }

  // ==========================================================================
  // CALCULATE SCORE
  // ==========================================================================
  let score = 100;

  for (const flag of flags) {
    switch (flag.severity) {
      case "high":
        score -= 15;
        break;
      case "medium":
        score -= 8;
        break;
      case "low":
        score -= 3;
        break;
    }
  }

  // Bonus for good patterns
  if (questionCount >= 1 && questionCount <= 2) {
    score += 3; // Questions are engaging
  }
  if (wordCount > 10 && emDashCount === 0) {
    score += 2; // Clean punctuation
  }

  score = Math.max(0, Math.min(100, score));

  // ==========================================================================
  // CHECK 10: Voice profile (Gabi's X authenticity)
  // ==========================================================================
  let humanScore: number | undefined;
  let humanFlags: { issues: string[]; suggestions: string[] } | undefined;

  // Auto-apply Gabi voice for X/Twitter
  const shouldCheckGabiVoice = voiceProfile === "gabi" ||
    ((platform === "x" || platform === "twitter") && voiceProfile !== "none");

  if (shouldCheckGabiVoice) {
    const gabiResult = checkGabiVoice(content);
    humanScore = gabiResult.humanScore;
    humanFlags = {
      issues: gabiResult.issues,
      suggestions: gabiResult.suggestions,
    };
  }

  return {
    score: Math.round(score),
    humanScore,
    flags,
    humanFlags,
    stats: {
      wordCount,
      sentenceCount,
      emDashCount,
      colonCount,
      exclamationCount,
      questionCount,
    },
    platform: platformResult,
    voiceProfile: shouldCheckGabiVoice ? "gabi" : undefined,
  };
}

// =============================================================================
// CLI OUTPUT
// =============================================================================

function formatOutput(analysis: VoiceAnalysis, content: string, asJson: boolean, showFix: boolean): string {
  if (asJson) {
    return JSON.stringify(analysis, null, 2);
  }

  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    VOICE GUARDIAN REPORT                       ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  // Score with visual indicator
  const scoreBar = "█".repeat(Math.floor(analysis.score / 5)) + "░".repeat(20 - Math.floor(analysis.score / 5));
  let scoreEmoji = "🔴";
  if (analysis.score >= 80) scoreEmoji = "🟢";
  else if (analysis.score >= 60) scoreEmoji = "🟡";

  lines.push(`  VOICE SCORE: ${scoreEmoji} ${analysis.score}/100`);
  lines.push(`  [${scoreBar}]`);

  // Human score for X/Twitter
  if (analysis.humanScore !== undefined) {
    const humanBar = "█".repeat(Math.floor(analysis.humanScore / 5)) + "░".repeat(20 - Math.floor(analysis.humanScore / 5));
    let humanEmoji = "🔴";
    if (analysis.humanScore >= 80) humanEmoji = "🟢";
    else if (analysis.humanScore >= 60) humanEmoji = "🟡";

    lines.push("");
    lines.push(`  HUMAN SCORE: ${humanEmoji} ${analysis.humanScore}/100 (Gabi's voice)`);
    lines.push(`  [${humanBar}]`);
  }

  lines.push("");

  // Platform check
  if (analysis.platform) {
    lines.push(`  PLATFORM: ${analysis.platform.name.toUpperCase()}`);
    lines.push(`  Length: ${analysis.platform.lengthOk ? "✅" : "❌"} | Hook: ${analysis.platform.hookLengthOk ? "✅" : "❌"}`);
    lines.push("");
  }

  // Stats
  lines.push("  STATS");
  lines.push("  ─────────────────────────────────────────────────────────────");
  lines.push(`  Words: ${analysis.stats.wordCount} | Sentences: ${analysis.stats.sentenceCount}`);
  lines.push(`  Em-dashes: ${analysis.stats.emDashCount} | Colons: ${analysis.stats.colonCount} | Exclamations: ${analysis.stats.exclamationCount}`);
  lines.push("");

  // Flags
  if (analysis.flags.length === 0) {
    lines.push("  ✅ NO ISSUES DETECTED");
    lines.push("  Your content passes all voice checks.");
  } else {
    lines.push(`  ⚠️  ${analysis.flags.length} ISSUE${analysis.flags.length > 1 ? "S" : ""} FOUND`);
    lines.push("  ─────────────────────────────────────────────────────────────");

    const highFlags = analysis.flags.filter(f => f.severity === "high");
    const mediumFlags = analysis.flags.filter(f => f.severity === "medium");
    const lowFlags = analysis.flags.filter(f => f.severity === "low");

    if (highFlags.length > 0) {
      lines.push("");
      lines.push("  🔴 HIGH SEVERITY");
      for (const flag of highFlags) {
        lines.push(`     • ${flag.message}`);
        if (showFix && flag.suggestion) {
          lines.push(`       → ${flag.suggestion}`);
        }
      }
    }

    if (mediumFlags.length > 0) {
      lines.push("");
      lines.push("  🟡 MEDIUM SEVERITY");
      for (const flag of mediumFlags) {
        lines.push(`     • ${flag.message}`);
        if (showFix && flag.suggestion) {
          lines.push(`       → ${flag.suggestion}`);
        }
      }
    }

    if (lowFlags.length > 0) {
      lines.push("");
      lines.push("  🟢 LOW SEVERITY");
      for (const flag of lowFlags) {
        lines.push(`     • ${flag.message}`);
        if (showFix && flag.suggestion) {
          lines.push(`       → ${flag.suggestion}`);
        }
      }
    }
  }

  // Human voice issues (for X/Twitter)
  if (analysis.humanFlags && analysis.humanFlags.issues.length > 0) {
    lines.push("");
    lines.push("  👤 AUTHENTICITY ISSUES (Gabi's Voice)");
    lines.push("  ─────────────────────────────────────────────────────────────");
    for (let i = 0; i < analysis.humanFlags.issues.length; i++) {
      lines.push(`     • ${analysis.humanFlags.issues[i]}`);
      if (showFix && analysis.humanFlags.suggestions[i]) {
        lines.push(`       → ${analysis.humanFlags.suggestions[i]}`);
      }
    }
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  // Verdict - consider both scores for X
  const effectiveScore = analysis.humanScore !== undefined
    ? Math.min(analysis.score, analysis.humanScore)
    : analysis.score;

  if (effectiveScore >= 80) {
    lines.push("  ✅ READY TO POST");
  } else if (effectiveScore >= 60) {
    lines.push("  ⚠️  NEEDS MINOR EDITS");
  } else {
    lines.push("  ❌ NEEDS REWRITE - Too AI-sounding");
  }

  if (analysis.humanScore !== undefined && analysis.humanScore < analysis.score) {
    lines.push("  💡 Voice score is good, but doesn't sound like you yet.");
  }

  lines.push("");

  return lines.join("\n");
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let content = "";
  let platform: string | undefined;
  let voiceProfile: string | undefined;
  let asJson = false;
  let showFix = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--platform" && args[i + 1]) {
      platform = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === "--voice" && args[i + 1]) {
      voiceProfile = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === "--file" && args[i + 1]) {
      content = readFileSync(args[i + 1], "utf-8");
      i++;
    } else if (args[i] === "--json") {
      asJson = true;
    } else if (args[i] === "--fix") {
      showFix = true;
    } else if (!args[i].startsWith("--")) {
      content = args[i];
    }
  }

  if (!content) {
    console.log(`
Voice Guardian - Check content against Salt voice principles

Usage:
  npx tsx scripts/voice-guardian.ts "Your content here"
  npx tsx scripts/voice-guardian.ts --file path/to/content.txt
  npx tsx scripts/voice-guardian.ts --platform x "Your tweet"
  npx tsx scripts/voice-guardian.ts --platform x --voice gabi "Your tweet"

Options:
  --platform  Platform checks (x, twitter, linkedin, instagram)
  --voice     Voice profile to check (gabi) - auto-applied for X/Twitter
  --file      Read content from a file
  --json      Output as JSON
  --fix       Show suggested replacements

Examples:
  npx tsx scripts/voice-guardian.ts "Leverage our cutting-edge platform!"
  npx tsx scripts/voice-guardian.ts --platform x --fix "Just shipped a new feature!"
  npx tsx scripts/voice-guardian.ts --platform x "okay so this bug took forever but i got it!"
`);
    process.exit(0);
  }

  const analysis = analyzeContent(content, platform, voiceProfile);
  console.log(formatOutput(analysis, content, asJson, showFix));

  // Exit with error code if score is too low
  process.exit(analysis.score >= 60 ? 0 : 1);
}

main();
