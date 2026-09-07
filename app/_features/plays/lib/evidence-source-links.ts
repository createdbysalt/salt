/**
 * Deep links for "How Salt knew" — Memory records and the external
 * invoice/thread Salt actually read. Existing plays often persisted
 * evidence without a url; we attach one at display time from the run.
 */

import { collectPayLinksFromSources } from "./draft-payment-link";
import type { PlayEvidenceItem } from "./play-headline";

export type EvidenceSourceLink = {
  href: string;
  label: string;
  external: boolean;
};

export type EvidenceLinkContext = {
  targetType?: string | null;
  targetId?: string | null;
  invoiceContext?: unknown;
  verifyText?: unknown;
  artifacts?: Array<{ appId?: string; url?: string | null; label?: string }> | null;
  sourceUrl?: string | null;
  extraUrls?: readonly string[] | null;
};

const MEMORY_PATH: Record<string, string> = {
  billing: "/billing",
  person: "/people",
  organization: "/orgs",
  work: "/work",
  meeting: "/meetings",
};

export function memoryRecordHref(
  targetType?: string | null,
  targetId?: string | null
): string | null {
  if (!targetId) return null;
  const base = MEMORY_PATH[targetType ?? ""];
  return base ? `${base}/${targetId}` : null;
}

export function memoryRecordLinkLabel(targetType?: string | null): string {
  switch (targetType) {
    case "billing":
      return "Invoice in Memory";
    case "person":
      return "Person in Memory";
    case "organization":
      return "Organization in Memory";
    case "work":
      return "Work in Memory";
    case "meeting":
      return "Meeting in Memory";
    default:
      return "Open in Memory";
  }
}

/** Hostname check, not substring — a query string must not fake the host. */
function isStripeDashboardUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "dashboard.stripe.com";
  } catch {
    return false;
  }
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function artifactUrl(
  artifacts: EvidenceLinkContext["artifacts"],
  appId: string
): string | null {
  if (!artifacts) return null;
  for (const item of artifacts) {
    if (item.appId === appId && typeof item.url === "string" && item.url) {
      return item.url;
    }
  }
  return null;
}

function pushLink(
  links: EvidenceSourceLink[],
  href: string | null,
  label: string
) {
  if (!href) return;
  if (links.some((link) => link.href === href)) return;
  links.push({ href, label, external: isExternalHref(href) });
}

export function collectEvidenceLinkContext(
  ctx: EvidenceLinkContext
): {
  memoryHref: string | null;
  payUrl: string | null;
  stripeUrl: string | null;
  gmailUrl: string | null;
  quickbooksUrl: string | null;
} {
  const payLinks = collectPayLinksFromSources({
    invoiceContext: ctx.invoiceContext,
    artifacts: ctx.artifacts,
    verifyText: ctx.verifyText,
    extraUrls: [
      ...(ctx.sourceUrl ? [ctx.sourceUrl] : []),
      ...(ctx.extraUrls ?? []),
    ],
  });
  const payUrl = payLinks[0]?.url ?? null;
  const stripeArtifact = artifactUrl(ctx.artifacts, "stripe");
  const stripeUrl =
    payUrl ??
    (stripeArtifact && !isStripeDashboardUrl(stripeArtifact)
      ? stripeArtifact
      : payUrl);
  return {
    memoryHref: memoryRecordHref(ctx.targetType, ctx.targetId),
    payUrl,
    stripeUrl,
    gmailUrl: artifactUrl(ctx.artifacts, "google"),
    quickbooksUrl: artifactUrl(ctx.artifacts, "quickbooks"),
  };
}

/**
 * Attach Memory / Stripe / inbox links to evidence rows that shipped
 * without them. Leaves an existing url in place and adds extras.
 */
export function attachEvidenceSourceLinks(
  items: PlayEvidenceItem[],
  ctx: EvidenceLinkContext
): PlayEvidenceItem[] {
  const found = collectEvidenceLinkContext(ctx);
  return items.map((item) => {
    const links: EvidenceSourceLink[] = [];
    if (item.url) {
      pushLink(
        links,
        item.url,
        item.appLabel?.trim() || (isExternalHref(item.url) ? "View source" : memoryRecordLinkLabel(ctx.targetType))
      );
    }

    const label = item.label.toLowerCase();
    const researched = label.includes("researched") || label.includes("checked");
    const wantsMemory =
      label.includes("memory") ||
      label.includes("classified") ||
      label.includes("due date") ||
      (label.includes("billing") && !researched);
    const wantsStripe =
      item.appId === "stripe" ||
      label.includes("stripe") ||
      label.includes("invoice") ||
      label.includes("unpaid");
    const wantsGmail = item.appId === "google" || label.includes("gmail");
    const wantsQuickbooks =
      item.appId === "quickbooks" || label.includes("quickbooks");

    if (wantsMemory) {
      pushLink(links, found.memoryHref, memoryRecordLinkLabel(ctx.targetType));
    }
    if (wantsStripe) {
      pushLink(links, found.stripeUrl ?? found.payUrl, "Stripe invoice");
    }
    if (wantsGmail) {
      pushLink(links, found.gmailUrl, "Gmail");
    }
    if (wantsQuickbooks) {
      pushLink(links, found.quickbooksUrl, "QuickBooks");
    }
    if (
      links.length === 0 &&
      found.memoryHref &&
      (wantsStripe || wantsGmail || wantsQuickbooks)
    ) {
      pushLink(links, found.memoryHref, memoryRecordLinkLabel(ctx.targetType));
    }

    if (links.length === 0) return item;

    const stripeHref = found.stripeUrl ?? found.payUrl;
    const preferStripe =
      !item.url &&
      researched &&
      Boolean(stripeHref) &&
      wantsStripe;
    const primaryHref = preferStripe
      ? stripeHref
      : (item.url ?? links[0]!.href);
    const ordered = preferStripe
      ? [
          links.find((link) => link.href === stripeHref) ?? links[0]!,
          ...links.filter((link) => link.href !== stripeHref),
        ]
      : links;

    return {
      ...item,
      url: primaryHref,
      appLabel: item.appLabel ?? ordered[0]!.label,
      links: ordered,
    };
  });
}
