import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { decodeHtmlEntities } from "@/app/_features/marketing/blog/blog-display-text";
import { slugifyHeading } from "@/app/_features/marketing/blog/blog-article-toc";
import { urlFor } from "./image";
import type { PortableTextBlock, SanityImage } from "./types";

type PortableTextYoutube = {
  _type: "youtube";
  _key?: string;
  url: string;
  caption?: string;
};

type PortableTextImage = SanityImage & {
  _key?: string;
  caption?: string;
};

type PortableTextValue = PortableTextBlock | PortableTextImage | PortableTextYoutube;

type PortableTextProseProps = {
  value: PortableTextValue[];
  className?: string;
};

function youtubeEmbedId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match?.[1] ?? null;
}

function renderMarks(
  text: string,
  marks: string[] | undefined,
  markDefs: PortableTextBlock["markDefs"]
): ReactNode {
  if (!marks?.length) return text;

  return marks.reduce<ReactNode>((child, mark) => {
    if (mark === "strong") {
      return <strong>{child}</strong>;
    }
    if (mark === "em") {
      return <em>{child}</em>;
    }

    const def = markDefs?.find((entry) => entry._key === mark);
    const href = typeof def?.href === "string" ? def.href : undefined;

    if (href) {
      if (href.startsWith("/")) {
        return <Link href={href}>{child}</Link>;
      }

      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {child}
        </a>
      );
    }

    return child;
  }, text);
}

function blockPlainText(block: PortableTextBlock): string {
  return decodeHtmlEntities(
    block.children?.map((child) => child.text ?? "").join("") ?? ""
  );
}

function isLabeledParagraph(block: PortableTextBlock): boolean {
  if (block.style !== "normal" || !block.children?.length) return false;

  const first = block.children[0];
  if (!first.text?.trim()) return false;

  const hasStrongLead =
    first.marks?.includes("strong") &&
    (first.text.endsWith(":") || blockPlainText(block).trim().startsWith(`${first.text}`));

  if (!hasStrongLead) return false;

  return block.children.slice(1).some((child) => child.text?.trim());
}

function renderLabeledParagraph(block: PortableTextBlock, index: number): ReactNode {
  return (
    <p key={block._key ?? `labeled-p-${index}`}>
      {renderBlockChildren(block)}
    </p>
  );
}

function renderLabeledListItem(block: PortableTextBlock, index: number): ReactNode {
  return (
    <li key={block._key ?? `labeled-li-${index}`}>
      {renderBlockChildren(block)}
    </li>
  );
}

function renderBlockChildren(block: PortableTextBlock): ReactNode {
  if (!block.children?.length) return null;

  return block.children.map((child, childIndex) => {
    if (!child.text) return null;

    return (
      <Fragment key={child._key ?? `${block._key}-span-${childIndex}`}>
        {renderMarks(
          decodeHtmlEntities(child.text),
          child.marks,
          block.markDefs
        )}
      </Fragment>
    );
  });
}

function renderBlock(block: PortableTextBlock, index: number): ReactNode {
  const text = renderBlockChildren(block);

  if (block.listItem === "bullet") {
    return <li key={block._key ?? `bullet-${index}`}>{text}</li>;
  }

  if (block.listItem === "number") {
    return <li key={block._key ?? `number-${index}`}>{text}</li>;
  }

  switch (block.style) {
    case "h2": {
      const heading = blockPlainText(block);
      return (
        <h2 key={block._key ?? `h2-${index}`} id={slugifyHeading(heading)}>
          {text}
        </h2>
      );
    }
    case "h3": {
      const heading = blockPlainText(block);
      return (
        <h3 key={block._key ?? `h3-${index}`} id={slugifyHeading(heading)}>
          {text}
        </h3>
      );
    }
    case "h4":
      return <h4 key={block._key ?? `h4-${index}`}>{text}</h4>;
    default:
      return <p key={block._key ?? `p-${index}`}>{text}</p>;
  }
}

function renderImage(block: PortableTextImage, index: number): ReactNode {
  const src = urlFor(block).width(1200).url();
  const alt = block.alt ?? block.caption ?? "";

  return (
    <figure key={block._key ?? `image-${index}`}>
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        className="blog-article-prose__image"
      />
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}

function renderYoutube(block: PortableTextYoutube, index: number): ReactNode {
  const videoId = youtubeEmbedId(block.url);
  if (!videoId) return null;

  return (
    <figure key={block._key ?? `youtube-${index}`} className="blog-article-youtube">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={block.caption ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}

function groupBlocks(blocks: PortableTextBlock[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listType: "bullet" | "number" | null = null;
  let labeledBlocks: PortableTextBlock[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const ListTag = listType === "number" ? "ol" : "ul";

    nodes.push(
      <ListTag key={`list-${nodes.length}`}>{listItems}</ListTag>
    );
    listItems = [];
    listType = null;
  };

  const flushLabeled = () => {
    if (labeledBlocks.length === 0) return;

    if (labeledBlocks.length === 1) {
      nodes.push(renderLabeledParagraph(labeledBlocks[0], nodes.length));
    } else {
      nodes.push(
        <ul
          key={`labeled-${nodes.length}`}
          className="blog-article-prose__detail-list"
        >
          {labeledBlocks.map((block, labeledIndex) =>
            renderLabeledListItem(block, labeledIndex)
          )}
        </ul>
      );
    }

    labeledBlocks = [];
  };

  blocks.forEach((block, index) => {
    if (block.listItem) {
      flushLabeled();
      const itemType = block.listItem === "number" ? "number" : "bullet";
      if (listType && listType !== itemType) {
        flushList();
      }
      listType = itemType;
      listItems.push(renderBlock(block, index));
      return;
    }

    if (isLabeledParagraph(block)) {
      flushList();
      labeledBlocks.push(block);
      return;
    }

    flushLabeled();
    flushList();
    nodes.push(renderBlock(block, index));
  });

  flushLabeled();
  flushList();
  return nodes;
}

export function PortableTextProse({ value, className }: PortableTextProseProps) {
  if (!value?.length) return null;

  const nodes: ReactNode[] = [];
  let textBlocks: PortableTextBlock[] = [];

  const flushTextBlocks = () => {
    if (textBlocks.length) {
      nodes.push(...groupBlocks(textBlocks));
      textBlocks = [];
    }
  };

  value.forEach((entry, index) => {
    if (entry._type === "block") {
      textBlocks.push(entry);
      return;
    }

    flushTextBlocks();

    if (entry._type === "image") {
      nodes.push(renderImage(entry as PortableTextImage, index));
      return;
    }

    if (entry._type === "youtube") {
      nodes.push(renderYoutube(entry as PortableTextYoutube, index));
    }
  });

  flushTextBlocks();

  return <div className={className}>{nodes}</div>;
}
