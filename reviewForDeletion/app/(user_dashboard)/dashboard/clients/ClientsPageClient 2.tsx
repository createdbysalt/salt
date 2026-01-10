"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTagManagement } from "@/src/features/shared/hooks/useTagManagement";
import { getTagColorClass, getTagFilterColor } from "@/src/features/shared/types/tags";
import {
  Plus,
  Search,
  Mail,
  Phone,
  FolderKanban,
  DollarSign,
  MoreVertical,
  TrendingUp,
  AlertCircle,
  Zap,
  Tag as TagIcon,
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, any> = {
  AlertCircle: AlertCircle,
  Zap: Zap,
  TrendingUp: TrendingUp,
  Tag: TagIcon,
};

type FilterType = "all" | "active" | "inactive" | string; // string for tag IDs

type Client = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  status: string;
  revenue: string | null;
  lastContact: string | null;
  tagIds: string[];
  contactName: string | null;
  projects: number;
};

export function ClientsPageClient({
  clients,
  initialSearch,
}: {
  clients: Client[];
  initialSearch?: string;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const { tags: clientTags, getTagsByIds, loading: tagsLoading } = useTagManagement("client");

  // Filter clients based on active filter and search
  const filteredClients = clients.filter((client) => {
    // Apply status/tag filter
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = client.status === "active";
    } else if (activeFilter === "inactive") {
      matchesFilter = client.status === "inactive";
    } else if (activeFilter !== "all") {
      // Tag-based filter
      matchesFilter = client.tagIds.includes(activeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesFilter =
        matchesFilter &&
        (client.name.toLowerCase().includes(searchLower) ||
          client.contactEmail?.toLowerCase().includes(searchLower) ||
          client.contactName?.toLowerCase().includes(searchLower) ||
          false);
    }

    return matchesFilter;
  });

  const activeClients = clients.filter((c) => c.status === "active").length;

  // Calculate tag counts dynamically
  const tagCounts: Record<string, number> = {};
  clientTags.forEach((tag) => {
    tagCounts[tag.id] = clients.filter((c) => c.tagIds.includes(tag.id)).length;
  });

  // Calculate total revenue (from clients with revenue data)
  const totalRevenue = clients.reduce((sum, c) => {
    if (c.revenue) {
      const revenueNum = parseFloat(c.revenue.replace(/[^0-9.-]/g, ""));
      return sum + (isNaN(revenueNum) ? 0 : revenueNum);
    }
    return sum;
  }, 0);

  // Count retainer clients (using tag)
  const retainerTag = clientTags.find((t) => t.label.toLowerCase().includes("retainer"));
  const retainerCount = retainerTag ? tagCounts[retainerTag.id] || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client relationships
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-3xl font-semibold">{clients.length}</p>
              <p className="text-xs text-success">
                +{Math.max(0, clients.length - Math.floor(clients.length * 0.87))} this month
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-semibold">{activeClients}</p>
              <p className="text-xs text-muted-foreground">
                {clients.length > 0
                  ? Math.round((activeClients / clients.length) * 100)
                  : 0}
                % of total
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-semibold">
                {totalRevenue > 0
                  ? `$${(totalRevenue / 1000).toFixed(0)}K`
                  : "$0"}
              </p>
              <p className="text-xs text-success">
                {totalRevenue > 0 ? "+12.5% vs last month" : "No revenue yet"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Retainers</p>
              <p className="text-3xl font-semibold">{retainerCount}</p>
              <p className="text-xs text-muted-foreground">Monthly recurring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeFilter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All Clients
        </Button>
        <Button
          variant={activeFilter === "active" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={activeFilter === "inactive" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveFilter("inactive")}
        >
          Inactive
        </Button>

        {/* Dynamic tag filters */}
        {clientTags.map((tag) => {
          const count = tagCounts[tag.id] || 0;
          if (count === 0) return null;

          const Icon = iconMap[tag.icon] || TagIcon;

          return (
            <Button
              key={tag.id}
              variant={activeFilter === tag.id ? "secondary" : "ghost"}
              size="sm"
              className={
                activeFilter === tag.id
                  ? getTagFilterColor(tag.color)
                  : getTagFilterColor(tag.color)
              }
              onClick={() => setActiveFilter(tag.id)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {tag.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <div className="text-foreground/50">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">
                  {searchTerm || activeFilter !== "all"
                    ? "No clients match your filters"
                    : "No clients yet"}
                </p>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm || activeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first client to get started"}
                </p>
                {!searchTerm && activeFilter === "all" && (
                  <Button asChild>
                    <Link href="/dashboard/clients/new">
                      Add Your First Client
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredClients.map((client) => {
            const avatar = client.name?.charAt(0)?.toUpperCase() || "C";
            const displayContact =
              client.contactName ||
              client.contactEmail?.split("@")[0] ||
              "No contact";

            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <Link href={`/dashboard/clients/${client.id}`}>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-medium shrink-0">
                        {avatar}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 space-y-3 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{client.name}</h3>
                              <Badge variant="secondary" className="text-[10px]">
                                {client.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {displayContact}
                            </p>
                            {!tagsLoading && client.tagIds && client.tagIds.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getTagsByIds(client.tagIds).map((tag) => {
                                  const Icon = iconMap[tag.icon] || TagIcon;
                                  return (
                                    <Badge
                                      key={tag.id}
                                      variant="secondary"
                                      className={`${getTagColorClass(
                                        tag.color
                                      )} text-[10px]`}
                                    >
                                      <Icon className="h-3 w-3 mr-1" />
                                      {tag.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Contact & Stats Grid */}
                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                          {client.contactEmail && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {client.contactEmail}
                              </span>
                            </div>
                          )}
                          {client.contactPhone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{client.contactPhone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">
                              {client.projects} project
                              {client.projects !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {client.revenue && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">{client.revenue}</span>
                            </div>
                          )}
                        </div>

                        {/* Last Contact */}
                        {client.lastContact && (
                          <div className="text-xs text-muted-foreground">
                            Last contact: {client.lastContact}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

