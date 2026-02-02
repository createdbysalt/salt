"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import {
  ClientListHeader,
  ClientFilters,
  ClientListTable,
  ClientsBoardView,
  NewClientDialog,
  ImportClientsDialog,
  type ClientListItem,
  type ViewMode,
} from "@/app/_features/clients/components";
import {
  importClients,
  exportClientsToCSV,
  createClient,
} from "@/app/_features/clients/import-export-actions";
import {
  FolderKanban,
  DollarSign,
  Calendar,
  TrendingUp,
  Mail,
  Phone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

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
  company?: { id: string; name: string } | null;
  lifecycleStage?: "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";
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

interface Company {
  id: string;
  name: string;
}

interface ClientsPageClientProps {
  clients: ClientWithMetrics[];
  upcomingMeetings: Meeting[];
  tags: Tag[];
  companies: Company[];
  initialView?: ViewMode;
}

export function ClientsPageClient({
  clients,
  upcomingMeetings,
  tags,
  companies,
  initialView = "table",
}: ClientsPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(initialView as ViewMode);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "inactive">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Status filter
      if (statusFilter !== "all" && client.status !== statusFilter) {
        return false;
      }

      // Company filter
      if (selectedCompanyId && client.company?.id !== selectedCompanyId) {
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
        const matchesCompany = client.company?.name.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail && !matchesContact && !matchesCompany) {
          return false;
        }
      }

      return true;
    });
  }, [clients, statusFilter, selectedCompanyId, selectedTagIds, searchTerm]);

  // Transform to ClientListItem format for the table
  const tableClients: ClientListItem[] = useMemo(() => {
    return filteredClients.map((client) => ({
      id: client.id,
      name: client.name,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      company: client.company || null,
      status: client.status as "active" | "invited" | "inactive",
      createdAt: client.createdAt,
      tags: client.tags,
    }));
  }, [filteredClients]);

  const hasActiveFilters = statusFilter !== "all" || selectedCompanyId !== null || selectedTagIds.length > 0;

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSelectedCompanyId(null);
    setSelectedTagIds([]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportClientsToCSV();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clients-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Clients exported successfully");
      } else {
        toast.error(result.error || "Failed to export clients");
      }
    } catch {
      toast.error("An error occurred during export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (clientsToImport: any[]) => {
    return await importClients(clientsToImport);
  };

  const handleCreateClient = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    companyId: string | null;
    newCompanyName: string | null;
  }) => {
    return await createClient(data);
  };

  const handleDelete = (clientId: string) => {
    // TODO: Implement delete with confirmation dialog
    toast.error("Delete functionality coming soon");
  };

  const handleMessage = (clientId: string) => {
    router.push(`/studio/clients/${clientId}?tab=messages`);
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-success/10 text-success border-success/20">Excellent</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-info/10 text-info border-info/20">Good</Badge>;
    } else if (score >= 40) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Fair</Badge>;
    } else {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">At Risk</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="clients" viewer={user} />
      </div>

      {/* This Week's Meetings Widget */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Week&apos;s Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/studio/meetings/${meeting.id}`}
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

      {/* List Header (Search, View Toggle, Export, New Client) */}
      <ClientListHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
        onNewClient={() => setNewClientDialogOpen(true)}
        onImport={() => setImportDialogOpen(true)}
        isExporting={isExporting}
      />

      {/* Filters */}
      <ClientFilters
        status={statusFilter}
        onStatusChange={setStatusFilter}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={setSelectedCompanyId}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onTagsChange={setSelectedTagIds}
        onClearAll={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Client Views */}
      {viewMode === "table" ? (
        <ClientListTable
          clients={tableClients}
          onDelete={handleDelete}
          onMessage={handleMessage}
        />
      ) : viewMode === "board" ? (
        // Board view (Pipeline kanban)
        <ClientsBoardView
          clients={filteredClients.map((client) => ({
            id: client.id,
            name: client.name,
            company: client.company,
            contactEmail: client.contactEmail,
            healthScore: client.healthScore,
            lifecycleStage: client.lifecycleStage || "lead",
            mrr: client.mrr,
            projectCount: client.projectCount,
          }))}
        />
      ) : (
        // Grid view (keeping existing implementation for backwards compatibility)
        filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No clients found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Link key={client.id} href={`/studio/clients/${client.id}`}>
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
                            variant="outline"
                            style={{ backgroundColor: `${tag.color}15`, borderColor: tag.color }}
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
        )
      )}

      {/* Dialogs */}
      <NewClientDialog
        open={newClientDialogOpen}
        onOpenChange={setNewClientDialogOpen}
        companies={companies}
        onImportClick={() => {
          setNewClientDialogOpen(false);
          setImportDialogOpen(true);
        }}
        onSubmit={handleCreateClient}
      />

      <ImportClientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  );
}
