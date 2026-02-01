"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { ClientDetailLayout } from "@/app/_features/clients/components";
import { ClientUsersSection } from "./ClientUsersSection";
import { ClientBillingSection } from "./ClientBillingSection";
import { ClientRetainerSection } from "./ClientRetainerSection";
import { ClientKnowledgeSection } from "./ClientKnowledgeSection";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { SendInvoiceDialog } from "./SendInvoiceDialog";
import { CreateRetainerModal } from "./CreateRetainerModal";
import { CancelRetainerDialog } from "./CancelRetainerDialog";
import type { KnowledgeItem } from "./knowledge-actions";
import { useState } from "react";
import { FolderOpen, ChevronRight, Plus } from "lucide-react";

interface ClientCompany {
  id: string;
  name: string;
}

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface ClientUser {
  id: string;
  email: string;
  role: string;
  user_id: string;
  created_at: string;
  status?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  description: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "canceled" | "failed";
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
}

interface Retainer {
  id: string;
  status: "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  amount_cents: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  interval_count: number;
  description: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

interface ClientDetailPageClientProps {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: ClientCompany | null;
    tags: ClientTag[];
    status: string;
    createdAt: string;
    notes?: string | null;
  };
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
  projects: Project[];
  invoices: Invoice[];
  clientUsers: ClientUser[];
  knowledgeItems: KnowledgeItem[];
  unreadCount: number;
  conversationId: string | null;
  defaultTab?: string;
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatRetainerInterval(interval: string, intervalCount: number): string {
  const labels: Record<string, string> = {
    day: intervalCount === 1 ? "day" : "days",
    week: intervalCount === 1 ? "week" : "weeks",
    month: intervalCount === 1 ? "month" : "months",
    year: intervalCount === 1 ? "year" : "years",
  };
  const label = labels[interval] || interval;
  return intervalCount === 1 ? label : `${intervalCount} ${label}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientDetailPageClient({
  client,
  portalUrl,
  payment,
  subscriptions,
  stats,
  projects,
  invoices,
  clientUsers,
  knowledgeItems,
  unreadCount,
  conversationId,
  defaultTab = "projects",
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateRetainer, setShowCreateRetainer] = useState(false);
  const [showCancelRetainer, setShowCancelRetainer] = useState(false);
  const [sendInvoiceData, setSendInvoiceData] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    amount: string;
  } | null>(null);

  // Find active retainer for cancel dialog
  const activeRetainer = invoices.length > 0 ? null : null; // Will be passed properly
  const retainerData = subscriptions?.find(s => s.status === "active" || s.status === "past_due");

  const handleSendMessage = () => {
    if (conversationId) {
      router.push(`/dashboard/messages/${conversationId}`);
    } else {
      router.push(`/dashboard/messages/new?clientId=${client.id}`);
    }
  };

  const handleCreateInvoice = () => {
    setShowCreateInvoice(true);
  };

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      setSendInvoiceData({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: formatCurrency(invoice.amount_cents, invoice.currency),
      });
    }
  };

  const handleSetupRetainer = () => {
    setShowCreateRetainer(true);
  };

  const handleCancelRetainer = () => {
    setShowCancelRetainer(true);
  };

  // Render projects content
  const projectsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </h3>
        <Button size="sm" asChild>
          <Link href={`/dashboard/projects/new?client=${client.id}`}>
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a project to start working with this client
          </p>
          <Button asChild>
            <Link href={`/dashboard/projects/new?client=${client.id}`}>
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{project.name}</div>
                {project.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {project.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="outline" className="capitalize">
                  {project.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // Render invoices content (billing tab)
  const invoicesContent = (
    <div className="space-y-6">
      <ClientRetainerSection
        clientId={client.id}
        retainer={null} // We'll need to pass this properly
        onSetupRetainer={handleSetupRetainer}
        onCancelRetainer={handleCancelRetainer}
      />
      <ClientBillingSection
        clientId={client.id}
        invoices={invoices}
        onCreateInvoice={handleCreateInvoice}
        onSendInvoice={handleSendInvoice}
      />
    </div>
  );

  // Render files content (knowledge base)
  const filesContent = (
    <ClientKnowledgeSection
      clientId={client.id}
      knowledgeItems={knowledgeItems}
    />
  );

  // Render forms content (users/team)
  const formsContent = (
    <ClientUsersSection
      clientId={client.id}
      clientUsers={clientUsers}
    />
  );

  // Messages content - show unread badge if any
  const messagesContent = unreadCount > 0 ? (
    <div className="text-center py-12">
      <Badge className="mb-4">{unreadCount} unread</Badge>
      <h3 className="font-medium mb-1">You have unread messages</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Continue your conversation with this client
      </p>
      <Button onClick={handleSendMessage}>View Messages</Button>
    </div>
  ) : undefined;

  return (
    <>
      <ClientDetailLayout
        client={client}
        portalUrl={portalUrl}
        payment={payment}
        subscriptions={subscriptions}
        stats={stats}
        defaultTab={defaultTab}
        messagesContent={messagesContent}
        filesContent={filesContent}
        invoicesContent={invoicesContent}
        formsContent={formsContent}
        projectsContent={projectsContent}
        onSendMessage={handleSendMessage}
      />

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        clientId={client.id}
      />

      {sendInvoiceData && (
        <SendInvoiceDialog
          isOpen={!!sendInvoiceData}
          onClose={() => setSendInvoiceData(null)}
          invoiceId={sendInvoiceData.invoiceId}
          invoiceNumber={sendInvoiceData.invoiceNumber}
          amount={sendInvoiceData.amount}
        />
      )}

      <CreateRetainerModal
        isOpen={showCreateRetainer}
        onClose={() => setShowCreateRetainer(false)}
        clientId={client.id}
      />

      {retainerData && (
        <CancelRetainerDialog
          isOpen={showCancelRetainer}
          onClose={() => setShowCancelRetainer(false)}
          subscriptionId={retainerData.id}
          amount="$0" // Will need proper data
          interval="month"
          periodEndDate={retainerData.nextBillingDate || ""}
        />
      )}
    </>
  );
}
