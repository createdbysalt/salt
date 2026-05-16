"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import {
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Users,
  Tags,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/utils";
import type { MeetingSummaryDisplayProps } from "../types";

/**
 * MeetingSummaryDisplay - Displays AI-generated meeting summary
 *
 * Shows executive summary, key decisions, and next steps in a structured format.
 *
 * @example
 * ```tsx
 * <MeetingSummaryDisplay summary={meetingSummary} />
 * ```
 */
export function MeetingSummaryDisplay({
  summary,
  className,
}: MeetingSummaryDisplayProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">
            {summary.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Key Points */}
      {summary.keyPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Key Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-foreground/90"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Decisions */}
      {summary.keyDecisions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Key Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.keyDecisions.map((decision, index) => (
                <div
                  key={index}
                  className="border-l-2 border-green-200 pl-4 dark:border-green-900"
                >
                  <p className="text-sm font-medium text-foreground">
                    {decision.decision}
                  </p>
                  {decision.rationale && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {decision.rationale}
                    </p>
                  )}
                  {decision.participants && decision.participants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {decision.participants.map((participant, pIndex) => (
                        <Badge key={pIndex} variant="secondary" className="text-xs">
                          {participant}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {summary.nextSteps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4 text-blue-500" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info/10 text-xs font-medium text-info">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {step.description}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {step.owner && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {step.owner}
                        </span>
                      )}
                      {step.targetDate && (
                        <span>Due: {step.targetDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants & Topics */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Participants */}
        {summary.participants.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.participants.map((participant, index) => (
                  <Badge key={index} variant="outline">
                    {participant}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topics */}
        {summary.topics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tags className="h-4 w-4 text-muted-foreground" />
                Topics Discussed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI metadata */}
      <p className="text-xs text-muted-foreground">
        Generated by {summary.model} • {summary.generatedAt.toLocaleString()}
      </p>
    </div>
  );
}
