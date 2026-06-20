import type { PortableTextBlock } from "@/app/_lib/sanity/types";

export type YoutubeEmbed = {
  url: string;
  videoId: string;
  name?: string;
};

function youtubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match?.[1] ?? null;
}

export function extractYoutubeEmbeds(
  blocks: Array<{ _type?: string; url?: string; caption?: string }> | undefined
): YoutubeEmbed[] {
  if (!blocks?.length) return [];

  const embeds: YoutubeEmbed[] = [];

  for (const block of blocks) {
    if (block._type !== "youtube" || !block.url) continue;
    const videoId = youtubeVideoId(block.url);
    if (!videoId) continue;
    embeds.push({
      url: block.url,
      videoId,
      name: block.caption,
    });
  }

  return embeds;
}

export function extractYoutubeEmbedsFromPortableText(
  blocks: PortableTextBlock[] | undefined
): YoutubeEmbed[] {
  return extractYoutubeEmbeds(blocks as Array<{ _type?: string; url?: string; caption?: string }>);
}
