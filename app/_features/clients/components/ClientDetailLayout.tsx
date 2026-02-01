"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { ClientDetailSidebar } from "./ClientDetailSidebar";
import {
  ChevronLeft,
  MessageSquare,
  FileText,
  Receipt,
  ClipboardList,
  FolderOpen,
} from "lucide-react";

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
  portalUrl?: string;
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
  onSendMessage?: () => void;
  onPropertyChange?: (property: string, value: string) => Promise<void>;
  onAddTag?: () => void;
  onRemoveTag?: (tagId: string) => void;
}

const TABS = [
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "files", label: "Files", icon: FileText },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "projects", label: "Projects", icon: FolderOpen },
] as const;

export function ClientDetailLayout({
  client,
  portalUrl,
  payment,
  subscriptions,
  stats,
  defaultTab = "messages",
  messagesContent,
  filesContent,
  invoicesContent,
  formsContent,
  projectsContent,
  onSendMessage,
  onPropertyChange,
  onAddTag,
  onRemoveTag,
}: ClientDetailLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-card">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/clients"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clients
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold">{client.name}</h1>
          </div>
        </div>
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
            {/* Tab Navigation */}
            <div className="border-b px-6">
              <TabsList className="h-12 bg-transparent p-0 gap-4">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-12 px-0 pb-0 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none bg-transparent"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              <TabsContent value="messages" className="h-full m-0 p-6">
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

              <TabsContent value="files" className="h-full m-0 p-6">
                {filesContent || (
                  <EmptyTabState
                    icon={FileText}
                    title="No files shared"
                    description="Share documents and files with this client"
                    action={<Button>Upload file</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="invoices" className="h-full m-0 p-6">
                {invoicesContent || (
                  <EmptyTabState
                    icon={Receipt}
                    title="No invoices"
                    description="Create and send invoices to this client"
                    action={<Button>Create invoice</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="forms" className="h-full m-0 p-6">
                {formsContent || (
                  <EmptyTabState
                    icon={ClipboardList}
                    title="No forms sent"
                    description="Send questionnaires and intake forms"
                    action={<Button>Send form</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="projects" className="h-full m-0 p-6">
                {projectsContent || (
                  <EmptyTabState
                    icon={FolderOpen}
                    title="No projects"
                    description="Create a project for this client"
                    action={<Button>Create project</Button>}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right: Sidebar */}
        <ClientDetailSidebar
          client={client}
          portalUrl={portalUrl}
          payment={payment}
          subscriptions={subscriptions}
          stats={stats}
          onSendMessage={onSendMessage}
          onPropertyChange={onPropertyChange}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
        />
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
