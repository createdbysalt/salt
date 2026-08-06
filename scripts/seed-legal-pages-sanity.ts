/**
 * Seed legal pages in Sanity (Dynamic Content → Legal Pages).
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-legal-pages
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareLegalMarkdown } from "../app/_lib/legal/prepare-legal-markdown";
import { legalMarkdownToBlocks } from "./lib/legal-markdown-to-blocks";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const LEGAL_DIR = join(process.cwd(), "brand-identity/legal");

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
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-legal-pages"
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

type LegalPageSeed = {
  _id: string;
  markdownSlug: string;
  routeSlug: string;
  fallbackTitle: string;
  seo: {
    title: string;
    description: string;
  };
};

const LEGAL_PAGES: LegalPageSeed[] = [
  {
    _id: "legal-privacy-policy",
    markdownSlug: "privacy-policy",
    routeSlug: "privacy-policy",
    fallbackTitle: "Privacy Policy",
    seo: {
      title: "Privacy Policy | Salt",
      description:
        "How Simcoe House Inc. collects, uses, and protects your information across Salt.",
    },
  },
  {
    _id: "legal-terms-of-service",
    markdownSlug: "website-terms-of-use",
    routeSlug: "terms-of-service",
    fallbackTitle: "Terms of Service",
    seo: {
      title: "Terms of Service | Salt",
      description:
        "Terms governing your use of usesalt.io, including the website and application.",
    },
  },
  {
    _id: "legal-cookie-policy",
    markdownSlug: "cookie-policy",
    routeSlug: "cookie-policy",
    fallbackTitle: "Cookie Policy",
    seo: {
      title: "Cookie Policy | Salt",
      description:
        "How Salt uses cookies and similar technologies, and how to manage your preferences.",
    },
  },
  {
    _id: "legal-early-access",
    markdownSlug: "early-access-terms",
    routeSlug: "early-access",
    fallbackTitle: "Early Access Terms",
    seo: {
      title: "Early Access Terms | Salt",
      description:
        "Terms for Salt waitlist members and invited early-access users before general availability.",
    },
  },
  {
    _id: "legal-service-terms",
    markdownSlug: "service-terms",
    routeSlug: "tos",
    fallbackTitle: "Service Terms",
    seo: {
      title: "Service Terms | Salt",
      description:
        "Terms governing your use of the Salt application at app.usesalt.io.",
    },
  },
];

function parseLastUpdated(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

async function seedLegalPage(entry: LegalPageSeed) {
  const markdown = readFileSync(
    join(LEGAL_DIR, `${entry.markdownSlug}.md`),
    "utf8"
  );
  const prepared = prepareLegalMarkdown(markdown, entry.fallbackTitle);
  const body = legalMarkdownToBlocks(prepared.body);

  await client.createOrReplace({
    _id: entry._id,
    _type: "legalPage",
    language: "en",
    title: prepared.title,
    slug: { _type: "slug", current: entry.routeSlug },
    lastUpdated: parseLastUpdated(prepared.lastUpdated),
    body,
    seo: {
      _type: "seo",
      title: entry.seo.title,
      description: entry.seo.description,
    },
  });

  console.log(`✓ /${entry.routeSlug}`);
}

async function main() {
  for (const entry of LEGAL_PAGES) {
    await seedLegalPage(entry);
  }
  console.log(`\nSeeded ${LEGAL_PAGES.length} legal pages in ${DATASET}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
