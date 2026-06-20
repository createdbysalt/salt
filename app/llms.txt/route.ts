import { buildSaltLlmInfoContent } from "@/app/_lib/seo/salt-llm-info";

/**
 * Dynamic llms.txt for AI crawlers — same canonical content as /llm-info.
 * @see https://llmstxt.org/
 */
export async function GET() {
  const content = await buildSaltLlmInfoContent();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
