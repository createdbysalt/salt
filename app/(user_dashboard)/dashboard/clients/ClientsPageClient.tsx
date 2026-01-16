"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Input } from "@/app/_components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  Plus,
  Search,
  Mail,
  Phone,
  FolderKanban,
  DollarSign,
  Calendar,
  Grid3x3,
  List,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ViewMode = "grid" | "list";

interface ClientWithMetrics {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  status: string;
  createdAt: string;
  lastContactAt: string | null;
  projectCount: number;
  mrr: number;
  ltv: number;
  healthScore: number;
  healthFactors: Array<{ factor: string; impact: number; reason: string }>;
  nextMeeting: { id: string; title: string; startTime: Date } | null;
  tags: Array<{ id: string; label: string; color: string }>;
}

interface Meeting {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  startTime: Date;
}

interface Tag {
  id: string;
  label: string;
  color: string;
}

interface ClientsPageClientProps {
  clients: ClientWithMetrics[];
  upcomingMeetings: Meeting[];
  tags: Tag[];
  initialView?: ViewMode;
}

export function ClientsPageClient({
  clients,
  upcomingMeetings,
  tags,
  initialView = "grid",
}: ClientsPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Filter clients
  const filteredClients = clients.filter((client) => {
    // Status filter
    if (statusFilter !== "all" && client.status !== statusFilter) {
      return false;
    }

    // Tag filter
    if (selectedTagIds.length > 0) {
      const hasMatchingTag = client.tags.some((tag) => selectedTagIds.includes(tag.id));
      if (!hasMatchingTag) return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = client.name.toLowerCase().includes(search);
      const matchesEmail = client.contactEmail?.toLowerCase().includes(search);
      const matchesContact = client.contactName?.toLowerCase().includes(search);
      if (!matchesName && !matchesEmail && !matchesContact) {
        return false;
      }
    }

    return true;
  });

  const getHealthBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-500">Excellent</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-blue-500">Good</Badge>;
    } else if (score >= 40) {
      return <Badge className="bg-yellow-500">Fair</Badge>;
    } else {
      return <Badge className="bg-red-500">At Risk</Badge>;
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="clients" viewer={user} />
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Link>
        </Button>
      </div>

      {/* This Week's Meetings Widget */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Week's Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/meetings/${meeting.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.clientName} • {formatDistanceToNow(meeting.startTime, { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tag Filters */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer"
              style={{
                backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : undefined,
              }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Client Grid/List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No clients found</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4">
                  {/* Header: Name + Health */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      {client.contactName && (
                        <p className="text-sm text-muted-foreground">{client.contactName}</p>
                      )}
                    </div>
                    {getHealthBadge(client.healthScore)}
                  </div>

                  {/* Tags */}
                  {client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span>{client.projectCount} projects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${client.mrr}/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>LTV: ${client.ltv.toLocaleString()}</span>
                    </div>
                    {client.lastContactAt && !isNaN(new Date(client.lastContactAt).getTime()) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDistanceToNow(new Date(client.lastContactAt), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>

                  {/* Next Meeting */}
                  {client.nextMeeting && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Next Meeting</p>
                      <p className="text-sm font-medium">{client.nextMeeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(client.nextMeeting.startTime, { addSuffix: true })}
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {client.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{client.contactEmail}</span>
                      </div>
                    )}
                    {client.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{client.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{client.name}</h3>
                      {getHealthBadge(client.healthScore)}
                      {client.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                    {client.contactEmail && (
                      <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{client.projectCount} projects</p>
                      <p className="text-muted-foreground">${client.mrr}/mo MRR</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">LTV: ${client.ltv.toLocaleString()}</p>
                      {client.lastContactAt && !isNaN(new Date(client.lastContactAt).getTime()) && (
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(client.lastContactAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
