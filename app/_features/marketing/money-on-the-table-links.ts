import type { SanityLink } from "@/app/_lib/sanity/types";

export const MONEY_ON_THE_TABLE_FOOTER_LABEL = "Money On The Table Quiz";
export const MONEY_ON_THE_TABLE_SECONDARY_CTA = "Take the 2-minute quiz";

export function normalizeMoneyOnTheTableLink(link: SanityLink): SanityLink {
  const href = link.href?.trim() ?? "";
  if (!href.includes("/money-on-the-table")) return link;

  if (href === "/money-on-the-table") {
    return { ...link, text: MONEY_ON_THE_TABLE_FOOTER_LABEL };
  }

  const text = link.text?.trim() ?? "";
  if (/\btest\b/i.test(text)) {
    return {
      ...link,
      text: text.replace(/\btest\b/gi, (match) =>
        match === "Test" ? "Quiz" : "quiz"
      ),
    };
  }

  return link;
}
