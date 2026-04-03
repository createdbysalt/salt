"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import {
  Button,
  Separator,
  SidebarTrigger,
} from "@repo/ui";
import { useDashboardUser } from "../contexts/DashboardUserContext";

/**
 * SiteHeader - Header for the dashboard content area
 * Shows greeting on Overview pages, page title on others
 */

// Overview routes that get a personalized greeting
const OVERVIEW_ROUTES = ["/hq", "/clients", "/work", "/billing", "/sales"];

// Routes that provide their own header entirely
const ROUTES_WITH_CUSTOM_HEADER = ["/studio/inbox", "/serve"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  return "good evening";
}

const SUBTITLES = {
  morning: [
    "let's make it happen.",
    "time to create.",
    "back at it.",
  ],
  afternoon: [
    "keep the momentum.",
    "you're in the zone.",
    "let's keep going.",
  ],
  evening: [
    "finish strong.",
    "nice work today.",
    "winding down.",
  ],
};

function getSubtitle(): string {
  const now = new Date();
  const hour = now.getHours();

  // Pick time period
  let period: keyof typeof SUBTITLES;
  if (hour < 12) period = "morning";
  else if (hour < 17) period = "afternoon";
  else period = "evening";

  // Use day of year for consistent daily rotation within the period
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const options = SUBTITLES[period];
  return options[dayOfYear % options.length];
}

function isOverviewRoute(pathname: string): boolean {
  return OVERVIEW_ROUTES.some(
    (route) => pathname === route || pathname === `${route}/`
  );
}

export function SiteHeader() {
  const { firstName } = useDashboardUser();
  const pathname = usePathname();

  // Hide on routes with custom headers
  if (ROUTES_WITH_CUSTOM_HEADER.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const showGreeting = isOverviewRoute(pathname);
  const greeting = getGreeting();
  const subtitle = getSubtitle();
  const name = (firstName || "there").toLowerCase();

  return (
    <div className="flex flex-col">
      {/* Primary header row */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 !h-5 !self-center"
          />
          {showGreeting ? (
            <span className="text-2xl">
              <span className="font-semibold greeting-word">{greeting}, {name}</span>
              <span
                className="font-normal text-muted-foreground greeting-word"
                style={{ animationDelay: "150ms" }}
              >
                {" "}— {subtitle}
              </span>
            </span>
          ) : (
            <span className="text-2xl font-semibold greeting-word">
              {name}
            </span>
          )}

          <div className="ml-auto">
            <Button size="icon" variant="secondary" className="size-8" asChild>
              <Link href="/settings/studio/profile">
                <Settings className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}
