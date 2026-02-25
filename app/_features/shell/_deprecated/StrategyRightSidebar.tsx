"use client";

import { GenerationQueue } from "./GenerationQueue";
import { RecentInsights } from "./RecentInsights";
import { ResearchContext } from "./ResearchContext";

/**
 * Strategy Mode Right Sidebar
 * Shows intelligence-focused content:
 * - Generation Queue: Active AI generation tasks (Claude Cowork-style progress)
 * - Recent Insights: Latest AI-generated intelligence snippets
 * - Research Context: Files/data feeding current work
 */
export function StrategyRightSidebar() {
  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      <div className="space-y-4">
        <GenerationQueue />
        <RecentInsights />
        <ResearchContext />
      </div>
    </div>
  );
}
