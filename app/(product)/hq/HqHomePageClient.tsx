"use client";

import { Tabs, TabsContent } from "@repo/ui";
import { CustomizeTab } from "@/app/_features/workspace-settings/components/CustomizeTab";

interface HqHomePageClientProps {
  defaultTab: "overview" | "customize";
  overviewContent: React.ReactNode;
}

export function HqHomePageClient({
  defaultTab,
  overviewContent,
}: HqHomePageClientProps) {
  // Tab navigation is handled by SiteHeader
  return (
    <Tabs value={defaultTab} className="w-full">
      <TabsContent value="overview" className="mt-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:gap-6">
          {overviewContent}
        </div>
      </TabsContent>

      <TabsContent value="customize" className="mt-4 md:mt-6 px-4 lg:px-6">
        <CustomizeTab />
      </TabsContent>
    </Tabs>
  );
}
