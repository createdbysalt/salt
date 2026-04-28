module.exports = {
  siteUrl: process.env.SITE_URL || "https://usesalt.io",
  // Disabled - we use app/robots.ts instead for more control over AI crawlers
  generateRobotsTxt: false,
  // Exclude routes from the sitemap
  exclude: [
    "/twitter-image.*",
    "/opengraph-image.*",
    "/icon.*",
    "/dashboard/*",
    "/bridge/*",
    "/api/*",
    "/sandbox/*",
  ],
};
