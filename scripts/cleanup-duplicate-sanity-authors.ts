/**
 * Remove orphan duplicate author documents in Sanity and repoint blog posts.
 *
 * Canonical IDs:
 *   - Salt Team: author-marc (slug: marc)
 *   - Matt Martins: author-matt (slug: matt)
 *
 * Default is dry-run. Pass --apply to patch posts and delete duplicates.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:cleanup-author-duplicates
 *   op run --env-file=.env.1password -- pnpm content:cleanup-author-duplicates -- --apply
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import type { Author } from "../app/_lib/sanity/types";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const APPLY = process.argv.includes("--apply");

const CANONICAL_AUTHORS: Record<string, { id: string; slug: string; names: string[] }> =
  {
    marc: {
      id: "author-marc",
      slug: "marc",
      names: ["Salt Team", "Marc"],
    },
    matt: {
      id: "author-matt",
      slug: "matt",
      names: ["Matt Martins"],
    },
  };

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
    "Usage: op run --env-file=.env.1password -- pnpm content:cleanup-author-duplicates"
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

type AuthorRow = Pick<Author, "_id" | "name" | "slug" | "jobTitle" | "bio" | "image">;

function authorScore(author: AuthorRow): number {
  let score = 0;
  if (author._id.startsWith("author-")) score += 100;
  if (author.image?.asset) score += 10;
  if (author.bio?.trim()) score += 2;
  if (author.jobTitle?.trim()) score += 1;
  return score;
}

function resolveCanonicalKey(author: AuthorRow): keyof typeof CANONICAL_AUTHORS | null {
  const slug = author.slug?.current;
  if (slug === "marc" || slug === "matt") return slug;

  const name = author.name?.trim();
  if (!name) return null;

  for (const [key, canonical] of Object.entries(CANONICAL_AUTHORS)) {
    if (canonical.names.some((candidate) => candidate === name)) {
      return key as keyof typeof CANONICAL_AUTHORS;
    }
  }

  return null;
}

function pickKeeper(authors: AuthorRow[]): AuthorRow {
  const canonicalKey = resolveCanonicalKey(authors[0]);
  if (canonicalKey) {
    const canonicalId = CANONICAL_AUTHORS[canonicalKey].id;
    const canonical = authors.find((author) => author._id === canonicalId);
    if (canonical) return canonical;
  }

  return authors.reduce((best, current) =>
    authorScore(best) >= authorScore(current) ? best : current
  );
}

async function main() {
  const authors = await client.fetch<AuthorRow[]>(
    `*[_type == "author"]{
      _id,
      name,
      slug,
      jobTitle,
      bio,
      image
    }`
  );

  const byKey = new Map<string, AuthorRow[]>();

  for (const author of authors) {
    const key =
      author.slug?.current ??
      resolveCanonicalKey(author) ??
      author.name?.trim().toLowerCase();
    if (!key) continue;

    const group = byKey.get(key) ?? [];
    group.push(author);
    byKey.set(key, group);
  }

  // Also group Matt duplicates that used slug "matt-martins" from legacy push script.
  const mattMartinsGroup = authors.filter(
    (author) =>
      author.name === "Matt Martins" ||
      author.slug?.current === "matt" ||
      author.slug?.current === "matt-martins"
  );
  if (mattMartinsGroup.length > 1) {
    byKey.set("matt", mattMartinsGroup);
  }

  const duplicateGroups = [...byKey.entries()].filter(([, group]) => group.length > 1);
  if (duplicateGroups.length === 0) {
    console.log("No duplicate authors found.");
    return;
  }

  const keeperByOrphanId = new Map<string, AuthorRow>();
  const toDelete: AuthorRow[] = [];

  console.log(`Found ${duplicateGroups.length} author group(s) with duplicates:\n`);

  for (const [key, group] of duplicateGroups) {
    const keeper = pickKeeper(group);
    const orphans = group.filter((author) => author._id !== keeper._id);

    console.log(`• ${key}`);
    console.log(
      `  keep: ${keeper._id} — ${keeper.name} (slug: ${keeper.slug?.current ?? "?"})`
    );
    for (const orphan of orphans) {
      console.log(
        `  delete: ${orphan._id} — ${orphan.name} (slug: ${orphan.slug?.current ?? "?"})`
      );
      keeperByOrphanId.set(orphan._id, keeper);
      toDelete.push(orphan);
    }
    console.log("");
  }

  const posts = await client.fetch<
    { _id: string; title: string; authorRef: string | null }[]
  >(
    `*[_type == "blogPost" && defined(author._ref)]{
      _id,
      title,
      "authorRef": author._ref
    }`
  );

  const postsToPatch = posts.filter(
    (post) => post.authorRef && keeperByOrphanId.has(post.authorRef)
  );

  console.log(
    APPLY
      ? `Patching ${postsToPatch.length} blog post(s), deleting ${toDelete.length} author(s)…`
      : `Dry run — would patch ${postsToPatch.length} blog post(s) and delete ${toDelete.length} author(s). Re-run with --apply to apply.`
  );

  if (!APPLY) return;

  for (const post of postsToPatch) {
    const keeper = keeperByOrphanId.get(post.authorRef!);
    if (!keeper) continue;

    await client
      .patch(post._id)
      .set({
        author: { _type: "reference", _ref: keeper._id },
      })
      .commit();
    console.log(`  ✓ repointed ${post._id} → ${keeper._id}`);
  }

  for (const author of toDelete) {
    await client.delete(author._id);
    console.log(`  ✓ deleted ${author._id}`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
