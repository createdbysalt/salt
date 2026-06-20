import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  markdownToPortableText,
  stripMarkdownFrontMatter,
  type PortableTextBlockOutput,
} from "../../../../scripts/lib/markdown-to-portable-text";
import type { PortableTextBlock } from "@/app/_lib/sanity/types";

const MIGRATE_DIR = join(process.cwd(), "content/migrate/blog");

/**
 * Seeded Sanity bodies grouped all H3s before paragraphs (extract script bug).
 * Detect that pattern so we can substitute the corrected migrate markdown.
 */
export function hasStackedSectionHeadings(
  blocks: PortableTextBlock[] | undefined
): boolean {
  if (!blocks?.length) return false;

  for (let index = 0; index < blocks.length - 2; index += 1) {
    const block = blocks[index];
    if (block.style !== "h2") continue;

    let cursor = index + 1;
    let h3Count = 0;

    while (cursor < blocks.length && blocks[cursor].style === "h3") {
      h3Count += 1;
      cursor += 1;
    }

    if (h3Count >= 2 && cursor < blocks.length && blocks[cursor].style === "normal") {
      return true;
    }
  }

  return false;
}

function loadCorrectedBodyFromMarkdown(slug: string): PortableTextBlockOutput[] | null {
  const path = join(MIGRATE_DIR, `${slug}.md`);
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf8");
    const bodyMd = stripMarkdownFrontMatter(raw);
    return markdownToPortableText(bodyMd);
  } catch {
    return null;
  }
}

/**
 * When migrate markdown has correct section order, use it instead of broken Sanity blocks.
 * Copy is unchanged — only block order is corrected.
 */
export function normalizeBlogArticleBody(
  slug: string,
  blocks: PortableTextBlock[] | undefined
): PortableTextBlock[] | undefined {
  if (!blocks?.length || !hasStackedSectionHeadings(blocks)) {
    return blocks;
  }

  const corrected = loadCorrectedBodyFromMarkdown(slug);
  return corrected?.length ? (corrected as PortableTextBlock[]) : blocks;
}
