"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { ClientDetailSidebar } from "./ClientDetailSidebar";
import { ClientDetailsMobileView } from "./ClientDetailsMobileView";
import {
  MessageSquare,
  FileText,
  Receipt,
  ClipboardList,
  FolderOpen,
  User,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Archive,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { FavoriteButton } from "@/app/_features/shell/components/FavoriteButton";

interface ClientCompany {
  id: string;
  name: string;
}

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: ClientCompany | null;
  tags: ClientTag[];
  status: string;
  createdAt: string;
  notes?: string | null;
}

interface ClientDetailLayoutProps {
  client: ClientData;
  tableUrl?: string;
  payment?: {
    lastPaymentDate: string | null;
    totalPaid: number;
    outstandingBalance: number;
  };
  subscriptions?: {
    id: string;
    name: string;
    status: "active" | "cancelled" | "past_due";
    nextBillingDate: string | null;
  }[];
  stats?: { label: string; value: string | number }[];
  defaultTab?: string;
  messagesContent?: React.ReactNode;
  filesContent?: React.ReactNode;
  invoicesContent?: React.ReactNode;
  formsContent?: React.ReactNode;
  projectsContent?: React.ReactNode;
  insightsContent?: React.ReactNode;
  onSendMessage?: () => void;
  onPropertyChange?: (property: string, value: string) => Promise<void>;
  onAddTag?: () => void;
  onRemoveTag?: (tagId: string) => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

// Details tab only shows on mobile/tablet
const DETAILS_TAB = { id: "details", label: "Details", icon: User, mobileOnly: true } as const;

const TABS = [
  { id: "messages", label: "Messages", icon: MessageSquare, mobileOnly: false },
  { id: "files", label: "Files", icon: FileText, mobileOnly: false },
  { id: "invoices", label: "Invoices", icon: Receipt, mobileOnly: false },
  { id: "forms", label: "Forms", icon: ClipboardList, mobileOnly: false },
  { id: "projects", label: "Projects", icon: FolderOpen, mobileOnly: false },
  { id: "insights", label: "Insights", icon: Sparkles, mobileOnly: false },
] as const;

// Combined tabs with Details first (for mobile)
const ALL_TABS = [DETAILS_TAB, ...TABS] as const;

export function ClientDetailLayout({
  client,
  tableUrl,
  payment,
  subscriptions,
  stats,
  defaultTab = "details",
  messagesContent,
  filesContent,
  invoicesContent,
  formsContent,
  projectsContent,
  insightsContent,
  onSendMessage,
  onPropertyChange,
  onAddTag,
  onRemoveTag,
  onArchive,
  onDelete,
}: ClientDetailLayoutProps) {
  // On desktop, default to messages since Details is in sidebar
  // On mobile, default to details tab
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      return defaultTab === "details" ? "messages" : defaultTab;
    }
    return defaultTab;
  });

  const sidebarContent = (
    <ClientDetailSidebar
      client={client}
      tableUrl={tableUrl}
      payment={payment}
      subscriptions={subscriptions}
      stats={stats}
      onSendMessage={onSendMessage}
      onPropertyChange={onPropertyChange}
      onAddTag={onAddTag}
      onRemoveTag={onRemoveTag}
    />
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between px-4 sm:px-6 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/people"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Clients
          </Link>
          <span className="text-sm text-muted-foreground/60">›</span>
          <span className="text-sm font-medium truncate">{client.name}</span>
          <FavoriteButton
            item={{
              id: client.id,
              type: "client",
              primaryMode: "studio",
              label: client.name,
              href: `/people/${client.id}`,
              subtitle: client.company?.name,
            }}
            size="sm"
          />
        </div>
        {(onArchive || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive client
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Move to trash
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tabs Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            {/* Tab Navigation - using line variant for clean underline style */}
            <div className="px-4 sm:px-6 border-b border-border/50">
              <TabsList variant="line" className="h-11">
                {ALL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  // Details tab only shows on mobile/tablet (lg:hidden)
                  const visibilityClass = tab.mobileOnly ? "lg:hidden" : "";
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={visibilityClass}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {/* Details tab content - mobile only */}
              <TabsContent value="details" className="h-full m-0 lg:hidden">
                <ClientDetailsMobileView
                  client={client}
                  tableUrl={tableUrl}
                  payment={payment}
                  subscriptions={subscriptions}
                  stats={stats}
                  onSendMessage={onSendMessage}
                />
              </TabsContent>

              <TabsContent value="messages" className="h-full m-0 p-4 sm:p-6">
                {messagesContent || (
                  <EmptyTabState
                    icon={MessageSquare}
                    title="No messages yet"
                    description="Start a conversation with this client"
                    action={
                      onSendMessage && (
                        <Button onClick={onSendMessage}>Send message</Button>
                      )
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="files" className="h-full m-0 p-4 sm:p-6">
                {filesContent || (
                  <EmptyTabState
                    icon={FileText}
                    title="No files shared"
                    description="Share documents and files with this client"
                    action={<Button>Upload file</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="invoices" className="h-full m-0 p-4 sm:p-6">
                {invoicesContent || (
                  <EmptyTabState
                    icon={Receipt}
                    title="No invoices"
                    description="Create and send invoices to this client"
                    action={<Button>Create invoice</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="forms" className="h-full m-0 p-4 sm:p-6">
                {formsContent || (
                  <EmptyTabState
                    icon={ClipboardList}
                    title="No forms sent"
                    description="Send questionnaires and intake forms"
                    action={<Button>Send form</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="projects" className="h-full m-0 p-4 sm:p-6">
                {projectsContent || (
                  <EmptyTabState
                    icon={FolderOpen}
                    title="No projects"
                    description="Create a project for this client"
                    action={<Button>Create project</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="insights" className="h-full m-0 p-4 sm:p-6">
                {insightsContent || (
                  <EmptyTabState
                    icon={Sparkles}
                    title="No insights yet"
                    description="Extract insights from intake responses and discovery data"
                    action={<Button>Extract Insights</Button>}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right: Sidebar - floating card style, hidden on mobile/tablet */}
        <div className="hidden lg:block w-[320px] shrink-0 p-4 pl-0">
          <div className="h-full rounded-xl border border-border/60 bg-card/50 overflow-hidden">
            {sidebarContent}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component for tabs
function EmptyTabState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action}
    </div>
  );
}
