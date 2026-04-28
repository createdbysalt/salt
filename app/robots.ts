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
          "/bridge",
          "/bridge/*",
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
        userAgent: "GPTBot",
        allow: ["/", "/blog", "/blog/*", "/features", "/pricing", "/about"],
        disallow: ["/dashboard", "/bridge", "/api"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/blog", "/blog/*", "/features", "/pricing", "/about"],
        disallow: ["/dashboard", "/bridge", "/api"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/blog", "/blog/*", "/features", "/pricing", "/about"],
        disallow: ["/dashboard", "/bridge", "/api"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/blog", "/blog/*", "/features", "/pricing", "/about"],
        disallow: ["/dashboard", "/bridge", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
