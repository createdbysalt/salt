/**
 * One-time extractor: reads learn article metadata from content.tsx and writes
 * markdown stubs to content/migrate/blog/{slug}.md for Sanity seeding.
 *
 * Usage: pnpm tsx scripts/extract-learn-article-markdown.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPARE_ARTICLE_SLUGS } from "../app/_features/marketing/compare/compare-slugs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_PATH = join(ROOT, "app/(public)/learn/_assets/content.tsx");
const OUTPUT_DIR = join(ROOT, "content/migrate/blog");

const COMPARE_SLUGS = new Set(COMPARE_ARTICLE_SLUGS);
const RETIRED = new Set(["salt-pricing"]);

type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  categoryLegacy: string;
  authorSlug: string;
};

const KEY_TAKEAWAYS: Record<string, string[]> = {
  "what-is-proactive-ai": [
    "Proactive AI monitors business data and surfaces what needs attention without a prompt.",
    "Reactive AI waits for you to ask; proactive AI uses a push model based on rules and signals.",
    "Salt is proactive AI built for independent professionals who approve prepared work.",
  ],
  "proactive-ai-vs-reactive-ai": [
    "Reactive AI is pull-based — you must remember what to ask.",
    "Proactive AI is push-based — it brings exceptions and opportunities to you.",
    "Operations work needs push; creative Q&A can stay pull.",
  ],
  "how-proactive-ai-automates-operations": [
    "Proactive automation follows Observe → Surface → Decide → Act (with approval).",
    "Connected accounts supply the observation layer — email, calendar, payments, CRM.",
    "You stay the approver; the system does the monitoring.",
  ],
  "introducing-supabase": [
    "Salt uses Supabase for auth, database, and realtime infrastructure.",
    "Studio operators get secure multi-tenant data with row-level security.",
    "This post explains what we shipped and why it matters for your practice.",
  ],
  "salt-reads-your-business": [
    "Salt connects to the tools you already use to learn how your business runs.",
    "It maintains memory across clients, projects, and conversations.",
    "The goal is proactive insight — not another dashboard you have to check.",
  ],
  "how-salt-drafts-proposals-and-followups": [
    "Salt drafts proposals and follow-ups from your business context.",
    "You review and approve before anything sends.",
    "This tutorial walks through the workflow step by step.",
  ],
  "how-to-price-your-projects": [
    "Price from value and scope — not hours alone.",
    "Document assumptions early to avoid scope creep.",
    "Raise prices when demand signals justify it.",
  ],
  "when-to-say-no-to-a-client": [
    "Saying no protects capacity for better-fit work.",
    "Red flags: vague scope, rush without premium, disrespect for process.",
    "A polite no today beats a painful yes tomorrow.",
  ],
  "set-boundaries-before-the-project-starts": [
    "Define scope, revisions, and communication norms in the proposal — not mid-project.",
    '"Small changes" compound into unpaid work without written boundaries.',
    "Clients respect clarity; vague scope is where margins die.",
  ],
  "from-hired-hand-to-trusted-partner": [
    "Trusted partners advise — they do not only execute tickets.",
    "Proactive updates and strategic input shift the relationship.",
    "Salt helps you show up prepared so you earn that trust faster.",
  ],
  "proactive-ai-examples-business": [
    "Proactive AI appears in logistics, healthcare scheduling, and finance monitoring.",
    "Solo operators can adopt the same push patterns at smaller scale.",
    "Examples show observation + exception surfacing, not generic chat.",
  ],
  "best-ai-tools-small-business": [
    "Match the tool to the job — operations, content, meetings, and knowledge differ.",
    "Reactive chat tools and proactive ops tools solve different problems.",
    "Salt targets proactive operations for solo service businesses.",
  ],
  "what-can-proactive-ai-do": [
    "Proactive AI can monitor invoices, client comms, schedules, and contracts.",
    "It prepares drafts and flags gaps — you approve outcomes.",
    "Value is cross-tool context, not single-app automation.",
  ],
  "future-of-proactive-ai-trends": [
    "Agent-to-agent and autonomous procurement are emerging B2B trends.",
    "Independent professionals should prepare with clear approval boundaries.",
    "Push-based ops will become baseline — reactive-only stacks will feel dated.",
  ],
  "proactive-ai-vs-chatbot": [
    "Chatbots answer when asked; proactive AI watches and surfaces.",
    "Operations need push — missed follow-ups are a pull-model failure.",
    "Use chat for creativity; use proactive AI for running the business.",
  ],
};

function extractArticleBlocks(source: string): ArticleMeta[] {
  const articles: ArticleMeta[] = [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = slugRegex.exec(source)) !== null) {
    const slug = match[1];
    const start = match.index;
    const nextSlug = source.indexOf('slug: "', start + 10);
    const block = source.slice(start, nextSlug === -1 ? undefined : nextSlug);

    if (COMPARE_SLUGS.has(slug) || RETIRED.has(slug)) continue;

    const title = block.match(/title:\s*\n?\s*"([^"]+)"/)?.[1];
    const descriptionRaw = block.match(
      /description:\s*\n?\s*([\s\S]*?),\s*\n\s*categories:/
    )?.[1];
    const description = descriptionRaw
      ?.replace(/^"/, "")
      .replace(/"$/, "")
      .replace(/\\"/g, '"')
      .trim();
    const publishedAt = block.match(/publishedAt:\s*"([^"]+)"/)?.[1];
    const categoryLegacy = block.match(
      /category\.slug === categorySlugs\.(\w+)/
    )?.[1];
    const authorSlug = block.match(/author\.slug === authorSlugs\.(\w+)/)?.[1];

    if (!title || !description || !publishedAt) continue;

    const legacyMap: Record<string, string> = {
      feature: "feature",
      tutorial: "tutorial",
      business: "business",
      proactiveAi: "proactive-ai",
    };

    articles.push({
      slug,
      title,
      description,
      publishedAt,
      categoryLegacy: legacyMap[categoryLegacy ?? "business"] ?? "business",
      authorSlug: authorSlug === "matt" ? "matt" : "marc",
    });
  }

  return articles;
}

function decodeHtmlEntities(text: string): string {
  const withoutAmp = text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return withoutAmp.replace(/&amp;/g, "&");
}

function stripHtmlTags(html: string): string {
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  return withoutScripts.replace(/<[^>]*>/g, "");
}

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function inlineJsxToMarkdown(inner: string): string {
  const linked = inner
    .replace(/<strong>([^<]+)<\/strong>/g, "**$1**")
    .replace(
      /<a href="([^"]+)"[^>]*className="[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
      "[$2]($1)",
    )
    .replace(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, "[$2]($1)");
  return decodeHtmlEntities(stripHtmlTags(linked).trim());
}

function extractSectionMarkdown(sectionHtml: string): string {
  const lines: string[] = [];
  const tokenRegex =
    /<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>|<p className=\{styles\.p\}>([\s\S]*?)<\/p>|<ul className=\{styles\.ul\}>([\s\S]*?)<\/ul>/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(sectionHtml)) !== null) {
    if (match[1] !== undefined) {
      const text = inlineJsxToMarkdown(match[1]);
      if (text) lines.push(`## ${text}`);
      continue;
    }

    if (match[2] !== undefined) {
      const text = inlineJsxToMarkdown(match[2]);
      if (text) lines.push(`### ${text}`);
      continue;
    }

    if (match[3] !== undefined) {
      const text = inlineJsxToMarkdown(match[3]);
      if (text) lines.push(text);
      continue;
    }

    if (match[4] !== undefined) {
      const listHtml = match[4];
      const itemRegex = /<li className=\{styles\.li\}>([\s\S]*?)<\/li>/g;
      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = itemRegex.exec(listHtml)) !== null) {
        const text = inlineJsxToMarkdown(itemMatch[1]);
        if (text) lines.push(`- ${text}`);
      }
    }
  }

  return lines.join("\n\n");
}

function extractBodyText(block: string): string {
  const sections: string[] = [];
  const sectionRegex = /<section>([\s\S]*?)<\/section>/g;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(block)) !== null) {
    const sectionMd = extractSectionMarkdown(match[1]);
    if (sectionMd.trim()) sections.push(sectionMd.trim());
  }

  return sections.join("\n\n");
}

function main() {
  const source = readFileSync(CONTENT_PATH, "utf8");
  const metas = extractArticleBlocks(source);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const meta of metas) {
    const slugStart = source.indexOf(`slug: "${meta.slug}"`);
    const nextSlug = source.indexOf('slug: "', slugStart + 10);
    const block = source.slice(slugStart, nextSlug === -1 ? undefined : nextSlug);
    const body = extractBodyText(block);
    const takeaways = KEY_TAKEAWAYS[meta.slug] ?? [
      meta.description,
      `Written for independent professionals running a solo service business.`,
      `Published on the Salt blog at usesalt.io/blog/${meta.slug}.`,
    ];

    const frontMatter = [
      "---",
      `slug: ${meta.slug}`,
      `title: "${escapeYamlDoubleQuoted(meta.title)}"`,
      `category: ${meta.categoryLegacy}`,
      `author: ${meta.authorSlug}`,
      `publishedAt: ${meta.publishedAt}`,
      "keyTakeaways:",
      ...takeaways.map((t) => `  - "${escapeYamlDoubleQuoted(t)}"`),
      "---",
      "",
    ].join("\n");

    const md = `${frontMatter}${body || meta.description}\n`;
    const outPath = join(OUTPUT_DIR, `${meta.slug}.md`);
    writeFileSync(outPath, md, "utf8");
    console.log(`✓ ${meta.slug}.md (${body.length} chars body)`);
  }

  console.log(`\nWrote ${metas.length} files to content/migrate/blog/`);
}

main();
