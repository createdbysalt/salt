"use client";

import * as React from "react";
import Link from "next/link";
import { PlugZap, X } from "lucide-react";
import type { ReconnectNeeded } from "@/app/_features/connectors/queries";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";

/**
 * Proactive reconnect banner (plan 2026-07-07 WS1). Surfaces connectors whose
 * Composio connection expired so a silently-dead connection — Google's 7-day
 * testing-mode token expiry — never quietly stops Plays. Dismissible per
 * session; reappears on the next load while the connection is still expired.
 */
export function ReconnectBanner({ items }: { items: ReconnectNeeded[] }) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed || items.length === 0) {
    return null;
  }

  const names = items.map((item) => item.name);
  const label =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names[0]} and ${names.length - 1} more`;
  // One connector → deep-link straight to it; several → the connectors list.
  const href =
    items.length === 1
      ? connectorsPageUrl({ connector: items[0].catalogId })
      : connectorsPageUrl();

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <PlugZap className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium">{label}</span>{" "}
        {items.length === 1 ? "needs reconnecting" : "need reconnecting"} — Salt
        paused learning from {items.length === 1 ? "it" : "them"}.
      </p>
      <Link
        href={href}
        className="shrink-0 rounded-full bg-amber-950/10 px-3 py-1 font-medium transition-colors hover:bg-amber-950/20 dark:bg-amber-100/10 dark:hover:bg-amber-100/20"
      >
        Reconnect
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 transition-colors hover:bg-amber-950/10 dark:hover:bg-amber-100/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
