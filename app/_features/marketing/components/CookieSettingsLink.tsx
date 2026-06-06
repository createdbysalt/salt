"use client";

import { cn } from "@repo/utils";
import { useCookieConsent } from "./CookieConsentProvider";

export function CookieSettingsLink({
  className,
}: {
  className?: string;
}) {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className={cn("transition hover:text-foreground", className)}
    >
      Cookie settings
    </button>
  );
}
