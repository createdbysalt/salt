import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type BlogArticleManifestEntry = {
  slug: string;
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  keyTakeaways: string[];
};

function parseManifestFromMd(filePath: string): BlogArticleManifestEntry {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`Invalid front matter: ${filePath}`);

  const yaml = match[1];
  const slug = yaml.match(/^slug:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const title = yaml.match(/^title:\s*"(.+)"$/m)?.[1] ?? "";
  const category = yaml.match(/^category:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const author = yaml.match(/^author:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const publishedAt = yaml.match(/^publishedAt:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const takeawaysBlock = yaml.match(/keyTakeaways:\n((?:\s+-\s+.+\n?)+)/);
  const keyTakeaways = takeawaysBlock
    ? takeawaysBlock[1]
        .split("\n")
        .map((line) => line.replace(/^\s+-\s+/, "").replace(/^"|"$/g, ""))
        .filter(Boolean)
    : [];

  return { slug, title, category, author, publishedAt, keyTakeaways };
}

const MIGRATE_DIR = join(process.cwd(), "content/migrate/blog");

export const BLOG_ARTICLE_MANIFEST: BlogArticleManifestEntry[] = readdirSync(
  MIGRATE_DIR
)
  .filter((f) => f.endsWith(".md"))
  .map((f) => parseManifestFromMd(join(MIGRATE_DIR, f)))
  .sort((a, b) => a.slug.localeCompare(b.slug));
