"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { serveRoutes } from "@/app/_features/shell/routes";

/**
 * BridgeTabs - Navigation tabs for Serve Bridge section
 *
 * Displays on page content:
 * [Shared] [Requests] [Messages] [⚙️]
 */
export function BridgeTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.includes("/bridge/requests") || pathname.includes("/requests")) return "requests";
    if (pathname.includes("/bridge/messages") || pathname.includes("/messages")) return "messages";
    return "shared"; // Default - /serve or /serve/bridge/shared
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      shared: serveRoutes.bridge.shared,
      requests: serveRoutes.bridge.requests,
      messages: serveRoutes.bridge.messages,
    };
    router.push(routeMap[value] || serveRoutes.home);
  };

  return (
    <div className="flex items-center justify-between">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="shared">Shared</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
      </Tabs>

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={serveRoutes.bridge.settings}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bridge Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
