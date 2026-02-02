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
import { studioRoutes } from "@/app/_features/shell/routes";

/**
 * WorkTabs - Navigation tabs for Studio Work section
 *
 * Displays on page content:
 * [Today] [Projects] [Clients] [Pipeline] [⚙️]
 */
export function WorkTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname.includes("/work/projects") || pathname.includes("/projects/")) return "projects";
    if (pathname.includes("/work/clients") || pathname.includes("/clients/")) return "clients";
    if (pathname.includes("/work/pipeline") || pathname.includes("/pipeline/")) return "pipeline";
    return "today"; // Default - /studio or /studio/work/today
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      today: studioRoutes.work.today,
      projects: studioRoutes.work.projects,
      clients: studioRoutes.work.clients,
      pipeline: studioRoutes.work.pipeline,
    };
    router.push(routeMap[value] || studioRoutes.home);
  };

  return (
    <div className="flex items-center justify-between">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>
      </Tabs>

      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={studioRoutes.work.settings}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Work Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
