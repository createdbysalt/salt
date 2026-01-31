"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Badge } from "@/app/_components/ui/badge";
import { StrategicTab } from "./StrategicTab";
import { PerformanceTab } from "./PerformanceTab";
import type { SeoOverviewData } from "@/app/_features/seo/types";

interface ReportsTabsProps {
  seoOverviewData: SeoOverviewData;
}

export function ReportsTabs({ seoOverviewData }: ReportsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current tab from URL, default to "strategic"
  const currentTab = searchParams.get("tab") ?? "strategic";

  // Handle tab change - update URL
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Calculate alert badge for Performance tab
  const alertCount =
    seoOverviewData.summary.projectsNeedingAttention +
    seoOverviewData.summary.projectsCritical;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList variant="line">
        <TabsTrigger value="strategic">Strategic</TabsTrigger>
        <TabsTrigger value="performance" className="gap-2">
          Performance
          {alertCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
              {alertCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="strategic" className="mt-6">
        <StrategicTab />
      </TabsContent>

      <TabsContent value="performance" className="mt-6">
        <PerformanceTab seoData={seoOverviewData} />
      </TabsContent>
    </Tabs>
  );
}
