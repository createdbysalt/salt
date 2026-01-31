"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { ClientUsersSection } from "./ClientUsersSection";
import { ClientBillingSection } from "./ClientBillingSection";
import { ClientRetainerSection } from "./ClientRetainerSection";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { SendInvoiceDialog } from "./SendInvoiceDialog";
import { CreateRetainerModal } from "./CreateRetainerModal";
import { CancelRetainerDialog } from "./CancelRetainerDialog";
import { ClientKnowledgeSection } from "./ClientKnowledgeSection";
import type { KnowledgeItem } from "./knowledge-actions";

type ClientUser = {
  id: string;
  email: string;
  role: string;
  user_id: string;
  created_at: string;
  status?: string;
};

type Invoice = {
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
};

type Retainer = {
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
};

type ClientDetailTabsProps = {
  clientId: string;
  clientUsers: ClientUser[];
  invoices: Invoice[];
  retainer: Retainer | null;
  knowledgeItems: KnowledgeItem[];
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function ClientDetailTabs({
  clientId,
  clientUsers,
  invoices,
  retainer,
  knowledgeItems,
}: ClientDetailTabsProps) {
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateRetainer, setShowCreateRetainer] = useState(false);
  const [showCancelRetainer, setShowCancelRetainer] = useState(false);
  const [sendInvoiceData, setSendInvoiceData] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    amount: string;
  } | null>(null);

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

  // Helper functions for formatting
  const formatRetainerInterval = (interval: string, intervalCount: number): string => {
    const labels: Record<string, string> = {
      day: intervalCount === 1 ? "day" : "days",
      week: intervalCount === 1 ? "week" : "weeks",
      month: intervalCount === 1 ? "month" : "months",
      year: intervalCount === 1 ? "year" : "years",
    };
    const label = labels[interval] || interval;
    return intervalCount === 1 ? label : `${intervalCount} ${label}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Tabs defaultValue="users" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <ClientUsersSection clientId={clientId} clientUsers={clientUsers} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <ClientKnowledgeSection
            clientId={clientId}
            knowledgeItems={knowledgeItems}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-6">
          <ClientRetainerSection
            clientId={clientId}
            retainer={retainer}
            onSetupRetainer={handleSetupRetainer}
            onCancelRetainer={handleCancelRetainer}
          />
          <ClientBillingSection
            clientId={clientId}
            invoices={invoices}
            onCreateInvoice={handleCreateInvoice}
            onSendInvoice={handleSendInvoice}
          />
        </TabsContent>
      </Tabs>

      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        clientId={clientId}
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
        clientId={clientId}
      />

      {retainer && (
        <CancelRetainerDialog
          isOpen={showCancelRetainer}
          onClose={() => setShowCancelRetainer(false)}
          subscriptionId={retainer.id}
          amount={formatCurrency(retainer.amount_cents, retainer.currency)}
          interval={formatRetainerInterval(retainer.interval, retainer.interval_count)}
          periodEndDate={formatDate(retainer.current_period_end)}
        />
      )}
    </>
  );
}
