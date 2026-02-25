"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { PageGreetingHeader } from "@/app/_components/patterns/page-greeting-header";
import { useDashboardUser } from "@/app/_features/shell/contexts/DashboardUserContext";
import { useClientsListAmbientPanel } from "@/app/_features/clients/hooks/useClientsAmbientPanel";
import {
  ClientListHeader,
  ClientFilters,
  ClientListTable,
  ClientsBoardView,
  ClientsGridView,
  AddClientSheet,
  ImportClientsDialog,
  useDisplaySettings,
  type ClientListItem,
  type ViewMode,
  type DisplaySettings,
  type ClientCreateData,
} from "@/app/_features/clients/components";
import {
  importClients,
  exportClientsToCSV,
  createClientWithIntent,
} from "@/app/_features/clients/import-export-actions";
import {
  deleteClient,
  restoreClient,
  permanentlyDeleteClient,
  archiveClient,
  unarchiveClient,
} from "@/app/_features/clients/actions";
import type { ClientViewFilter, ClientViewCounts } from "@/app/_features/workspace/queries";
import { ConfirmDialog } from "@repo/patterns";
import { Calendar, Archive, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import toast from "react-hot-toast";
import { cleanupClientFromRecents } from "@/app/_features/shell/utils/cleanup-recents-favorites";

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
  stageEnteredAt?: string | null;
  // Soft delete / archive fields
  archivedAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
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
  clientFilter?: ClientViewFilter;
  viewCounts?: ClientViewCounts;
}

