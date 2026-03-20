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
const ROUTES_WITH_CUSTOM_HEADER = ["/studio/inbox", "/studio/clients", "/studio/projects", "/studio/billing", "/serve"];

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
      <header className="flex h-12 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 !h-4 !self-center"
          />
          <span className="text-sm font-medium">{studioName ? toTitleCase(studioName) : "My Studio"}</span>

          <div className="ml-auto">
            <Button size="xs" variant="secondary" asChild>
              <Link href="/settings/studio/profile">
                <Settings className="size-3" />
                Customize Studio
              </Link>
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}
