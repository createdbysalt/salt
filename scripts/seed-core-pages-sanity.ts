/**
 * Seed Core Pages hub documents in Sanity (Blog + Compare).
 *
 * Waitlist and Money on the Table use formDefinition — run those seeds separately if missing:
 *   pnpm content:seed-form-waitlist:op
 *   pnpm content:seed-form-calculator:op
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-core-pages
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
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-core-pages"
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

type HubPageSeed = {
  _id: string;
  title: string;
  slug: string;
  pageVariant: "blog-hub" | "compare-hub";
  hubContent: {
    eyebrow: string;
    headline: string;
    subheadline: string;
  };
  seo: {
    title: string;
    description: string;
  };
};

const CORE_HUB_PAGES: HubPageSeed[] = [
  {
    _id: "page-blog",
    title: "Blog hub",
    slug: "blog",
    pageVariant: "blog-hub",
    hubContent: {
      eyebrow: "Salt Blog",
      headline: "Stories, insights, and advice",
      subheadline:
        "Practical advice for independent professionals — pricing, clients, scope, and how proactive AI helps you grow.",
    },
    seo: {
      title: "Salt Blog | Proactive AI for Independent Professionals",
      description:
        "Practical advice for independent professionals — pricing, client qualification, scope management, and how Salt's proactive AI helps you grow.",
    },
  },
  {
    _id: "page-compare",
    title: "Compare hub",
    slug: "compare",
    pageVariant: "compare-hub",
    hubContent: {
      eyebrow: "Compare",
      headline: "Salt vs...",
      subheadline: "Find out how Salt compares to other tools.",
    },
    seo: {
      title: "Compare Salt vs Competitors | Salt",
      description:
        "See how Salt compares to Lindy, Viktor, ChatGPT, hiring a VA, and other approaches. Honest side-by-side guides for independent professionals.",
    },
  },
];

async function seedHubPage(entry: HubPageSeed) {
  await client.createOrReplace({
    _id: entry._id,
    _type: "landingPage",
    language: "en",
    title: entry.title,
    slug: { _type: "slug", current: entry.slug },
    pageVariant: entry.pageVariant,
    hubContent: {
      _type: "hubPageContent",
      ...entry.hubContent,
    },
    seo: {
      _type: "seo",
      title: entry.seo.title,
      description: entry.seo.description,
    },
  });

  const path = entry.pageVariant === "blog-hub" ? "/blog" : "/compare";
  console.log(`✓ ${path}`);
}

async function main() {
  for (const entry of CORE_HUB_PAGES) {
    await seedHubPage(entry);
  }
  console.log(`\nSeeded ${CORE_HUB_PAGES.length} core hub pages in ${DATASET}.`);
  console.log(
    "Core Pages → Waitlist / Money on the Table use formDefinition seeds if not present yet."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
