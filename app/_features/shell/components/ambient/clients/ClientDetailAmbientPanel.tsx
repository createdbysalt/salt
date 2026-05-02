"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  Heart,
  DollarSign,
  Calendar,
  MessageSquare,
  FileText,
  Eye,
  Send,
  Clock,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import type { ClientDetailAmbientData } from "../../../contexts/AmbientPanelContext";

interface ClientDetailAmbientPanelProps {
  data: ClientDetailAmbientData;
}

/**
 * Ambient Panel for Client Detail View
 *
 * Shows client-specific insights:
 * - Health score with factors (with explainability tooltip)
 * - Revenue metrics (LTV, MRR)
 * - Upcoming meetings
 * - Recent activity
 * - Quick actions
 */
export function ClientDetailAmbientPanel({ data }: ClientDetailAmbientPanelProps) {
  const { client, upcomingMeetings, recentActivity } = data;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Health score semantic color classes (using design system tokens)
  const getHealthColorClass = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getHealthBadgeClass = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/10";
    if (score >= 60) return "text-warning border-warning/30 bg-warning/10";
    return "text-destructive border-destructive/30 bg-destructive/10";
  };

  // Activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return MessageSquare;
      case "invoice":
        return DollarSign;
      case "meeting":
        return Calendar;
      case "file":
        return FileText;
      case "project":
        return FolderKanban;
      default:
        return Clock;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
        {/* Client Health & Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Client Health
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                    <span className="sr-only">How is this calculated?</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] p-3">
                  <p className="font-medium mb-2">How Health Score is Calculated</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Starts at 70% base score, then adjusted by:
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <span className="text-success">+10%</span> for paid invoices
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-success">+10%</span> for active projects
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-destructive">−20%</span> for overdue invoices
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-destructive">−10%</span> for outstanding balance
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health Score */}
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold tabular-nums ${getHealthColorClass(client.healthScore)}`}>
                {client.healthScore}%
              </span>
              <Badge
                variant="outline"
                className={getHealthBadgeClass(client.healthScore)}
              >
                {client.healthScore >= 80
                  ? "Healthy"
                  : client.healthScore >= 60
                    ? "At Risk"
                    : "Critical"}
              </Badge>
            </div>
            <Progress
              value={client.healthScore}
              className="h-2"
            />

            {/* Health Factors */}
            {client.healthFactors.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Contributing Factors
                </p>
                {client.healthFactors.slice(0, 3).map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm"
                  >
                    {factor.impact > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    )}
                    <span className="text-muted-foreground">
                      {factor.reason}
                      <span className={`ml-1 text-xs ${factor.impact > 0 ? "text-success" : "text-destructive"}`}>
                        ({factor.impact > 0 ? "+" : ""}{factor.impact}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Revenue Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Lifetime Value</span>
            <span className="font-semibold">{formatCurrency(client.ltv)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Revenue</span>
            <span className="font-semibold">{formatCurrency(client.mrr)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Projects</span>
            <span className="font-semibold">{client.projectCount}</span>
          </div>
          {client.lastContactAt && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Last Contact</span>
              <span className="text-sm">
                {formatDistanceToNow(new Date(client.lastContactAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingMeetings.slice(0, 2).map((meeting) => (
              <Link
                key={meeting.id}
                href={`/studio/meetings/${meeting.id}`}
                className="group flex items-center justify-between p-2 -mx-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(meeting.date), "EEE, MMM d 'at' h:mm a")}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href={`/studio/clients/${client.id}?tab=messages`}>
              <Send className="h-4 w-4 mr-2" />
              Send message
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href={`/studio/clients/${client.id}?tab=invoices`}>
              <FileText className="h-4 w-4 mr-2" />
              Create invoice
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href={`/serve/table?client=${client.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Bridge
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.slice(0, 4).map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
}
