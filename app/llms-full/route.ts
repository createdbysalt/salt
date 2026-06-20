import { buildSaltLlmFullContent } from "@/app/_lib/seo/salt-llm-full";

/**
 * Extended llms catalog — full blog article metadata for answer engines.
 */
export async function GET() {
  const content = await buildSaltLlmFullContent();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
