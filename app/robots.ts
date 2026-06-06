import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://usesalt.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/table",
          "/table/*",
          "/api",
          "/api/*",
          "/signin",
          "/signin/*",
          "/sandbox",
          "/sandbox/*",
          "/intake/*",
          "/proposal/*",
        ],
      },
      // Specific rules for AI crawlers (AEO)
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Claude-Web", "Anthropic-AI", "PerplexityBot", "Google-Extended"],
        allow: [
          "/llms.txt",
          "/llm-info",
          "/",
          "/learn",
          "/learn/*",
          "/features",
          "/pricing",
          "/about",
          "/waitlist",
        ],
        disallow: ["/dashboard", "/table", "/api", "/studio", "/_next"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
