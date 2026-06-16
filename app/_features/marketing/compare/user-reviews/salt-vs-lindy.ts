import type { CompareUserReviewsConfig } from "../types";

/** Paraphrased from common G2 reviewer themes — not direct quotes. */
export const saltVsLindyUserReviews: CompareUserReviewsConfig = {
  competitorName: "Lindy",
  g2ReviewsUrl: "https://www.g2.com/products/lindy-lindy/reviews",
  g2ProductUrl: "https://www.g2.com/products/lindy-lindy",
  platformScreenshotsCaption:
    "Screenshots from Lindy's verified G2 product profile (Lindy Media).",
  platformScreenshots: [
    {
      src: "/compare/lindy/platform-home.png",
      alt: "Lindy app home showing a grid of AI agent templates by role",
    },
    {
      src: "/compare/lindy/platform-builder.png",
      alt: "Lindy interface for building a custom AI agent workflow",
    },
  ],
  highlights: [
    {
      title: "Unpredictable credit costs",
      body: "G2 reviewers often cite credit-based pricing as a top complaint. Complex tasks, retries, and errors can burn through credits quickly, which makes the real monthly cost hard to forecast.",
    },
    {
      title: "Complex setup and debugging",
      body: "Reviewers say simple agents are easy to start, but multi-step workflows take time to design, test, and stabilize. When something breaks, debugging can feel like guesswork.",
    },
    {
      title: "You still have to build it",
      body: "Users praise Lindy for what it can automate, but many note the platform assumes you will design every workflow, connect every tool, and tune prompts yourself.",
    },
  ],
};
