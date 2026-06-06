import { buildSaltLlmInfoContent } from "@/app/_lib/seo/salt-llm-info";

/**
 * Quo-style LLM reference page for AEO.
 * @see https://www.quo.com/llm-info
 */
export async function GET() {
  const content = buildSaltLlmInfoContent();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
