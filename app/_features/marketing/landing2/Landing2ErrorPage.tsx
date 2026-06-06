"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@repo/utils";
import { DotGridCanvas } from "./DotGridCanvas";
import { SALT_LOGO_PATH } from "./constants";
import {
  landing2ColumnClass,
  landing2FrameClass,
  landing2GutterClass,
} from "./landing2-layout";
import "./landing2.css";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Props = {
  error: Error;
  reset: () => void;
};

export function Landing2ErrorPage({ error, reset }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      const referrer = document.referrer;
      if (referrer && referrer.startsWith(window.location.origin)) {
        router.back();
        return;
      }
    }
    router.push("/");
  }

  return (
    <div className="landing2-home">
      <main className="relative isolate min-h-screen bg-background">
        <DotGridCanvas />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40"
          style={{
            background:
              "linear-gradient(to top, var(--background) 20%, transparent 100%)",
          }}
        />

        <div className={cn(landing2GutterClass, "relative z-10 pt-6 sm:pt-8")}>
          <div className={landing2FrameClass}>
            <div className={landing2ColumnClass}>
              <Link
                href="/"
                className="inline-flex items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
                aria-label="Salt home"
              >
                <span
                  aria-hidden
                  className="block h-5 w-12 bg-foreground sm:h-[22px] sm:w-[52px]"
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
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-6 pb-[max(5rem,env(safe-area-inset-bottom))] text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: APPLE_EASE }}
            className="mx-auto flex max-w-md flex-col items-center gap-4"
          >
            <p className="font-display text-[clamp(4.5rem,18vw,7rem)] leading-none tracking-[-0.04em] text-foreground/10">
              Error
            </p>

            <div className="space-y-2">
              <h1 className="font-display text-2xl tracking-[-0.03em] text-foreground sm:text-3xl">
                Something went wrong
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                We hit an unexpected error. Try refreshing the page, or head back to
                where you were.
              </p>
              {process.env.NODE_ENV === "development" && error.message ? (
                <p className="max-w-md truncate font-mono text-xs text-muted-foreground/70">
                  {error.message}
                </p>
              ) : null}
            </div>

            <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <RefreshCw className="size-3.5" strokeWidth={2.25} />
                Try again
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-foreground/85 ring-1 ring-foreground/12 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                Go back
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
