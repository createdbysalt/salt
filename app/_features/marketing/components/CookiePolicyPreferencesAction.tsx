"use client";

import { CookieSettingsLink } from "@/app/_features/marketing/components/CookieSettingsLink";

export function CookiePolicyPreferencesAction() {
  return (
    <p className="mt-6 text-sm text-muted-foreground">
      <CookieSettingsLink className="font-medium text-foreground underline underline-offset-[3px] hover:text-flame" />
    </p>
  );
}
