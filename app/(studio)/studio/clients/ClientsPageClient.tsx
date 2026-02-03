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
  NewClientDialog,
  ImportClientsDialog,
  useDisplaySettings,
  type ClientListItem,
  type ViewMode,
  type DisplaySettings,
} from "@/app/_features/clients/components";
import {
  importClients,
  exportClientsToCSV,
  createClient,
} from "@/app/_features/clients/import-export-actions";
import { Calendar } from "lucide-react";
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
  stageEnteredAt?: string | null;
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

      {/* Toolbar: Filters + Actions on same row */}
      <div className="flex items-center justify-between gap-4">
        {/* Filters (left side) */}
        <ClientFilters
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
          onDelete={handleDelete}
          onMessage={handleMessage}
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
