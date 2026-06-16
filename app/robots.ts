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
          "/learn",
          "/learn/*",
          "/dev-login",
          "/dev-login/*",
          "/email-preview",
          "/email-preview/*",
          "/pricing",
          "/book",
          "/book/*",
          "/intake",
          "/intake/*",
          "/proposal",
          "/proposal/*",
          "/proposal-preview",
          "/proposal-preview/*",
          "/careers",
          "/careers/*",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Claude-Web",
          "Anthropic-AI",
          "PerplexityBot",
          "Google-Extended",
        ],
        allow: ["/llms.txt", "/llm-info", "/", "/compare", "/compare/*", "/waitlist"],
        disallow: [
          "/dashboard",
          "/table",
          "/api",
          "/studio",
          "/_next",
          "/learn",
          "/learn/*",
          "/pricing",
          "/dev-login",
          "/email-preview",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
