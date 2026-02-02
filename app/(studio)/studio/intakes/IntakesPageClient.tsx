"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Input } from "@/app/_components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  Search,
  Mail,
  Globe,
  Calendar,
  ExternalLink,
  UserPlus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { IntakeListItem } from "@/app/_features/intake/queries";

type StatusFilter = "all" | "submitted" | "reviewing" | "converted" | "declined";

interface IntakesPageClientProps {
  intakes: IntakeListItem[];
}

/**
 * Get badge variant and label for intake status
 */
function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return { label: "Draft", variant: "secondary" as const };
    case "submitted":
      return { label: "New", variant: "default" as const };
    case "reviewing":
      return { label: "Reviewing", variant: "outline" as const };
    case "scheduled":
      return { label: "Scheduled", variant: "outline" as const };
    case "converted":
      return { label: "Converted", variant: "default" as const, className: "bg-green-600" };
    case "declined":
      return { label: "Declined", variant: "destructive" as const };
    case "archived":
      return { label: "Archived", variant: "secondary" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

/**
 * Get icon for discovery status
 */
function getDiscoveryIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "processing":
    case "pending":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "partial":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
}

/**
 * Extract display name from intake
 * Priority: company_name > contact_name > domain from URL
 */
function getDisplayName(intake: IntakeListItem): string {
  if (intake.company_name) return intake.company_name;
  if (intake.contact_name) return intake.contact_name;

  // Try to extract domain from URL
  try {
    const url = new URL(
      intake.website_url.startsWith("http")
        ? intake.website_url
        : `https://${intake.website_url}`
    );
    return url.hostname.replace("www.", "");
  } catch {
    return intake.website_url || "Unknown";
  }
}

export function IntakesPageClient({ intakes }: IntakesPageClientProps) {
  const user = useDashboardUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filter intakes
  const filteredIntakes = intakes.filter((intake) => {
    // Status filter
    if (statusFilter !== "all" && intake.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = getDisplayName(intake).toLowerCase().includes(search);
      const matchesGoal = intake.primary_goal.toLowerCase().includes(search);
      const matchesEmail = intake.contact_email?.toLowerCase().includes(search);
      const matchesUrl = intake.website_url?.toLowerCase().includes(search);
      if (!matchesName && !matchesGoal && !matchesEmail && !matchesUrl) {
        return false;
      }
    }

    return true;
  });

  // Count by status for tabs
  const statusCounts = {
    all: intakes.length,
    submitted: intakes.filter((i) => i.status === "submitted").length,
    reviewing: intakes.filter((i) => i.status === "reviewing").length,
    converted: intakes.filter((i) => i.status === "converted").length,
    declined: intakes.filter((i) => i.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="intakes" viewer={user} />
        <Button asChild variant="outline">
          <Link href="/studio/clients/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Client Manually
          </Link>
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="submitted">New ({statusCounts.submitted})</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing ({statusCounts.reviewing})</TabsTrigger>
          <TabsTrigger value="converted">Converted ({statusCounts.converted})</TabsTrigger>
          <TabsTrigger value="declined">Declined ({statusCounts.declined})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search intakes by name, URL, or goal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty State */}
      {filteredIntakes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No intakes found</h3>
            <p className="text-muted-foreground mb-4">
              {intakes.length === 0
                ? "Share your intake form link with potential clients to start receiving submissions."
                : "Try adjusting your filters or search term."}
            </p>
            {intakes.length === 0 && (
              <Button variant="outline" asChild>
                <Link href="/studio/settings">Copy Intake Link</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Intakes Table */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredIntakes.length} intake{filteredIntakes.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredIntakes.map((intake) => {
                const statusBadge = getStatusBadge(intake.status);
                const displayName = getDisplayName(intake);

                return (
                  <div
                    key={intake.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    {/* Left: Name, Goal, Meta */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{displayName}</h3>
                        <Badge
                          variant={statusBadge.variant}
                          className={statusBadge.className}
                        >
                          {statusBadge.label}
                        </Badge>
                        {getDiscoveryIcon(intake.discovery_status)}
                      </div>

                      {/* Goal - truncated */}
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {intake.primary_goal}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {intake.website_url && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {intake.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </span>
                        )}
                        {intake.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {intake.contact_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {intake.submitted_at
                            ? formatDistanceToNow(new Date(intake.submitted_at), { addSuffix: true })
                            : format(new Date(intake.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {intake.client_id ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/studio/clients/${intake.client_id}`}>
                            View Client
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      ) : intake.status !== "declined" && intake.status !== "archived" ? (
                        <Button size="sm" asChild>
                          <Link href={`/studio/clients/new?intake=${intake.id}`}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Convert to Client
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
