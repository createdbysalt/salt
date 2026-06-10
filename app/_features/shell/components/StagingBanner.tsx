"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { isStagingDeployment } from "@/app/_lib/env/deployment";
import { Button } from "@/app/_components/ui/button";

const DISMISS_STORAGE_KEY = "salt:staging-banner-dismissed";

/**
 * Visible on hosted staging so the team never confuses environments.
 * Dismissible per browser — stays hidden until local storage is cleared.
 */
export function StagingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStagingDeployment()) return;
    if (localStorage.getItem(DISMISS_STORAGE_KEY) === "1") return;
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="relative border-b border-amber-500/30 bg-amber-500/10 px-10 py-2 text-center text-sm font-medium text-amber-950 dark:text-amber-100"
    >
      Staging environment — not production. Data and billing are test-only.
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 size-7 -translate-y-1/2 text-amber-950/70 hover:bg-amber-500/20 hover:text-amber-950 dark:text-amber-100/70 dark:hover:text-amber-100"
        onClick={dismiss}
        aria-label="Dismiss staging environment notice"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
