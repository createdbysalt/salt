import config from "@/config";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import type { PortableTextBlock } from "@/app/_lib/sanity/types";
import { decodeHtmlEntities } from "@/app/_features/marketing/blog/blog-display-text";
import { getBlogArticleHref } from "@/app/_features/marketing/blog/blog-paths";

function blockToMarkdown(block: PortableTextBlock): string {
  if (block._type !== "block") return "";

  const text =
    block.children
      ?.map((child) => {
        let segment = decodeHtmlEntities(child.text ?? "");
        if (child.marks?.includes("strong")) segment = `**${segment}**`;
        if (child.marks?.includes("em")) segment = `*${segment}*`;
        return segment;
      })
      .join("") ?? "";

  if (block.listItem) {
    const prefix = block.listItem === "number" ? "1." : "-";
    return `${prefix} ${text}`;
  }

  switch (block.style) {
    case "h2":
      return `## ${text}`;
    case "h3":
      return `### ${text}`;
    case "h4":
      return `#### ${text}`;
    default:
      return text;
  }
}

function portableTextToMarkdown(blocks: PortableTextBlock[]): string {
  const lines: string[] = [];
  let listBuffer: string[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (listBuffer.length) {
      lines.push(...listBuffer);
      listBuffer = [];
      listType = null;
    }
  };

  for (const block of blocks) {
    if (block.listItem) {
      const type = block.listItem === "number" ? "number" : "bullet";
      if (listType && listType !== type) flushList();
      listType = type;
      listBuffer.push(blockToMarkdown(block));
      continue;
    }
    flushList();
    const line = blockToMarkdown(block);
    if (line) lines.push(line, "");
  }

  flushList();
  return lines.join("\n").trim();
}

export function buildBlogArticleMarkdown(article: articleType): string {
  const url = `https://${config.domainName}${getBlogArticleHref(article.slug)}`;
  const category = article.categories[0]?.titleShort ?? article.categories[0]?.title;
  const lines: string[] = [
    `# ${article.title}`,
    "",
    `Source: ${url}`,
    `Published: ${article.publishedAt}`,
    ...(article.updatedAt ? [`Updated: ${article.updatedAt}`] : []),
    `Author: ${article.author.name}`,
    ...(category ? [`Category: ${category}`] : []),
    "",
    "## Summary",
    "",
    article.description,
    "",
  ];

  if (article.keyTakeaways?.length) {
    lines.push("## Key takeaways", "");
    for (const item of article.keyTakeaways) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (article.bodyMarkdown) {
    lines.push("## Full article", "", article.bodyMarkdown, "");
  }

  if (article.faq?.length) {
    lines.push("## Frequently asked questions", "");
    for (const item of article.faq) {
      lines.push(`### ${item.question}`, "", item.answer, "");
    }
  }

  lines.push(
    "---",
    "",
    `Salt — The proactive AI for your business.`,
    `https://${config.domainName}`,
    ""
  );

  return lines.join("\n");
}

export { portableTextToMarkdown };
