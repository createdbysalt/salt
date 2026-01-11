"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/libs/cn";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

// ============================================================================
// Types
// ============================================================================

/** Individual audit item from Lighthouse */
export interface LighthouseAuditItem {
  id: string;
  title: string;
  description: string;
  score: number | null; // 0-1, null means not applicable
  scoreDisplayMode: "binary" | "numeric" | "informative" | "manual" | "notApplicable" | "error";
  displayValue?: string;
  details?: {
    type?: string;
    items?: Array<Record<string, unknown>>;
    headings?: Array<{ key: string; label: string; valueType?: string }>;
  };
}

/** Processed audit item with additional metadata */
export interface ProcessedAuditItem {
  id: string;
  title: string;
  description: string;
  status: "pass" | "fail" | "warning" | "info";
  impact: "high" | "medium" | "low" | null;
  displayValue?: string;
  details?: LighthouseAuditItem["details"];
}

/** Category of audits */
export interface AuditCategory {
  key: string;
  title: string;
  score: number;
  items: ProcessedAuditItem[];
}

/** Props for AuditBreakdown component */
export interface AuditBreakdownProps {
  /** Raw Lighthouse data from PageSpeed API */
  rawData: PageSpeedRawData | null;
  className?: string;
}

/** Simplified PageSpeed raw data structure */
export interface PageSpeedRawData {
  lighthouseResult?: {
    categories?: Record<string, {
      id: string;
      title: string;
      score: number | null;
      auditRefs?: Array<{
        id: string;
        weight: number;
        group?: string;
      }>;
    }>;
    audits?: Record<string, LighthouseAuditItem>;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine status from Lighthouse score
 */
function getStatus(score: number | null, scoreDisplayMode: string): ProcessedAuditItem["status"] {
  if (scoreDisplayMode === "informative" || scoreDisplayMode === "manual" || scoreDisplayMode === "notApplicable") {
    return "info";
  }
  if (score === null) {
    return "info";
  }
  if (score >= 0.9) {
    return "pass";
  }
  if (score >= 0.5) {
    return "warning";
  }
  return "fail";
}

/**
 * Determine impact level for failed/warning items based on weight
 */
function getImpact(weight: number, status: ProcessedAuditItem["status"]): ProcessedAuditItem["impact"] {
  if (status === "pass" || status === "info") {
    return null;
  }
  if (weight >= 10) {
    return "high";
  }
  if (weight >= 3) {
    return "medium";
  }
  return "low";
}

/**
 * Process raw Lighthouse data into structured categories
 */
export function processAuditData(rawData: PageSpeedRawData | null): AuditCategory[] {
  if (!rawData?.lighthouseResult?.categories || !rawData?.lighthouseResult?.audits) {
    return [];
  }

  const { categories, audits } = rawData.lighthouseResult;
  const categoryOrder = ["performance", "accessibility", "best-practices", "seo"];

  const result: AuditCategory[] = [];

  for (const categoryKey of categoryOrder) {
    const category = categories[categoryKey];
    if (!category) continue;

    const auditRefs = category.auditRefs || [];
    const items: ProcessedAuditItem[] = [];

    for (const ref of auditRefs) {
      const audit = audits[ref.id];
      if (!audit) continue;

      // Skip audits that are just informative/manual without scores
      if (audit.scoreDisplayMode === "notApplicable") continue;

      const status = getStatus(audit.score, audit.scoreDisplayMode);
      const impact = getImpact(ref.weight, status);

      items.push({
        id: audit.id,
        title: audit.title,
        description: audit.description || "",
        status,
        impact,
        displayValue: audit.displayValue,
        details: audit.details,
      });
    }

    // Sort: failed items first (by impact: high > medium > low), then warnings, then passed, then info
    items.sort((a, b) => {
      const statusOrder = { fail: 0, warning: 1, pass: 2, info: 3 };
      const impactOrder = { high: 0, medium: 1, low: 2, null: 3 };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      return (impactOrder[a.impact ?? "null"] ?? 3) - (impactOrder[b.impact ?? "null"] ?? 3);
    });

    result.push({
      key: categoryKey,
      title: getCategoryTitle(categoryKey),
      score: Math.round((category.score ?? 0) * 100),
      items,
    });
  }

  return result;
}

function getCategoryTitle(key: string): string {
  const titles: Record<string, string> = {
    performance: "Performance",
    accessibility: "Accessibility",
    "best-practices": "Best Practices",
    seo: "SEO",
  };
  return titles[key] || key;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusIcon({ status }: { status: ProcessedAuditItem["status"] }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function ImpactBadge({ impact }: { impact: ProcessedAuditItem["impact"] }) {
  if (!impact) return null;

  const variants: Record<string, "destructive" | "warning" | "secondary"> = {
    high: "destructive",
    medium: "warning",
    low: "secondary",
  };

  return (
    <Badge variant={variants[impact]} className="text-[10px] uppercase">
      {impact}
    </Badge>
  );
}

function AuditItemRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: ProcessedAuditItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = item.description || item.details?.items?.length;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={hasDetails ? onToggle : undefined}
        className={cn(
          "w-full flex items-start gap-3 py-3 px-2 text-left transition-colors",
          hasDetails && "hover:bg-muted/50 cursor-pointer",
          !hasDetails && "cursor-default"
        )}
      >
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{item.title}</span>
            <ImpactBadge impact={item.impact} />
            {item.displayValue && (
              <span className="text-xs text-muted-foreground">
                {item.displayValue}
              </span>
            )}
          </div>
        </div>
        {hasDetails && (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              isExpanded && "rotate-90"
            )}
          />
        )}
      </button>
      {isExpanded && hasDetails && (
        <div className="px-2 pb-3 pl-9">
          {item.description && (
            <p className="text-sm text-muted-foreground mb-2">
              {/* Strip markdown links for cleaner display */}
              {item.description.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category }: { category: AuditCategory }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const failedCount = category.items.filter((i) => i.status === "fail").length;
  const warningCount = category.items.filter((i) => i.status === "warning").length;
  const passedCount = category.items.filter((i) => i.status === "pass").length;

  return (
    <AccordionItem value={category.key} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{category.title}</span>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <XCircle className="h-3 w-3" />
                {failedCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-500">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </span>
            )}
            {passedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="h-3 w-3" />
                {passedCount}
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="divide-y divide-border/50">
          {category.items.map((item) => (
            <AuditItemRow
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
          {category.items.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground text-center">
              No audit items available
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AuditBreakdown - Displays detailed Lighthouse audit findings
 *
 * Features:
 * - Four collapsible sections (Performance, Accessibility, Best Practices, SEO)
 * - Pass/fail/warning status icons for each audit item
 * - Impact badges (high/medium/low) for failed items
 * - Expandable items to show recommendation details
 * - Items sorted by severity (failed first, then by impact)
 */
export function AuditBreakdown({ rawData, className }: AuditBreakdownProps) {
  const categories = processAuditData(rawData);

  if (categories.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No audit data available. Run an audit to see detailed findings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Audit Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {categories.map((category) => (
            <CategorySection key={category.key} category={category} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
