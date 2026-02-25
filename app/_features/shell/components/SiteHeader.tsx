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
 * Hidden on routes that provide their own header (e.g., /studio/inbox)
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Routes that provide their own header
const ROUTES_WITH_CUSTOM_HEADER = ["/studio/inbox"];

export function SiteHeader() {
  const { studioName } = useDashboardUser();
  const pathname = usePathname();

  // Hide on routes with custom headers
  if (ROUTES_WITH_CUSTOM_HEADER.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Primary header row */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{studioName ? toTitleCase(studioName) : "My Studio"}</h1>

          <div className="ml-auto">
            <Button size="sm" variant="secondary" asChild>
              <Link href="/settings/studio/profile">
                <Settings className="h-4 w-4" />
                Customize Studio
              </Link>
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}
