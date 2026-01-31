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

export function IntelligenceTabs({
  initialFeed,
  initialSaved,
  initialQueue,
}: IntelligenceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current tab from URL, default to "feed"
  const currentTab = searchParams.get("tab") ?? "feed";

  // Handle tab change - update URL
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
