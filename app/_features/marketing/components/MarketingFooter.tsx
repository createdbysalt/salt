"use client";

import Link from "next/link";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { CookieSettingsLink } from "./CookieSettingsLink";

const FOOTER_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/terms-of-use", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/cookie-policy", label: "Cookies" },
  { href: "mailto:hello@usesalt.io", label: "Contact", external: true },
];

/**
 * Minimal marketing footer aligned to Salt v2.
 */
export function MarketingFooter() {
  return (
    <footer className="relative border-t border-[rgba(39,37,30,0.08)] py-10">
      <FadeUpBlur>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2.5"
              >
                <span className="flex size-6 items-center justify-center rounded-md bg-[#27251e] text-[10px] font-semibold text-white">
                  S
                </span>
                <span className="text-sm font-semibold tracking-[-0.01em] text-[#27251e]">
                  Salt
                </span>
              </Link>
              <span className="text-[13px] text-[rgba(39,37,30,0.55)]">
                The proactive AI for your business.
              </span>
            </div>

            <div className="flex items-center gap-5">
              {FOOTER_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-[13px] text-[rgba(39,37,30,0.55)] transition-colors duration-150 hover:text-[#27251e]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[13px] text-[rgba(39,37,30,0.55)] transition-colors duration-150 hover:text-[#27251e]"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <CookieSettingsLink className="text-[13px] text-[rgba(39,37,30,0.55)] hover:text-[#27251e]" />
            </div>
          </div>

          <div className="mt-8 text-center text-[12px] text-[rgba(39,37,30,0.42)]">
            &copy; {new Date().getFullYear()} Simcoe House Inc. All rights reserved.
          </div>
        </div>
      </FadeUpBlur>
    </footer>
  );
}
