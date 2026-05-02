"use client";

import Link from "next/link";
import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";

const FOOTER_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/tos", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/blog", label: "Blog" },
  { href: "mailto:hello@usesalt.io", label: "Contact", external: true },
];

/**
 * Minimal marketing footer. Clean, single-row layout on desktop.
 * Matches the overall dark theme with subtle divider.
 */
export function MarketingFooter() {
  return (
    <footer className="relative py-10">
      {/* Subtle top divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 50%, transparent)",
        }}
        aria-hidden="true"
      />

      <FadeUpBlur>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            {/* Left: Logo + tagline */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/salt-icon-white.svg"
                  alt=""
                  className="h-5 w-5"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/salt-logo-white.svg"
                  alt="SALT"
                  className="h-4 w-auto"
                />
              </Link>
              <span className="text-[13px] text-[rgb(100,105,114)]">
                The strategic intelligence system.
              </span>
            </div>

            {/* Right: Links */}
            <div className="flex items-center gap-5">
              {FOOTER_LINKS.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-[13px] text-[rgb(100,105,114)] transition-colors duration-150 hover:text-[rgb(138,143,152)]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[13px] text-[rgb(100,105,114)] transition-colors duration-150 hover:text-[rgb(138,143,152)]"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="mt-8 text-center text-[12px] text-[rgb(60,64,72)]">
            &copy; {new Date().getFullYear()} Simcoe House Inc. All rights reserved.
          </div>
        </div>
      </FadeUpBlur>
    </footer>
  );
}
