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
import { deleteClient, archiveClient } from "@/app/_features/clients/actions";
import { ConfirmDialog } from "@repo/patterns";
import toast from "react-hot-toast";
import { useClientDetailAmbientPanel } from "@/app/_features/clients/hooks/useClientsAmbientPanel";
import { DiscoveryInsightsPanel } from "@/app/_features/proposals/components";
import { TrackRecentVisit } from "@/app/_features/shell/components/TrackRecentVisit";
import { extractInsightsFromIntake } from "@/app/_features/proposals/actions/extract-insights";
import type { ProposalExtractionResult } from "@/app/_features/intelligence/types/proposal-intelligence";
import type { IntakeSubmissionData } from "@/app/_features/intake/queries";
import type { KnowledgeItem } from "./knowledge-actions";
import { useState, useMemo, useCallback } from "react";
import { FolderOpen, ChevronRight, Plus, MessageSquare } from "lucide-react";
import { BillingOverviewCard } from "@/app/_features/billing/components";

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
  status: "pending" | "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  amount_cents: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  interval_count: number;
  description: string | null;
  current_period_end: string | null;
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
  bridgeUrl?: string;
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
  intake?: IntakeSubmissionData | null;
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
  bridgeUrl,
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
  intake,
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateRetainer, setShowCreateRetainer] = useState(false);
  const [showCancelRetainer, setShowCancelRetainer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendInvoiceData, setSendInvoiceData] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    amount: string;
  } | null>(null);

  // Insights extraction state
  const [extraction, setExtraction] = useState<ProposalExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Calculate derived metrics for ambient panel
  const clientMetrics = useMemo(() => {
    // Calculate LTV from paid invoices
    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    const ltv = paidInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;

    // Calculate MRR from active subscriptions
    const activeSubscription = subscriptions?.find(
      (s) => s.status === "active" || s.status === "past_due"
    );
    const mrr = payment?.totalPaid ? payment.totalPaid / 12 : 0; // Rough estimate

    // Calculate simple health score based on available data
    let healthScore = 70; // Base score
    const healthFactors: Array<{ factor: string; impact: number; reason: string }> = [];

    // Positive factors
    if (paidInvoices.length > 0) {
      healthScore += 10;
      healthFactors.push({
        factor: "payment_history",
        impact: 10,
        reason: `${paidInvoices.length} paid invoice${paidInvoices.length > 1 ? "s" : ""}`,
      });
    }

    if (projects.length > 0) {
      healthScore += 10;
      healthFactors.push({
        factor: "active_projects",
        impact: 10,
        reason: `${projects.length} active project${projects.length > 1 ? "s" : ""}`,
      });
    }

    // Negative factors
    const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
    if (overdueInvoices.length > 0) {
      healthScore -= 20;
      healthFactors.push({
        factor: "overdue_invoices",
        impact: -20,
        reason: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`,
      });
    }

    if (payment?.outstandingBalance && payment.outstandingBalance > 0) {
      healthScore -= 10;
      healthFactors.push({
        factor: "outstanding_balance",
        impact: -10,
        reason: `$${payment.outstandingBalance.toFixed(0)} outstanding`,
      });
    }

    // Clamp health score between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      ltv,
      mrr,
      healthScore,
      healthFactors,
      projectCount: projects.length,
    };
  }, [invoices, subscriptions, payment, projects]);

  // Calculate billing metrics for overview card
  const billingMetrics = useMemo(() => {
    const unpaidStatuses = ["draft", "sent", "viewed", "overdue", "failed"];
    const unpaidInvoices = invoices.filter((inv) => unpaidStatuses.includes(inv.status));
    const totalOwing = unpaidInvoices.reduce((sum, inv) => sum + inv.amount_cents, 0);

    // Find nearest due date from unpaid invoices
    const dueDates = unpaidInvoices
      .filter((inv) => inv.due_date)
      .map((inv) => new Date(inv.due_date!).getTime())
      .sort((a, b) => a - b);
    const nextDueDate = dueDates.length > 0 ? new Date(dueDates[0]).toISOString() : null;

    // Retainer balance (if active subscription)
    const activeRetainer = subscriptions?.find((s) => s.status === "active");
    const retainerBalance = activeRetainer ? payment?.totalPaid || 0 : null;

    // Auto-pay is enabled if there's an active subscription
    const hasAutoPay = !!activeRetainer;

    return {
      totalOwing,
      retainerBalance: retainerBalance !== null ? retainerBalance * 100 : null, // Convert to cents
      nextDueDate,
      hasAutoPay,
      currency: invoices[0]?.currency || "USD",
    };
  }, [invoices, subscriptions, payment]);

  // Set ambient panel context for client detail view
  useClientDetailAmbientPanel(
    {
      id: client.id,
      name: client.name,
      healthScore: clientMetrics.healthScore,
      healthFactors: clientMetrics.healthFactors,
      ltv: clientMetrics.ltv,
      mrr: clientMetrics.mrr,
      projectCount: clientMetrics.projectCount,
      lastContactAt: null, // Would need to fetch this
      status: client.status,
    },
    [], // upcomingMeetings - would need to pass from server
    [] // recentActivity - would need to pass from server
  );

  // Find active retainer for cancel dialog
  const activeRetainer = invoices.length > 0 ? null : null; // Will be passed properly
  const retainerData = subscriptions?.find(s => s.status === "active" || s.status === "past_due");

  const handleSendMessage = () => {
    if (conversationId) {
      router.push(`/studio/messages/${conversationId}`);
    } else {
      router.push(`/studio/messages/new?clientId=${client.id}`);
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

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteClient(client.id);
      if (result.success) {
        toast.success(`"${client.name}" moved to trash`);
        router.push("/studio/clients");
      } else {
        toast.error(result.error || "Failed to delete client");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveClient = async () => {
    try {
      const result = await archiveClient(client.id);
      if (result.success) {
        toast.success(`"${client.name}" archived`);
        router.push("/studio/clients");
      } else {
        toast.error(result.error || "Failed to archive client");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  // Handle insights extraction
  const handleExtractInsights = useCallback(async () => {
    if (!intake) {
      setExtractionError("No intake data available for this client");
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const result = await extractInsightsFromIntake({
        intakeId: intake.id,
        clientId: client.id,
        includeDiscovery: true,
      });

      if (result.ok && result.data) {
        setExtraction(result.data);
      } else if (!result.ok) {
        setExtractionError(result.message || "Failed to extract insights");
      }
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsExtracting(false);
    }
  }, [intake, client.id]);

  // Render projects content
  const projectsContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </h3>
        <Button size="sm" asChild>
          <Link href={`/studio/projects/new?client=${client.id}`}>
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
            <Link href={`/studio/projects/new?client=${client.id}`}>
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/studio/projects/${project.id}`}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{project.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {project.description || "—"}
                </div>
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
      {/* Billing Overview Hero Card */}
      <BillingOverviewCard
        totalOwing={billingMetrics.totalOwing}
        retainerBalance={billingMetrics.retainerBalance}
        nextDueDate={billingMetrics.nextDueDate}
        hasAutoPay={billingMetrics.hasAutoPay}
        currency={billingMetrics.currency}
      />

      {/* Retainer Section */}
      <ClientRetainerSection
        clientId={client.id}
        retainer={null} // We'll need to pass this properly
        onSetupRetainer={handleSetupRetainer}
        onCancelRetainer={handleCancelRetainer}
      />

      {/* Invoices Section */}
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

  // Render insights content
  const insightsContent = (
    <DiscoveryInsightsPanel
      extraction={extraction}
      isLoading={isExtracting}
      error={extractionError}
      onExtract={intake ? handleExtractInsights : undefined}
    />
  );

  // Messages content - show conversation state
  const messagesContent = conversationId ? (
    <div className="text-center py-12">
      {unreadCount > 0 && (
        <Badge className="mb-4">{unreadCount} unread</Badge>
      )}
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">
        {unreadCount > 0 ? "You have unread messages" : "Conversation active"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {unreadCount > 0
          ? "Continue your conversation with this client"
          : "View your message history with this client"}
      </p>
      <Button onClick={handleSendMessage}>
        {unreadCount > 0 ? "View Messages" : "Open Conversation"}
      </Button>
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Start a conversation with this client
      </p>
      <Button onClick={handleSendMessage}>Start Conversation</Button>
    </div>
  );

  return (
    <>
      <TrackRecentVisit
        item={{
          id: client.id,
          type: "client",
          mode: "studio",
          label: client.name,
          href: `/studio/clients/${client.id}`,
          subtitle: client.company?.name,
        }}
      />
      <ClientDetailLayout
        client={client}
        bridgeUrl={bridgeUrl}
        payment={payment}
        subscriptions={subscriptions}
        stats={stats}
        defaultTab={defaultTab}
        messagesContent={messagesContent}
        filesContent={filesContent}
        invoicesContent={invoicesContent}
        formsContent={formsContent}
        projectsContent={projectsContent}
        insightsContent={insightsContent}
        onSendMessage={handleSendMessage}
        onArchive={handleArchiveClient}
        onDelete={() => setShowDeleteDialog(true)}
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

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Move "${client.name}" to trash?`}
        description="This client will be moved to trash and permanently deleted after 30 days. All associated data (projects, invoices, files, messages, and intelligence insights) will be deleted. You can restore from Trash within 30 days."
        confirmText="Move to Trash"
        onConfirm={handleDeleteClient}
        loading={isDeleting}
        variant="destructive"
      />
    </>
  );
}
