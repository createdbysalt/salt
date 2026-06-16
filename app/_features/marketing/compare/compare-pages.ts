import type { StaticImageData } from "next/image";
import saltAlternativesImg from "@/public/learn/salt-alternatives/header.png";
import saltVsChatgptImg from "@/public/learn/salt-vs-chatgpt/header.png";
import saltVsHiringAVaImg from "@/public/learn/salt-vs-hiring-a-va/header.png";
import saltVsLindyImg from "@/public/learn/salt-vs-lindy/header.png";
import saltVsViktorImg from "@/public/learn/salt-vs-viktor/header.png";
import { COMPARE_ARTICLE_COMPETITOR } from "./compare-competitors";

export type CompareHubEntry = {
  slug: string;
  label: string;
  description: string;
  /** Legacy header art — optional when hub is Sanity-driven */
  image?: StaticImageData;
  imageAlt?: string;
  kind: "versus" | "guide";
  /** Primary competitor for logo pair on hub cards */
  competitorSlug?: string;
};

export const COMPARE_HUB_ENTRIES: CompareHubEntry[] = [
  {
    slug: "salt-vs-lindy",
    label: "Lindy",
    description: "Building agents vs getting the work done.",
    image: saltVsLindyImg,
    imageAlt: "Salt vs Lindy comparison",
    kind: "versus",
    competitorSlug: COMPARE_ARTICLE_COMPETITOR["salt-vs-lindy"],
  },
  {
    slug: "salt-vs-viktor",
    label: "Viktor",
    description: "AI coworker in chat vs AI that runs the business.",
    image: saltVsViktorImg,
    imageAlt: "Salt vs Viktor comparison",
    kind: "versus",
    competitorSlug: COMPARE_ARTICLE_COMPETITOR["salt-vs-viktor"],
  },
  {
    slug: "salt-vs-chatgpt",
    label: "ChatGPT",
    description: "Reactive answers vs proactive operations.",
    image: saltVsChatgptImg,
    imageAlt: "Salt vs ChatGPT comparison",
    kind: "versus",
    competitorSlug: COMPARE_ARTICLE_COMPETITOR["salt-vs-chatgpt"],
  },
  {
    slug: "salt-vs-hiring-a-va",
    label: "Hiring a VA",
    description: "Human help vs always-on proactive AI.",
    image: saltVsHiringAVaImg,
    imageAlt: "Salt vs hiring a virtual assistant",
    kind: "versus",
  },
  {
    slug: "salt-alternatives",
    label: "All alternatives",
    description: "Honest map of agent builders, CRMs, chat AI, and more.",
    image: saltAlternativesImg,
    imageAlt: "Salt alternatives guide",
    kind: "guide",
  },
];

export function getCompareArticleHref(slug: string): string {
  return `/compare/${slug}`;
}
