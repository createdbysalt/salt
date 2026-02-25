"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Plus,
  User,
  MessageSquare,
  CalendarDays,
  FileText,
  Receipt,
  FolderOpen,
  Archive,
  Trash2,
} from "lucide-react";
import {
  Button,
  Separator,
  SidebarTrigger,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { toast } from "sonner";
import { FavoriteButton } from "@/app/_features/shell/components/FavoriteButton";
import { archiveClient } from "@/app/actions/clients/archive-client";
import { trashClient } from "@/app/actions/clients/trash-client";
import type { ClientDetail } from "@/app/actions/clients/get-client";

interface ClientDetailHeaderProps {
  client: ClientDetail;
}

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "communication", label: "Communication", icon: MessageSquare },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "files", label: "Files", icon: FileText },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "projects", label: "Projects", icon: FolderOpen },
] as const;

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";

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
      router.push("/studio/clients");
    }
  };

  const handleTrash = async () => {
    const result = await trashClient(client.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Client moved to trash");
      router.push("/studio/clients");
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
          <Button size="xs" variant="secondary" className="px-4">
            <Plus className="size-3" />
            Client
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center border-b px-4 py-2">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => value && setActiveTab(value)}
          size="sm"
          variant="outline"
          spacing={2}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <ToggleGroupItem
                key={tab.id}
                value={tab.id}
                className="text-xs px-3 py-1 h-auto gap-1.5"
              >
                <Icon className="size-3.5" />
                {tab.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Icons */}
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-1">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleArchive}
                >
                  <Archive className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Archive client</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={handleTrash}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Move to trash</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </>
  );
}
