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
import { strategyRoutes } from "@/app/_features/shell/routes";

/**
 * IntelligenceNavTabs - Navigation tabs for Strategy Intelligence section
 *
 * Displays on page content:
 * [Feed] [Library] [Queue] [⚙️]
 *
 * Note: Deliverables moved to separate nav item in sidebar
 */
export function IntelligenceNavTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.includes("/intelligence/library")) return "library";
    if (pathname.includes("/intelligence/queue")) return "queue";
    return "feed"; // Default - /strategy or /strategy/intelligence
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      feed: strategyRoutes.intelligence.feed,
      library: strategyRoutes.intelligence.library,
      queue: strategyRoutes.intelligence.queue,
    };
    router.push(routeMap[value] || strategyRoutes.home);
  };

  return (
    <div className="flex items-center justify-between">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>
      </Tabs>

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={strategyRoutes.intelligence.settings}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Intelligence Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
