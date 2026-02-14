"use client";

/**
 * KnowledgeContextPanel Component
 *
 * Displays available knowledge items for proposal generation.
 * Allows selection of items to include in extraction.
 *
 * Features:
 * - Groups items by type
 * - Search/filter functionality
 * - Select all / deselect all
 * - Summary of selection
 */

import * as React from "react";
import { useState, useMemo } from "react";
import {
  FileText,
  MessageSquare,
  Lightbulb,
  Link as LinkIcon,
  FileCheck,
  MessageCircle,
  Image,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  Info,
  Pin,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Checkbox,
  Badge,
  Button,
  Skeleton,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@repo/ui";
import { EmptyState } from "@repo/patterns";

import type { ProposalContext } from "../queries";
import type { KnowledgeItem, KnowledgeType } from "../types";

// ============================================================================
// Types
// ============================================================================

interface KnowledgeContextPanelProps {
  /** Proposal context data */
  context: ProposalContext | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Selected item IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Type Config
// ============================================================================

const typeConfig: Record<
  KnowledgeType,
  {
    icon: React.ElementType;
    label: string;
    description: string;
  }
> = {
  intake_response: {
    icon: FileText,
    label: "Intake Responses",
    description: "Client answers to essential questions",
  },
  discovery_note: {
    icon: Lightbulb,
    label: "Discovery Notes",
    description: "Auto-discovered company information",
  },
  meeting_transcript: {
    icon: MessageSquare,
    label: "Meeting Transcripts",
    description: "Recorded call transcriptions",
  },
  document: {
    icon: FileText,
    label: "Documents",
    description: "Uploaded files and documents",
  },
  link: {
    icon: LinkIcon,
    label: "Links",
    description: "Reference URLs",
  },
  insight: {
    icon: Lightbulb,
    label: "Insights",
    description: "AI-generated summaries",
  },
  decision: {
    icon: FileCheck,
    label: "Decisions",
    description: "Past project decisions",
  },
  feedback: {
    icon: MessageCircle,
    label: "Feedback",
    description: "Client feedback and preferences",
  },
  asset: {
    icon: Image,
    label: "Assets",
    description: "Brand assets and media",
  },
};

// ============================================================================
// Knowledge Item Row
// ============================================================================

function KnowledgeItemRow({
  item,
  isSelected,
  onToggle,
}: {
  item: KnowledgeItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const config = typeConfig[item.type];
  const Icon = config?.icon || FileText;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onChange={onToggle} className="mt-0.5" />

      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.title}</span>
          {item.is_pinned && (
            <Pin className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>
        {item.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {item.content.slice(0, 100)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Essential Question Row
// ============================================================================

function EssentialQuestionRow({
  question,
  isSelected,
  onToggle,
}: {
  question: {
    key: string;
    title: string;
    response: string | null;
  };
  isSelected: boolean;
  onToggle: () => void;
}) {
  if (!question.response) {
    return (
      <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 opacity-50">
        <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">{question.title}</span>
          <p className="text-xs text-muted-foreground italic mt-0.5">Not answered</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onChange={onToggle} className="mt-0.5" />

      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{question.title}</span>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {question.response}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function KnowledgeContextSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KnowledgeContextPanel({
  context,
  isLoading = false,
  error = null,
  selectedIds,
  onSelectionChange,
  className,
}: KnowledgeContextPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Build list of all selectable items
  const allItems = useMemo(() => {
    if (!context) return { questions: [], items: [] };

    // Essential questions as selectable items
    const questions = context.essential_questions
      .filter((q) => q.response)
      .map((q) => ({
        id: `question:${q.key}`,
        title: q.title,
        content: q.response || "",
        type: "intake_response" as const,
      }));

    // All knowledge items
    const knowledgeItems = [
      ...context.additional_context.decisions,
      ...context.additional_context.feedback,
      ...context.additional_context.pinned_items,
    ].filter(
      // Dedupe by id
      (item, index, self) => self.findIndex((i) => i.id === item.id) === index
    );

    return { questions, items: knowledgeItems };
  }, [context]);

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;

    const query = searchQuery.toLowerCase();
    return {
      questions: allItems.questions.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query)
      ),
      items: allItems.items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content?.toLowerCase().includes(query)
      ),
    };
  }, [allItems, searchQuery]);

  // Selection helpers
  const allSelectableIds = [
    ...allItems.questions.map((q) => q.id),
    ...allItems.items.map((i) => i.id),
  ];

  const isAllSelected = allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allSelectableIds);
    }
  };

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Group items by type
  const groupedItems = useMemo(() => {
    const groups: Record<KnowledgeType, KnowledgeItem[]> = {
      intake_response: [],
      discovery_note: [],
      meeting_transcript: [],
      document: [],
      link: [],
      insight: [],
      decision: [],
      feedback: [],
      asset: [],
    };

    for (const item of filteredItems.items) {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    }

    return groups;
  }, [filteredItems.items]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Knowledge Context
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                Select knowledge items to include in proposal extraction.
                Essential questions and discovery data will be used automatically.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Loading State */}
        {isLoading && <KnowledgeContextSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !context && (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No context available"
            description="Knowledge items will appear here once the client has intake data."
          />
        )}

        {/* Main Content */}
        {!isLoading && !error && context && (
          <>
            {/* Search & Select All */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search context..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="shrink-0"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Deselect
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-1" />
                    Select All
                  </>
                )}
              </Button>
            </div>

            {/* Selection Summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selectedIds.length} of {allSelectableIds.length} items selected
              </span>
              {context.metadata.total_knowledge_items > 0 && (
                <span>
                  {context.metadata.total_knowledge_items} total items
                </span>
              )}
            </div>

            {/* Accordion Sections */}
            <Accordion
              type="multiple"
              defaultValue={["essential", "decisions"]}
              className="space-y-1"
            >
              {/* Essential Questions */}
              {filteredItems.questions.length > 0 && (
                <AccordionItem value="essential" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Essential Questions</span>
                      <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                        {filteredItems.questions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-2 px-1">
                    <div className="space-y-1">
                      {context.essential_questions.map((q) => (
                        <EssentialQuestionRow
                          key={q.key}
                          question={q}
                          isSelected={selectedIds.includes(`question:${q.key}`)}
                          onToggle={() => handleToggleItem(`question:${q.key}`)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Discovery Data Summary */}
              {(context.discovery.company_name || context.discovery.tech_stack.length > 0) && (
                <AccordionItem value="discovery" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2 flex-1">
                      <Lightbulb className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Discovery Data</span>
                      <Badge variant="outline" className="ml-auto mr-2 text-[10px] bg-primary/10 text-primary">
                        Auto-included
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pt-2 px-3">
                    <div className="space-y-2 text-sm">
                      {context.discovery.company_name && (
                        <div>
                          <span className="text-muted-foreground">Company:</span>{" "}
                          <span className="font-medium">{context.discovery.company_name}</span>
                        </div>
                      )}
                      {context.discovery.industry && (
                        <div>
                          <span className="text-muted-foreground">Industry:</span>{" "}
                          <span>{context.discovery.industry}</span>
                        </div>
                      )}
                      {context.discovery.tech_stack.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Tech:</span>{" "}
                          <span>{context.discovery.tech_stack.slice(0, 5).join(", ")}</span>
                        </div>
                      )}
                      {context.discovery.competitors.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Competitors:</span>{" "}
                          <span>{context.discovery.competitors.slice(0, 3).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Knowledge Items by Type */}
              {Object.entries(groupedItems)
                .filter(([, items]) => items.length > 0)
                .map(([type, items]) => {
                  const config = typeConfig[type as KnowledgeType];
                  return (
                    <AccordionItem key={type} value={type} className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2 flex-1">
                          <config.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{config.label}</span>
                          <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                            {items.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0 pt-2 px-1">
                        <div className="space-y-1">
                          {items.map((item) => (
                            <KnowledgeItemRow
                              key={item.id}
                              item={item}
                              isSelected={selectedIds.includes(item.id)}
                              onToggle={() => handleToggleItem(item.id)}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>

            {/* Readiness Score */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Context Readiness</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    context.metadata.total_knowledge_items >= 5
                      ? "bg-success/10 text-success border-success/20"
                      : context.metadata.total_knowledge_items >= 2
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {context.metadata.total_knowledge_items >= 5
                    ? "Rich"
                    : context.metadata.total_knowledge_items >= 2
                      ? "Moderate"
                      : "Limited"}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
