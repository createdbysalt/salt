import {
  buildBrandfetchLogoCandidates,
  COMPARE_LOGO_TYPE_PRIORITY,
  type BrandfetchLogoPreset,
  type BrandfetchLogoType,
} from "./compare-logo-url";

export type CompareCompetitor = {
  slug: string;
  name: string;
  domain: string | null;
  /** Domains to try for Brandfetch logos (first match wins). */
  logoDomains?: string[];
  /** Preferred logo types, in order, when resolving Brandfetch assets. */
  logoTypes?: BrandfetchLogoType[];
  /** Path under /public after sync script runs */
  localLogo: string | null;
};

/** Salt + competitors referenced on comparison pages. Logos synced via scripts/sync-compare-competitor-logos.ts */
export const COMPARE_COMPETITORS: CompareCompetitor[] = [
  {
    slug: "salt",
    name: "Salt",
    domain: "usesalt.io",
    localLogo: "/compare/logos/salt.svg",
  },
  {
    slug: "lindy",
    name: "Lindy",
    domain: "lindy.ai",
    localLogo: "/compare/logos/lindy.png",
  },
  {
    slug: "viktor",
    name: "Viktor",
    domain: "viktor.com",
    logoDomains: ["viktor.com", "getviktor.com"],
    localLogo: "/compare/logos/viktor.svg",
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    domain: "openai.com",
    localLogo: "/compare/logos/chatgpt.svg",
  },
  {
    slug: "zapier",
    name: "Zapier",
    domain: "zapier.com",
    localLogo: "/compare/logos/zapier.svg",
  },
  {
    slug: "make",
    name: "Make",
    domain: "make.com",
    localLogo: "/compare/logos/make.svg",
  },
  {
    slug: "honeybook",
    name: "HoneyBook",
    domain: "honeybook.com",
    localLogo: "/compare/logos/honeybook.png",
  },
  {
    slug: "dubsado",
    name: "Dubsado",
    domain: "dubsado.com",
    localLogo: "/compare/logos/dubsado.png",
  },
  {
    slug: "17hats",
    name: "17hats",
    domain: "17hats.com",
    localLogo: "/compare/logos/17hats.png",
  },
];

const bySlug = new Map(COMPARE_COMPETITORS.map((c) => [c.slug, c]));

export function getCompareCompetitor(slug: string): CompareCompetitor | undefined {
  return bySlug.get(slug);
}

const DEFAULT_LOGO_TYPES: BrandfetchLogoType[] = COMPARE_LOGO_TYPE_PRIORITY;

export function getCompareCompetitorLogoDomains(
  competitor: CompareCompetitor
): string[] {
  if (competitor.logoDomains?.length) {
    return competitor.logoDomains;
  }
  return competitor.domain ? [competitor.domain] : [];
}

export function getCompareCompetitorLogoTypes(
  competitor: CompareCompetitor
): BrandfetchLogoType[] {
  return competitor.logoTypes ?? DEFAULT_LOGO_TYPES;
}

/** Local synced asset first, then Brandfetch CDN fallbacks (icon → symbol → logo). */
export function getCompareCompetitorLogoCandidates(
  competitor: CompareCompetitor,
  preset: BrandfetchLogoPreset = "hub-mark"
): string[] {
  const remote = buildBrandfetchLogoCandidates(
    getCompareCompetitorLogoDomains(competitor),
    preset,
    getCompareCompetitorLogoTypes(competitor)
  );

  if (competitor.localLogo) {
    return [competitor.localLogo, ...remote];
  }

  return remote;
}

/** Maps compare article slug → primary competitor (guides return undefined). */
export const COMPARE_ARTICLE_COMPETITOR: Partial<Record<string, string>> = {
  "salt-vs-lindy": "lindy",
  "salt-vs-viktor": "viktor",
  "salt-vs-chatgpt": "chatgpt",
};
