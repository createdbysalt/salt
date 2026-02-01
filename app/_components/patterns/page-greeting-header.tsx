"use client";

import { useEffect, useState } from "react";
import {
  type GreetingPageKey,
  type GreetingVariant,
  getPageTitle,
  getTimeBucket,
  getGreetingTitle,
  selectSubtitle,
  getSubtitleStorageKey,
} from "@/app/_features/shell/greetings/greetings";

type PageGreetingHeaderMode = "greeting" | "title";

interface PageGreetingHeaderProps {
  page: GreetingPageKey;
  viewer?: {
    firstName?: string;
  };
  variant?: GreetingVariant;
  mode?: PageGreetingHeaderMode;
  titleOverride?: string;
}

/**
 * Personalized page greeting with title + subtitle
 * Client-rendered to use browser time zone
 * Includes staggered reveal animation (motion-safe)
 */
export function PageGreetingHeader({
  page,
  viewer,
  variant = "dashboard",
  mode = "title",
  titleOverride,
}: PageGreetingHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");

  useEffect(() => {
    // Compute title/subtitle after mount (browser time zone + localStorage rotation)
    const hour = new Date().getHours();
    const bucket = getTimeBucket(hour);
    const computedTitle =
      mode === "greeting"
        ? getGreetingTitle(bucket, viewer?.firstName)
        : (titleOverride?.trim() ? titleOverride.trim() : getPageTitle(page, variant));

    // Get last subtitle index from localStorage
    const storageKey = getSubtitleStorageKey(page, variant);
    const lastIndexStr = localStorage.getItem(storageKey);
    const lastIndex = lastIndexStr !== null ? parseInt(lastIndexStr, 10) : undefined;

    // Select non-repeating subtitle
    const { subtitle: selectedSubtitle, index: newIndex } = selectSubtitle(
      page,
      variant,
      lastIndex
    );

    // Store new index
    localStorage.setItem(storageKey, newIndex.toString());

    setTitle(computedTitle);
    setSubtitle(selectedSubtitle);
    setMounted(true);
  }, [mode, page, titleOverride, viewer?.firstName, variant]);

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) {
    return (
      <div className="space-y-1">
        <div className="h-6 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="h-5 w-64 bg-muted/20 rounded animate-pulse" />
      </div>
    );
  }

  // Split subtitle into words for staggered animation
  const titleWords = title.split(" ");
  const subtitleWords = subtitle.split(" ");

  return (
    <div className="space-y-1">
      {/* Title - Linear-inspired: 20px, weight 500 + staggered word reveal */}
      <h1 className="text-[20px] font-[500] tracking-tight">
        {titleWords.map((word, i) => (
          <span
            key={i}
            className="inline-block greeting-word"
            style={{
              animationDelay: `${i * 50}ms`,
            }}
          >
            {word}
            {i < titleWords.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </h1>

      {/* Subtitle - staggered word reveal */}
      <p className="text-[14px] text-muted-foreground">
        {subtitleWords.map((word, i) => (
          <span
            key={i}
            className="inline-block greeting-word"
            style={{
              animationDelay: `${120 + i * 40}ms`,
            }}
          >
            {word}
            {i < subtitleWords.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </p>
    </div>
  );
}