export function ClientsPageClient({
  clients,
  upcomingMeetings,
  tags,
  companies,
  initialView = "table",
  clientFilter = "active",
  viewCounts = { active: 0, archived: 0, deleted: 0 },
}: ClientsPageClientProps) {
  const user = useDashboardUser();
  const router = useRouter();
  const { settings: displaySettings, updateSettings: setDisplaySettings } = useDisplaySettings(
    initialView as ViewMode | undefined
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [manageTagsDialogOpen, setManageTagsDialogOpen] = useState(false);

  // Delete/restore state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientWithMetrics | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle view filter change
  const handleViewFilterChange = (filter: ClientViewFilter) => {
    const params = new URLSearchParams(window.location.search);
    if (filter === "active") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    router.push(`/studio/clients${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Stage filter
      if (stageFilter !== "all") {
        const clientStage = client.lifecycleStage || "lead";
        if (clientStage !== stageFilter) {
          return false;
        }
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
  }, [clients, stageFilter, selectedCompanyId, selectedTagIds, searchTerm]);

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
      lifecycleStage: client.lifecycleStage || "lead",
      stageEnteredAt: client.stageEnteredAt,
      mrr: client.mrr,
      projectCount: client.projectCount,
      lastContactAt: client.lastContactAt,
      archivedAt: client.archivedAt,
      deletedAt: client.deletedAt,
      deletedBy: client.deletedBy,
    }));
  }, [filteredClients]);

  const hasActiveFilters = stageFilter !== "all" || selectedCompanyId !== null || selectedTagIds.length > 0;

  // Set ambient panel context for clients list
  // Uses filtered clients so insights update when filters change
  useClientsListAmbientPanel(
    filteredClients.map((c) => ({
      id: c.id,
      name: c.name,
      mrr: c.mrr,
      healthScore: c.healthScore,
      lifecycleStage: c.lifecycleStage,
      lastContactAt: c.lastContactAt,
    }))
  );

  const handleClearFilters = () => {
    setStageFilter("all");
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

  const handleCreateClient = async (data: ClientCreateData) => {
    const result = await createClientWithIntent(data);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  const handleInviteToBridge = (clientId: string) => {
    // Navigate to client detail and open invite dialog
    router.push(`/studio/clients/${clientId}?action=invite`);
  };

  const handleCreateProject = (clientId: string) => {
    router.push(`/studio/projects/new?clientId=${clientId}`);
  };

  const handleSendInvoice = (clientId: string) => {
    router.push(`/studio/invoices/new?clientId=${clientId}`);
  };

  const handleDelete = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientToDelete(client);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteClient(clientToDelete.id);
      if (result.success) {
        // Remove from recents and favorites
        cleanupClientFromRecents(clientToDelete.id);
        toast.success(`"${clientToDelete.name}" moved to trash`);
        setDeleteDialogOpen(false);
        setClientToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete client");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    try {
      const result = await restoreClient(clientId);
      if (result.success) {
        toast.success(`"${client?.name}" restored`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to restore client");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handlePermanentDelete = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientToDelete(client);
      setPermanentDeleteDialogOpen(true);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const result = await permanentlyDeleteClient(clientToDelete.id);
      if (result.success) {
        // Remove from recents and favorites (in case it wasn't removed on soft delete)
        cleanupClientFromRecents(clientToDelete.id);
        toast.success(`"${clientToDelete.name}" permanently deleted`);
        setPermanentDeleteDialogOpen(false);
        setClientToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete client");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    try {
      const result = await archiveClient(clientId);
      if (result.success) {
        // Remove from recents and favorites
        cleanupClientFromRecents(clientId);
        toast.success(`"${client?.name}" archived`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to archive client");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleUnarchive = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    try {
      const result = await unarchiveClient(clientId);
      if (result.success) {
        toast.success(`"${client?.name}" unarchived`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to unarchive client");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleMessage = (clientId: string) => {
    router.push(`/studio/clients/${clientId}?tab=messages`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageGreetingHeader page="clients" viewer={user} />
      </div>

      {/* Trash Warning Banner */}
      {clientFilter === "deleted" && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Items in trash will be permanently deleted after 30 days</p>
            <p className="text-muted-foreground mt-1">
              This includes all associated data: projects, invoices, files, messages, and intelligence insights.
            </p>
          </div>
        </div>
      )}

      {/* Archived Info Banner */}
      {clientFilter === "archived" && viewCounts.archived > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <Archive className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Archived clients</p>
            <p className="text-muted-foreground mt-1">
              These clients are hidden from your active list. Unarchive them to restore access.
            </p>
          </div>
        </div>
      )}

      {/* This Week's Meetings Widget - only show for active view */}
      {clientFilter === "active" && upcomingMeetings.length > 0 && (
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

      {/* Toolbar: Filters + Actions on same row */}
      <div className="flex items-center justify-between gap-4">
        {/* Filters (left side) */}
        <ClientFilters
          statusFilter={clientFilter}
          onStatusFilterChange={handleViewFilterChange}
          statusCounts={viewCounts}
          stage={stageFilter}
          onStageChange={setStageFilter}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={setSelectedCompanyId}
          tags={tags}
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
          onManageTags={() => setManageTagsDialogOpen(true)}
          onClearAll={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Actions (right side) */}
        <ClientListHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          displaySettings={displaySettings}
          onDisplaySettingsChange={setDisplaySettings}
          onExport={handleExport}
          onNewClient={() => setNewClientDialogOpen(true)}
          onImport={() => setImportDialogOpen(true)}
          isExporting={isExporting}
        />
      </div>

      {/* Client Views */}
      {displaySettings.viewMode === "table" ? (
        <ClientListTable
          clients={tableClients}
          enabledProperties={displaySettings.enabledProperties}
          viewMode={clientFilter}
          onDelete={handleDelete}
          onMessage={handleMessage}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      ) : displaySettings.viewMode === "board" ? (
        // Board view (Pipeline kanban)
        <ClientsBoardView
          clients={filteredClients.map((client) => ({
            id: client.id,
            name: client.name,
            company: client.company,
            contactEmail: client.contactEmail,
            healthScore: client.healthScore,
            lifecycleStage: client.lifecycleStage || "lead",
            stageEnteredAt: client.stageEnteredAt,
            mrr: client.mrr,
            projectCount: client.projectCount,
            tags: client.tags,
          }))}
          enabledProperties={displaySettings.enabledProperties}
        />
      ) : displaySettings.viewMode === "grid" ? (
        <ClientsGridView
          clients={filteredClients.map((client) => ({
            id: client.id,
            name: client.name,
            contactEmail: client.contactEmail,
            contactPhone: client.contactPhone,
            company: client.company,
            lifecycleStage: client.lifecycleStage || "lead",
            stageEnteredAt: client.stageEnteredAt,
            mrr: client.mrr,
            projectCount: client.projectCount,
            tags: client.tags,
            createdAt: client.createdAt,
            lastContactAt: client.lastContactAt,
          }))}
          enabledProperties={displaySettings.enabledProperties}
        />
      ) : null}

      {/* Add Client Sheet */}
      <AddClientSheet
        open={newClientDialogOpen}
        onOpenChange={setNewClientDialogOpen}
        companies={companies}
        onSubmit={handleCreateClient}
        onInviteToBridge={handleInviteToBridge}
        onCreateProject={handleCreateProject}
        onSendInvoice={handleSendInvoice}
      />

      <ImportClientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />

      {/* Delete Confirmation Dialog (Move to Trash) */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Move "${clientToDelete?.name}" to trash?`}
        description="This client will be moved to trash and permanently deleted after 30 days. All associated data (projects, invoices, files, messages, and intelligence insights) will be deleted. You can restore from Trash within 30 days."
        confirmText="Move to Trash"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        title={`Permanently delete "${clientToDelete?.name}"?`}
        description="This action cannot be undone. All associated data will be permanently deleted including projects, invoices, files, messages, and intelligence insights."
        confirmText="Delete Forever"
        onConfirm={handleConfirmPermanentDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
