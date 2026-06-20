/**
 * Seed all marketing blog articles from content/migrate/blog/*.md into Sanity.
 *
 * Prerequisite: pnpm content:seed-blog-authors && pnpm content:seed-blog-categories
 * Generate markdown: pnpm tsx scripts/extract-learn-article-markdown.ts
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-blog-articles
 */
import { createClient, type SanityClient } from "@sanity/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  markdownToPortableText,
  stripMarkdownFrontMatter,
} from "./lib/markdown-to-portable-text";
import { getRelatedSlugsForArticle } from "../app/_features/marketing/blog/blog-article-related";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const writeToken =
  process.env.SANITY_API_WRITE_TOKEN ||
  (() => {
    try {
      return readFileSync("/tmp/sanity_wt", "utf8").trim();
    } catch {
      return "";
    }
  })();

if (!writeToken) {
  console.error("Missing SANITY_API_WRITE_TOKEN (or /tmp/sanity_wt)");
  console.error(
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-blog-articles"
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const MIGRATE_DIR = join(process.cwd(), "content/migrate/blog");

const CATEGORY_IDS: Record<string, string> = {
  feature: "category-features",
  tutorial: "category-tutorials",
  business: "category-business",
  "proactive-ai": "category-proactive-ai",
};

const AUTHOR_IDS: Record<string, string> = {
  marc: "author-marc",
  matt: "author-matt",
};

type ParsedFrontMatter = {
  slug: string;
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  keyTakeaways: string[];
};

function parseFrontMatter(raw: string): ParsedFrontMatter | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const slug = yaml.match(/^slug:\s*(.+)$/m)?.[1]?.trim();
  const title = yaml.match(/^title:\s*"(.+)"$/m)?.[1];
  const category = yaml.match(/^category:\s*(.+)$/m)?.[1]?.trim();
  const author = yaml.match(/^author:\s*(.+)$/m)?.[1]?.trim();
  const publishedAt = yaml.match(/^publishedAt:\s*(.+)$/m)?.[1]?.trim();

  const takeawaysBlock = yaml.match(/keyTakeaways:\n((?:\s+-\s+.+\n?)+)/);
  const keyTakeaways = takeawaysBlock
    ? takeawaysBlock[1]
        .split("\n")
        .map((line) => line.replace(/^\s+-\s+/, "").replace(/^"|"$/g, ""))
        .filter(Boolean)
    : [];

  if (!slug || !title || !category || !author || !publishedAt) return null;

  if (keyTakeaways.length < 3) {
    throw new Error(
      `${slug}: requires at least 3 keyTakeaways in front matter (found ${keyTakeaways.length})`
    );
  }

  return { slug, title, category, author, publishedAt, keyTakeaways };
}

async function uploadFeaturedImage(
  sanityClient: SanityClient,
  slug: string
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string }; alt: string } | undefined> {
  const imagePath = join(process.cwd(), "public/learn", slug, "header.png");
  try {
    const buffer = readFileSync(imagePath);
    const asset = await sanityClient.assets.upload("image", buffer, {
      filename: `${slug}-header.png`,
      contentType: "image/png",
    });
    return {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
      alt: slug,
    };
  } catch {
    return undefined;
  }
}

async function seedArticle(fileName: string) {
  const raw = readFileSync(join(MIGRATE_DIR, fileName), "utf8");
  const meta = parseFrontMatter(raw);
  if (!meta) {
    console.warn(`⚠ Skipping ${fileName} — invalid front matter`);
    return;
  }

  const categoryId = CATEGORY_IDS[meta.category];
  const authorId = AUTHOR_IDS[meta.author];
  if (!categoryId || !authorId) {
    throw new Error(`${meta.slug}: unknown category or author mapping`);
  }

  const bodyMd = stripMarkdownFrontMatter(raw);
  const body = markdownToPortableText(bodyMd);
  const featuredImage = await uploadFeaturedImage(client, meta.slug);
  const relatedSlugs = getRelatedSlugsForArticle(meta.slug);

  const publishedAt = new Date(`${meta.publishedAt}T12:00:00.000Z`).toISOString();

  await client.createOrReplace({
    _id: `blogPost-${meta.slug}`,
    _type: "blogPost",
    title: meta.title,
    slug: { _type: "slug", current: meta.slug },
    excerpt: bodyMd.split("\n").find((line) => line.trim() && !line.startsWith("#"))?.slice(0, 300) ?? meta.title,
    keyTakeaways: meta.keyTakeaways,
    author: { _type: "reference", _ref: authorId },
    category: { _type: "reference", _ref: categoryId },
    publishedAt,
    articleKind: "article",
    body,
    language: "en",
    ...(featuredImage ? { featuredImage } : {}),
    ...(relatedSlugs.length
      ? {
          relatedPosts: relatedSlugs.map((relatedSlug) => ({
            _type: "reference",
            _ref: `blogPost-${relatedSlug}`,
            _key: relatedSlug,
          })),
        }
      : {}),
    seo: {
      _type: "seo",
      title: `${meta.title} | Salt Blog`,
      description: meta.keyTakeaways[0],
      noIndex: false,
    },
  });

  console.log(`✓ /blog/${meta.slug} (${body.length} blocks)`);
}

async function main() {
  const files = readdirSync(MIGRATE_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files.sort()) {
    await seedArticle(file);
  }
  console.log(`\nSeeded ${files.length} blog articles in ${DATASET}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
