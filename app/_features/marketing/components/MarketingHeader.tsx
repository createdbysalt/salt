"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, X, Menu } from "lucide-react";
import { cn } from "@repo/utils";
import { useAnimationTier } from "@/app/_lib/animations/hooks";
import { DURATION, EASE_OUT_QUINT } from "@/app/_lib/animations/easings";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#waitlist", label: "Waitlist" },
] as const;

/**
 * Frosted glass sticky header inspired by Linear/Vercel.
 * rgba(11,11,11,0.8) + backdrop-filter: blur(20px) + 1px bottom border.
 * Reveals on scroll-up, hides on scroll-down (smart header pattern).
 */
export function MarketingHeader() {
  const tier = useAnimationTier();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          scrolled
            ? "border-b border-[rgba(39,37,30,0.08)]"
            : "border-b border-transparent"
        )}
        style={{
          backgroundColor: scrolled
            ? "rgba(250, 249, 247, 0.82)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled
            ? "blur(20px) saturate(180%)"
            : "none",
        }}
      >
        <nav
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-[#27251e] text-[11px] font-semibold text-white">
              S
            </span>
            <span className="text-sm font-semibold tracking-[-0.01em] text-[#27251e]">
              Salt
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-[rgba(39,37,30,0.58)] transition-colors duration-150 hover:bg-[rgba(39,37,30,0.05)] hover:text-[#27251e]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right section */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="#waitlist"
              className="group relative inline-flex items-center gap-1.5 rounded-lg bg-[#27251e] px-4 py-2 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-[#38352b]"
            >
              Join the waitlist
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-[rgba(39,37,30,0.62)] transition-colors hover:bg-[rgba(39,37,30,0.05)] hover:text-[#27251e] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </header>

      {/* Mobile slide-over */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-[#27251e]/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-[rgba(39,37,30,0.08)] bg-[#faf9f7] px-6 py-5"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
              }}
            >
              {/* Close + Logo */}
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-[#27251e] text-[11px] font-semibold text-white">
                    S
                  </span>
                  <span className="text-sm font-semibold tracking-[-0.01em] text-[#27251e]">
                    Salt
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-[rgba(39,37,30,0.62)] transition-colors hover:bg-[rgba(39,37,30,0.05)] hover:text-[#27251e]"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Links */}
              <div className="mt-10 flex flex-col gap-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={
                      tier !== "none"
                        ? { opacity: 0, x: 20 }
                        : undefined
                    }
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.25 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-3 text-[15px] font-medium text-[rgba(39,37,30,0.66)] transition-colors hover:bg-[rgba(39,37,30,0.05)] hover:text-[#27251e]"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-col gap-3 border-t border-[rgba(39,37,30,0.08)] pt-6">
                <Link
                  href="#waitlist"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#27251e] px-5 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#38352b]"
                >
                  Join the waitlist
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}