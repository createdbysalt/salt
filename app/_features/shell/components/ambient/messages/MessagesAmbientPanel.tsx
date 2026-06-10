"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Inbox,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  InsightSection,
  AlertCard,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type { AlertInsight } from "@/app/_features/intelligence/types/ambient-intelligence";

interface UnreadConversation {
  id: string;
  clientName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
}

interface MessagesAmbientPanelProps {
  studioId: string;
  /** Total unread messages */
  unreadCount?: number;
  /** Average response time (hours) */
  avgResponseTime?: number;
  /** Response time trend */
  responseTimeTrend?: "up" | "down" | "stable";
  /** Unread conversations */
  unreadConversations?: UnreadConversation[];
  /** Conversations needing response (> 24h) */
  needsResponseCount?: number;
}

/**
 * Ambient Panel for Messages View
 *
 * Answers: "What conversations need my response?"
 *
 * Sections:
 * - Message Stats (unread, response time)
 * - Urgent (needs response)
 * - Recent Activity
 * - Quick Actions
 */
export function MessagesAmbientPanel({
  studioId,
  unreadCount = 0,
  avgResponseTime = 0,
  responseTimeTrend = "stable",
  unreadConversations = [],
  needsResponseCount = 0,
}: MessagesAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-messages",
    context: { studioId },
    autoRefresh: true,
  });

  // Get alert insights (needs response)
  const alertInsights = insights.filter(
    (i): i is AlertInsight => i.category === "alert"
  );

  // Response time color
  const getResponseTimeColor = (hours: number) => {
    if (hours <= 4) return "text-success";
    if (hours <= 12) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {/* Header with question */}
      {pageConfig && (
        <div className="text-xs text-muted-foreground italic px-1">
          {pageConfig.question}
        </div>
      )}

      {/* Message Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Message Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Unread Messages */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Unread Messages</span>
            <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
              {unreadCount}
            </Badge>
          </div>

          {/* Average Response Time */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg. Response Time</span>
            <span className={`font-medium ${getResponseTimeColor(avgResponseTime)}`}>
              {avgResponseTime < 1
                ? `${Math.round(avgResponseTime * 60)}m`
                : `${avgResponseTime.toFixed(1)}h`}
            </span>
          </div>

          {/* Needs Response */}
          {needsResponseCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Needs Response</span>
              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                <Clock className="h-3 w-3 mr-1" />
                {needsResponseCount}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Urgent Section */}
      <InsightSection
        title="Needs Your Attention"
        icon="AlertCircle"
        loading={loading}
        skeletonCount={2}
      >
        {alertInsights.length > 0 ? (
          <div className="space-y-2">
            {alertInsights.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
            ))}
          </div>
        ) : !loading && needsResponseCount === 0 ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-success">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground">
                    No urgent messages waiting
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </InsightSection>

      {/* Recent Conversations */}
      {unreadConversations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Recent Unread
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unreadConversations.slice(0, 4).map((conversation) => (
              <Link
                key={conversation.id}
                href={`/hq/messages/${conversation.id}`}
                className="group flex items-start justify-between p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {conversation.clientName}
                    </p>
                    {conversation.unreadCount > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {formatDistanceToNow(new Date(conversation.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/hq/messages/new">
              <Plus className="h-4 w-4 mr-2" />
              New message
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/hq/messages?filter=unread">
              <Mail className="h-4 w-4 mr-2" />
              View all unread
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/people">
              <Users className="h-4 w-4 mr-2" />
              Browse clients
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Refresh */}
      {!loading && (
        <div className="flex items-center justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={refresh}
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
