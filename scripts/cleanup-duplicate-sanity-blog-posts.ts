/**
 * Remove orphan duplicate blogPost documents in Sanity (same slug, non-canonical _id).
 *
 * Canonical IDs:
 *   - Marketing articles: blogPost-{slug}
 *   - Compare pages: compare-{slug}
 *
 * Default is dry-run. Pass --apply to delete duplicates.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:cleanup-blog-duplicates
 *   op run --env-file=.env.1password -- pnpm content:cleanup-blog-duplicates -- --apply
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { pickPreferredBlogPost } from "../app/_lib/sanity/blog-dedupe";
import type { BlogPost } from "../app/_lib/sanity/types";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const APPLY = process.argv.includes("--apply");

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
    "Usage: op run --env-file=.env.1password -- pnpm content:cleanup-blog-duplicates"
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

type PostRow = Pick<
  BlogPost,
  | "_id"
  | "_type"
  | "title"
  | "slug"
  | "articleKind"
  | "publishedAt"
  | "updatedAt"
  | "body"
  | "featuredImage"
  | "keyTakeaways"
>;

function canonicalIdForPost(post: PostRow): string | null {
  const slug = post.slug?.current;
  if (!slug) return null;

  if (post.articleKind === "comparison" || post.articleKind === "guide") {
    return `compare-${slug}`;
  }

  return `blogPost-${slug}`;
}

function pickKeeper(posts: PostRow[]): PostRow {
  const slug = posts[0]?.slug?.current;
  if (!slug) return posts[0];

  const canonicalId = canonicalIdForPost(posts[0]);
  const canonical = canonicalId
    ? posts.find((post) => post._id === canonicalId)
    : undefined;
  if (canonical) return canonical;

  return posts.reduce((best, current) =>
    pickPreferredBlogPost(best as BlogPost, current as BlogPost) as PostRow
  );
}

async function main() {
  const posts = await client.fetch<PostRow[]>(
    `*[_type == "blogPost" && defined(slug.current)]{
      _id,
      _type,
      title,
      slug,
      articleKind,
      publishedAt,
      updatedAt,
      "body": body[]{_type},
      featuredImage,
      keyTakeaways
    }`
  );

  const bySlug = new Map<string, PostRow[]>();
  for (const post of posts) {
    const slug = post.slug?.current;
    if (!slug) continue;
    const group = bySlug.get(slug) ?? [];
    group.push(post);
    bySlug.set(slug, group);
  }

  const duplicateGroups = [...bySlug.entries()].filter(([, group]) => group.length > 1);
  if (duplicateGroups.length === 0) {
    console.log("No duplicate slugs found.");
    return;
  }

  const toDelete: PostRow[] = [];

  console.log(`Found ${duplicateGroups.length} slug(s) with duplicates:\n`);

  for (const [slug, group] of duplicateGroups) {
    const keeper = pickKeeper(group);
    const orphans = group.filter((post) => post._id !== keeper._id);
    toDelete.push(...orphans);

    console.log(`• ${slug}`);
    console.log(`  keep: ${keeper._id} — ${keeper.title}`);
    for (const orphan of orphans) {
      console.log(`  delete: ${orphan._id} — ${orphan.title}`);
    }
    console.log("");
  }

  console.log(
    APPLY
      ? `Deleting ${toDelete.length} duplicate document(s)…`
      : `Dry run — ${toDelete.length} duplicate(s) would be deleted. Re-run with --apply to delete.`
  );

  if (!APPLY) return;

  for (const post of toDelete) {
    await client.delete(post._id);
    console.log(`  ✓ deleted ${post._id}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
