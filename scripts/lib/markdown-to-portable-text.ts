type PortableTextSpan = {
  _type: "span";
  text: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _key: string;
  _type: string;
  href?: string;
};

export type PortableTextBlockOutput = {
  _type: "block";
  _key?: string;
  style: string;
  children: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
  listItem?: string;
  level?: number;
};

function makeBlock(style: string, text: string): PortableTextBlockOutput {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let lastIdx = 0;
  let linkCounter = 0;

  const re =
    /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|`([^`]+)`/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      const plain = text.slice(lastIdx, match.index);
      if (plain) children.push({ _type: "span", text: plain });
    }

    if (match[1]) {
      const linkText = match[1];
      const url = match[2];
      const key = `link-${linkCounter++}`;
      markDefs.push({ _key: key, _type: "link", href: url });
      const boldLink = linkText.match(/^\*\*(.+)\*\*$/);
      if (boldLink) {
        children.push({
          _type: "span",
          text: boldLink[1],
          marks: ["strong", key],
        });
      } else {
        children.push({ _type: "span", text: linkText, marks: [key] });
      }
    } else if (match[3]) {
      children.push({ _type: "span", text: match[3], marks: ["strong"] });
    } else if (match[4]) {
      children.push({ _type: "span", text: match[4], marks: ["em"] });
    } else if (match[5]) {
      children.push({ _type: "span", text: match[5], marks: ["code"] });
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx);
    if (remaining) children.push({ _type: "span", text: remaining });
  }

  if (children.length === 0) {
    children.push({ _type: "span", text });
  }

  return {
    _type: "block",
    style,
    children,
    ...(markDefs.length ? { markDefs } : {}),
  };
}

/**
 * Convert markdown to Sanity portable text blocks.
 * Handles H2, H3, paragraphs, bold, italic, links, bullets, numbered lists.
 * H1 lines are skipped (title lives on the document).
 */
export function markdownToPortableText(md: string): PortableTextBlockOutput[] {
  const lines = md.split("\n");
  const blocks: PortableTextBlockOutput[] = [];
  let inList = false;
  let listType: "bullet" | "number" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      for (const item of listItems) {
        const block = makeBlock("normal", item);
        block.listItem = listType ?? "bullet";
        block.level = 1;
        blocks.push(block);
      }
      inList = false;
      listItems = [];
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (/^---+$/.test(trimmed) && trimmed.length > 2) continue;
    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^#\s+/.test(trimmed)) continue;

    const h2Match = trimmed.match(/^##\s+(.+)/);
    if (h2Match) {
      flushList();
      blocks.push(makeBlock("h2", h2Match[1].trim()));
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)/);
    if (h3Match) {
      flushList();
      blocks.push(makeBlock("h3", h3Match[1].trim()));
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      if (!inList) {
        inList = true;
        listType = "bullet";
        listItems = [];
      }
      listItems.push(bulletMatch[1].trim());
      continue;
    }

    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      if (!inList) {
        inList = true;
        listType = "number";
        listItems = [];
      }
      listItems.push(numMatch[1].trim());
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) continue;

    flushList();
    blocks.push(makeBlock("normal", trimmed));
  }

  flushList();
  return blocks;
}

/**
 * Strip YAML front matter from a markdown file body.
 */
export function stripMarkdownFrontMatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

export type MarkdownFrontMatter = {
  keyTakeaways?: string[];
  faq?: Array<{ question: string; answer: string }>;
  relatedSlugs?: string[];
};

export function parseMarkdownFrontMatter(md: string): MarkdownFrontMatter {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: MarkdownFrontMatter = {};

  const takeawaysBlock = yaml.match(
    /keyTakeaways:\n((?:\s+-\s+.+\n?)+)/
  );
  if (takeawaysBlock) {
    result.keyTakeaways = takeawaysBlock[1]
      .split("\n")
      .map((line) => line.replace(/^\s+-\s+/, "").trim())
      .filter(Boolean);
  }

  return result;
}
