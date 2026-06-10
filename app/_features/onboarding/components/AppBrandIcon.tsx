import { cn } from "@repo/utils";
import type { ConnectableApp } from "../data/onboarding-flow-data";

export function AppBrandIcon({
  brand,
  className,
}: {
  brand: ConnectableApp["brand"];
  className?: string;
}) {
  const cls = cn("size-6 shrink-0", className);
  switch (brand) {
    case "gmail":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <path
            fill="#4285F4"
            d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
          />
        </svg>
      );
    case "gcal":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <rect x="2" y="4" width="20" height="18" rx="3" fill="#fff" stroke="#1A73E8" strokeWidth="1.5" />
          <path d="M2 8h20" stroke="#1A73E8" strokeWidth="1.5" />
          <circle cx="12" cy="15" r="3.5" fill="#1A73E8" />
          <text x="12" y="17" textAnchor="middle" fontSize="5" fill="#fff" fontWeight="700">
            31
          </text>
        </svg>
      );
    case "gdrive":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <path fill="#0F9D58" d="M9 3h6l6 10.5-3 5.5H6l-3-5.5z" />
          <path fill="#F4B400" d="M15 3l6 10.5h-9z" />
          <path fill="#4285F4" d="M9 3L3 13.5l3 5.5 6-10.5z" />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <path
            fill="#E01E5A"
            d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
          />
          <path
            fill="#36C5F0"
            d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
          />
          <path
            fill="#2EB67D"
            d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
          />
          <path
            fill="#ECB22E"
            d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
          />
        </svg>
      );
    case "notion":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#fff" stroke="#111" strokeWidth="1.5" />
          <path
            d="M7 7v10M7 7l10 10V7"
            stroke="#111"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "stripe":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <rect width="24" height="24" rx="5" fill="#635BFF" />
          <path
            fill="#fff"
            d="M13.1 9.6c0-.7.6-1 1.6-1 1.4 0 3.1.4 4.5 1.1V5.5c-1.5-.6-3-.9-4.5-.9-3.7 0-6.1 1.9-6.1 5.1 0 5 6.9 4.2 6.9 6.4 0 .8-.7 1.1-1.8 1.1-1.5 0-3.5-.6-5.1-1.5v4.3c1.7.7 3.5 1 5.1 1 3.8 0 6.3-1.8 6.3-5.1 0-5.4-6.9-4.5-6.9-6.3z"
          />
        </svg>
      );
    case "hubspot":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <circle cx="17" cy="14" r="4" fill="none" stroke="#FF7A59" strokeWidth="1.8" />
          <path d="M17 10V5a2 2 0 1 0-1 0v5" stroke="#FF7A59" strokeWidth="1.8" fill="none" />
          <circle cx="6" cy="18" r="1.8" fill="#FF7A59" />
          <path d="M7.4 16.6L14 12" stroke="#FF7A59" strokeWidth="1.6" />
        </svg>
      );
    case "linear":
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden>
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5E6AD2" />
              <stop offset="100%" stopColor="#8A92E3" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="5" fill="url(#lg)" />
          <path
            d="M5 13l6 6M5 9l10 10M7 5l12 12M11 5l8 8M16 5l3 3"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity=".9"
          />
        </svg>
      );
  }
}
