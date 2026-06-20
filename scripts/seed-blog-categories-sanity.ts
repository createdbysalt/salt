/**
 * Seed blog category landing pages in Sanity (Features, Tutorials, Business).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-blog-categories
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";

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
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-blog-categories"
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

type CategorySeed = {
  _id: string;
  title: string;
  titleShort: string;
  slug: string;
  description: string;
  legacyArticleSlug: string;
  sortOrder: number;
};

const CATEGORIES: CategorySeed[] = [
  {
    _id: "category-features",
    title: "New Features",
    titleShort: "Features",
    slug: "features",
    description:
      "Latest features added to Salt — what we shipped and why it matters for your practice.",
    legacyArticleSlug: "feature",
    sortOrder: 0,
  },
  {
    _id: "category-tutorials",
    title: "How Tos & Tutorials",
    titleShort: "Tutorials",
    slug: "tutorials",
    description:
      "Step-by-step guides for using Salt — proposals, follow-ups, and workflows that save time.",
    legacyArticleSlug: "tutorial",
    sortOrder: 1,
  },
  {
    _id: "category-business",
    title: "Business",
    titleShort: "Business",
    slug: "business",
    description:
      "Practical advice on running your independent practice — pricing, clients, scope, and growth.",
    legacyArticleSlug: "business",
    sortOrder: 3,
  },
  {
    _id: "category-proactive-ai",
    title: "Proactive AI",
    titleShort: "Proactive AI",
    slug: "proactive-ai",
    description:
      "Guides on proactive AI for independent professionals — what it is, how it works, and how it differs from reactive tools.",
    legacyArticleSlug: "proactive-ai",
    sortOrder: 2,
  },
];

async function seedCategory(entry: CategorySeed) {
  await client.createOrReplace({
    _id: entry._id,
    _type: "category",
    title: entry.title,
    titleShort: entry.titleShort,
    slug: { _type: "slug", current: entry.slug },
    description: entry.description,
    legacyArticleSlug: entry.legacyArticleSlug,
    sortOrder: entry.sortOrder,
    seo: {
      _type: "seo",
      metaTitle: `${entry.titleShort} | Salt Blog`,
      metaDescription: entry.description,
    },
  });
  console.log(`✓ /blog/category/${entry.slug}`);
}

async function main() {
  for (const entry of CATEGORIES) {
    await seedCategory(entry);
  }
  console.log(`\nSeeded ${CATEGORIES.length} blog categories in ${DATASET}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
