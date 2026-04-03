"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Plus,
  User,
  MessageSquare,
  CalendarDays,
  Folder,
  Receipt,
  FolderOpen,
  Users,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Separator,
  SidebarTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { AddClientSheet, type ClientCreateData } from "@/app/_features/clients/components";
import { createClientWithIntent, getCompanies } from "@/app/_features/clients/import-export-actions";
import { toast } from "sonner";
import { FavoriteButton } from "@/app/_features/shell/components/FavoriteButton";
import { removeFromFavorites } from "@/app/_features/shell/utils/favorites-storage";
import { removeFromAllRecents } from "@/app/_features/shell/utils/recents-storage";
import { archiveClient } from "@/app/actions/clients/archive-client";
import { unarchiveClient } from "@/app/actions/clients/unarchive-client";
import { trashClient } from "@/app/actions/clients/trash-client";
import { restoreClient } from "@/app/actions/clients/restore-client";
import type { ClientDetail } from "@/app/actions/clients/get-client";

interface ClientDetailHeaderProps {
  client: ClientDetail;
}

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "communication", label: "Messages", icon: MessageSquare },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "files", label: "Files", icon: Folder },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "people", label: "People", icon: Users },
] as const;

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Add Client Sheet state
  const [addClientSheetOpen, setAddClientSheetOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  // Fetch companies when sheet opens
  const handleOpenAddClientSheet = async () => {
    const fetchedCompanies = await getCompanies();
    setCompanies(fetchedCompanies);
    setAddClientSheetOpen(true);
  };

  const isArchived = !!client.archivedAt;
  const isDeleted = !!client.deletedAt;

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/studio/clients/${client.id}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleArchive = async () => {
    const result = await archiveClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client archived");
      // Remove from favorites and recents since it's now archived
      removeFromFavorites(client.id);
      removeFromAllRecents(client.id);
      router.refresh();
    }
  };

  const handleUnarchive = async () => {
    const result = await unarchiveClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client unarchived");
      router.refresh();
    }
  };

  const handleTrash = async () => {
    const result = await trashClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client moved to trash");
      // Remove from favorites and recents since it's now deleted
      removeFromFavorites(client.id);
      removeFromAllRecents(client.id);
      router.refresh();
    }
  };

  const handleRestore = async () => {
    const result = await restoreClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client restored");
      router.refresh();
    }
  };

  return (
    <>
      {/* Breadcrumb Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 shrink-0"
          />
          <nav className="flex items-center gap-1 text-sm min-w-0">
            <Link
              href="/studio/clients"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Clients
            </Link>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{client.name}</span>
          </nav>
        </div>

        <div className="ml-auto">
          <Button size="xs" variant="secondary" className="px-4" onClick={handleOpenAddClientSheet}>
            <Plus className="size-3" />
            Client
          </Button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex items-center border-b px-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          className="flex-1"
        >
          <TabsList variant="line" className="h-10">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-sm gap-1.5 px-3"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Action Icons */}
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-0.5">
            <FavoriteButton
              item={{
                id: client.id,
                type: "client",
                primaryMode: "studio",
                label: client.name,
                href: `/studio/clients/${client.id}`,
              }}
              size="sm"
            />

            {/* Archive / Unarchive Button */}
            {isArchived ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowUnarchiveDialog(true)}
                  >
                    <ArchiveRestore className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Unarchive client</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    <Archive className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Archive client</TooltipContent>
              </Tooltip>
            )}

            {/* Trash / Restore Button */}
            {isDeleted ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowRestoreDialog(true)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Restore client</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Move to trash</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be moved to the archived list.
              You can restore them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move client to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong className="text-foreground">{client.name}</strong> to trash?
              This client will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleTrash}>
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be restored to your active clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>
              Unarchive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{client.name}</strong> will be restored from trash to your clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Client Sheet */}
      <AddClientSheet
        open={addClientSheetOpen}
        onOpenChange={setAddClientSheetOpen}
        companies={companies}
        onSubmit={async (data: ClientCreateData) => {
          const result = await createClientWithIntent(data);
          return result;
        }}
        onInviteToBridge={(clientId) => {
          toast.success("Bridge invite will be sent");
        }}
        onCreateProject={(clientId) => {
          router.push(`/studio/projects/new?clientId=${clientId}`);
        }}
        onSendInvoice={(clientId) => {
          router.push(`/studio/billing/invoices/new?clientId=${clientId}`);
        }}
      />
    </>
  );
}
