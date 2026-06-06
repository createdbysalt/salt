"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/utils";
import { SALT_LOGO_PATH } from "./constants";
import {
  landing2ColumnClass,
  landing2FrameClass,
  landing2GutterClass,
} from "./landing2-layout";

export function Landing2Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "relative z-50 w-full sm:sticky sm:top-0 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "sm:border-b sm:border-border/60 sm:bg-background/85 sm:backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className={cn(landing2GutterClass, "pb-3 sm:pb-0")}>
        <div className={landing2FrameClass}>
          <div
            className={cn(
              landing2ColumnClass,
              "flex h-14 items-center justify-center sm:h-16 sm:justify-between"
            )}
          >
            <Link
              href="/"
              className="flex shrink-0 items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 sm:mr-0"
              aria-label="Salt"
            >
              <span
                aria-hidden
                className="block h-6 w-[3.25rem] bg-foreground sm:h-[22px] sm:w-[52px]"
                style={{
                  maskImage: `url(${SALT_LOGO_PATH})`,
                  WebkitMaskImage: `url(${SALT_LOGO_PATH})`,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              />
            </Link>

            <Link
              href="/waitlist?source=landing2-nav"
              className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:inline-flex"
            >
              Join the waitlist
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
