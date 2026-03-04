"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Plus,
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  Folder,
  Receipt,
  ListTodo,
  Settings,
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
import { toast } from "sonner";
import { FavoriteButton } from "@/app/_features/shell/components/FavoriteButton";
import { removeFromFavorites } from "@/app/_features/shell/utils/favorites-storage";
import { removeFromAllRecents } from "@/app/_features/shell/utils/recents-storage";
import type { ProjectBasic } from "@/app/_features/projects/queries";

interface ProjectDetailHeaderProps {
  project: ProjectBasic;
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "communication", label: "Messages", icon: MessageSquare },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "files", label: "Files", icon: Folder },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // TODO: Add archived/deleted status to ProjectBasic type
  const isArchived = false;
  const isDeleted = false;

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/studio/projects/${project.id}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleArchive = async () => {
    // TODO: Implement archive project action
    toast.success("Project archived");
    removeFromFavorites(project.id);
    removeFromAllRecents(project.id);
    router.refresh();
  };

  const handleUnarchive = async () => {
    // TODO: Implement unarchive project action
    toast.success("Project unarchived");
    router.refresh();
  };

  const handleTrash = async () => {
    // TODO: Implement trash project action
    toast.success("Project moved to trash");
    removeFromFavorites(project.id);
    removeFromAllRecents(project.id);
    router.refresh();
  };

  const handleRestore = async () => {
    // TODO: Implement restore project action
    toast.success("Project restored");
    router.refresh();
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
              href="/studio/projects"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Projects
            </Link>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{project.name}</span>
          </nav>
        </div>

        <div className="ml-auto">
          <Button size="xs" variant="secondary" className="px-4">
            <Plus className="size-3" />
            Project
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
                id: project.id,
                type: "project",
                primaryMode: "studio",
                label: project.name,
                href: `/studio/projects/${project.id}`,
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
                <TooltipContent side="bottom">Unarchive project</TooltipContent>
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
                <TooltipContent side="bottom">Archive project</TooltipContent>
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
                <TooltipContent side="bottom">Restore project</TooltipContent>
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
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be moved to the archived list.
              You can restore it anytime.
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
            <AlertDialogTitle>Move project to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong className="text-foreground">{project.name}</strong> to trash?
              This project will be permanently deleted after 30 days.
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
            <AlertDialogTitle>Unarchive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be restored to your active projects list.
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
            <AlertDialogTitle>Restore this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{project.name}</strong> will be restored from trash to your projects list.
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
    </>
  );
}
