"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Badge } from "@/app/_components/ui/badge";
import { FeedTab } from "./FeedTab";
import { LibraryTab } from "./LibraryTab";
import { QueueTab } from "./QueueTab";
import type {
  GetIntelligenceFeedData,
  GetSavedIntelligenceData,
  GetIntelligenceQueueData,
} from "@/app/_features/intelligence/types";

interface IntelligenceTabsProps {
  initialFeed: GetIntelligenceFeedData;
  initialSaved: GetSavedIntelligenceData;
  initialQueue: GetIntelligenceQueueData;
}

/**
 * Get the default tab based on the current pathname
 * Routes:
 * - /strategy or /strategy/intelligence → feed
 * - /strategy/intelligence/library → library
 * - /strategy/intelligence/queue → queue
 * - /strategy/intelligence/deliverables → (separate page, not tab)
 */
function getDefaultTabFromPathname(pathname: string): string {
  if (pathname.includes("/intelligence/library")) return "library";
  if (pathname.includes("/intelligence/queue")) return "queue";
  return "feed";
}

export function IntelligenceTabs({
  initialFeed,
  initialSaved,
  initialQueue,
}: IntelligenceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current tab from pathname first, then fall back to query param
  const pathnameTab = getDefaultTabFromPathname(pathname);
  const currentTab = searchParams.get("tab") ?? pathnameTab;

  // Handle tab change - navigate to the correct route
  const handleTabChange = (value: string) => {
    // Navigate to the dedicated route instead of using query params
    const routeMap: Record<string, string> = {
      feed: "/strategy",
      library: "/strategy/intelligence/library",
      queue: "/strategy/intelligence/queue",
    };
    router.push(routeMap[value] || "/strategy", { scroll: false });
  };

  // Calculate badge counts
  const newEventsCount = initialFeed.events.filter((e) => e.status === "new").length;
  const activeJobsCount = initialQueue.pendingCount + initialQueue.runningCount;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList variant="line">
        <TabsTrigger value="feed" className="gap-2">
          Feed
          {newEventsCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
              {newEventsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-2">
          Library
          {initialSaved.total > 0 && (
            <Badge variant="outline" className="h-5 min-w-5 px-1.5">
              {initialSaved.total}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="queue" className="gap-2">
          Queue
          {activeJobsCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
              {activeJobsCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="mt-6">
        <FeedTab initialData={initialFeed} />
      </TabsContent>

      <TabsContent value="library" className="mt-6">
        <LibraryTab initialData={initialSaved} />
      </TabsContent>

      <TabsContent value="queue" className="mt-6">
        <QueueTab initialData={initialQueue} />
      </TabsContent>
    </Tabs>
  );
}
