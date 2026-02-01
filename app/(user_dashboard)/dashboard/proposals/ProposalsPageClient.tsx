"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Input } from "@/app/_components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Check,
  X,
  Clock,
  Send,
  DollarSign,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { ProposalListItem } from "@/app/_features/proposals/queries";
import type { ProposalStatus } from "@/app/_features/proposals/types";
import { PROPOSAL_STATUS } from "@/app/_features/proposals/types";

interface Client {
  id: string;
  name: string;
}

interface ProposalsPageClientProps {
  proposals: ProposalListItem[];
  clients: Client[];
  initialStatus?: ProposalStatus | "all";
  initialSearch?: string;
}

// Status badge configuration
const statusConfig: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  sent: { label: "Sent", variant: "default", icon: <Send className="h-3 w-3" /> },
  viewed: { label: "Viewed", variant: "outline", icon: <Eye className="h-3 w-3" /> },
  accepted: { label: "Accepted", variant: "default", icon: <Check className="h-3 w-3" /> },
  declined: { label: "Declined", variant: "destructive", icon: <X className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
};

export function ProposalsPageClient({
  proposals,
  clients,
  initialStatus = "all",
  initialSearch = "",
}: ProposalsPageClientProps) {
  const user = useDashboardUser();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">(initialStatus);

  // Filter proposals
  const filteredProposals = proposals.filter((proposal) => {
    // Status filter
    if (statusFilter !== "all" && proposal.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesTitle = proposal.title.toLowerCase().includes(search);
      const matchesClient = proposal.client?.name?.toLowerCase().includes(search);
      if (!matchesTitle && !matchesClient) {
        return false;
      }
    }

    return true;
  });

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const getStatusBadge = (status: ProposalStatus) => {
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="proposals" viewer={user} />
        <Button asChild>
          <Link href="/dashboard/proposals/new">
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProposalStatus | "all")}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value={PROPOSAL_STATUS.DRAFT}>Draft</TabsTrigger>
            <TabsTrigger value={PROPOSAL_STATUS.SENT}>Sent</TabsTrigger>
            <TabsTrigger value={PROPOSAL_STATUS.VIEWED}>Viewed</TabsTrigger>
            <TabsTrigger value={PROPOSAL_STATUS.ACCEPTED}>Accepted</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search proposals by title or client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {proposals.length === 0
                ? "No proposals yet. Create your first proposal."
                : "No proposals match your filters."}
            </p>
            {proposals.length === 0 && (
              <Button asChild>
                <Link href="/dashboard/proposals/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredProposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/dashboard/proposals/${proposal.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{proposal.title}</h3>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {proposal.client?.name || "No client"}
                      {proposal.client?.contact_email && (
                        <span className="ml-2 text-muted-foreground/70">
                          ({proposal.client.contact_email})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    {/* Amount */}
                    <div className="text-right min-w-[100px]">
                      <div className="flex items-center gap-1 justify-end">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(proposal.total_amount, proposal.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="text-right min-w-[120px] hidden md:block">
                      {proposal.sent_at ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Sent</p>
                          <p className="text-sm">
                            {format(new Date(proposal.sent_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm">
                            {formatDistanceToNow(new Date(proposal.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Viewed indicator */}
                    {proposal.viewed_at && proposal.status !== "accepted" && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">Viewed</span>
                      </div>
                    )}
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
