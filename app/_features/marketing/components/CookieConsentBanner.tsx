"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@repo/utils";

type PreferenceState = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type CookieConsentBannerProps = {
  mode: "initial" | "preferences";
  initialPreferences: PreferenceState;
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onSavePreferences: (prefs: PreferenceState) => void;
  onClose: () => void;
};

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-border/60 sm:min-h-0",
        disabled && "opacity-80"
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-foreground"
        aria-label={label}
      />
    </label>
  );
}

const actionButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full px-3.5 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:min-h-0";

const secondaryButtonClass = cn(
  actionButtonClass,
  "text-foreground/85 ring-1 ring-foreground/12 hover:bg-muted/70"
);

const primaryButtonClass = cn(
  actionButtonClass,
  "bg-foreground font-semibold text-background hover:opacity-90"
);

export function CookieConsentBanner({
  mode,
  initialPreferences,
  onAcceptAll,
  onRejectNonEssential,
  onSavePreferences,
  onClose,
}: CookieConsentBannerProps) {
  const [customizeOpen, setCustomizeOpen] = useState(mode === "preferences");
  const [preferences, setPreferences] = useState(initialPreferences);

  const showCustomize = customizeOpen || mode === "preferences";

  return (
    <div
      className={cn(
        "fixed z-[70] inset-x-1.5",
        "bottom-[max(0.375rem,env(safe-area-inset-bottom))]",
        "sm:inset-x-auto sm:left-auto sm:right-0 sm:w-auto sm:max-w-none sm:bottom-0 sm:p-5",
        showCustomize ? "sm:w-full sm:max-w-[22rem]" : "sm:w-[min(100%,20.5rem)]"
      )}
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div
        className={cn(
          "rounded-2xl border border-foreground/14 bg-card p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.06)] sm:border-foreground/12 sm:shadow-[0_10px_32px_-14px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] sm:p-[1.125rem]",
          showCustomize && "sm:p-5"
        )}
      >
        <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
          Cookies run Salt and, with your permission, measure usage.{" "}
          <Link
            href="/cookie-policy"
            className="font-medium text-foreground/80 underline underline-offset-2 transition hover:text-foreground"
          >
            Cookie Policy
          </Link>
        </p>

        {showCustomize ? (
          <div className="mt-3 space-y-2">
            <PreferenceToggle
              label="Necessary"
              description="Required for security, authentication, and remembering your cookie choice."
              checked
              disabled
            />
            <PreferenceToggle
              label="Functional"
              description="Remembers interface preferences such as theme."
              checked={preferences.functional}
              onChange={(functional) =>
                setPreferences((current) => ({ ...current, functional }))
              }
            />
            <PreferenceToggle
              label="Analytics"
              description="Helps us understand waitlist and site usage with first-party measurement."
              checked={preferences.analytics}
              onChange={(analytics) =>
                setPreferences((current) => ({ ...current, analytics }))
              }
            />
            <PreferenceToggle
              label="Marketing"
              description="Enables third-party chat and future marketing tools."
              checked={preferences.marketing}
              onChange={(marketing) =>
                setPreferences((current) => ({ ...current, marketing }))
              }
            />
          </div>
        ) : null}

        <div
          className={cn(
            "mt-3.5",
            showCustomize
              ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2"
              : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-stretch sm:gap-2"
          )}
        >
          {showCustomize ? (
            <>
              {mode === "preferences" ? (
                <button
                  type="button"
                  onClick={onClose}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(false)}
                  className={secondaryButtonClass}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => onSavePreferences(preferences)}
                className={primaryButtonClass}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onAcceptAll}
                className={cn(primaryButtonClass, "w-full")}
              >
                Accept all
              </button>
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(true)}
                  className={cn(secondaryButtonClass, "w-full sm:min-w-0 sm:flex-1")}
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={onRejectNonEssential}
                  className={cn(secondaryButtonClass, "w-full sm:min-w-0 sm:flex-1")}
                  aria-label="Reject non-essential"
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
