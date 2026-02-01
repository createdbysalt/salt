"use client";

import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { UserInfoCard } from "./UserInfoCard";
import { CollapsibleSection } from "./CollapsibleSection";
import { PropertyRow } from "./PropertyRow";
import {
  Building2,
  Tag,
  Calendar,
  Plus,
  CreditCard,
  FileText,
  Clock,
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

interface ClientPayment {
  lastPaymentDate: string | null;
  totalPaid: number;
  outstandingBalance: number;
}

interface ClientSubscription {
  id: string;
  name: string;
  status: "active" | "cancelled" | "past_due";
  nextBillingDate: string | null;
}

interface ClientDetailSidebarProps {
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
  payment?: ClientPayment;
  subscriptions?: ClientSubscription[];
  stats?: { label: string; value: string | number }[];
  onSendMessage?: () => void;
  onPropertyChange?: (property: string, value: string) => Promise<void>;
  onAddTag?: () => void;
  onRemoveTag?: (tagId: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientDetailSidebar({
  client,
  portalUrl,
  payment,
  subscriptions,
  stats,
  onSendMessage,
  onPropertyChange,
  onAddTag,
  onRemoveTag,
}: ClientDetailSidebarProps) {
  return (
    <div className="w-[280px] border-l bg-card/50 overflow-y-auto">
      <div className="p-4 border-b">
        <UserInfoCard
          name={client.name}
          email={client.email}
          phone={client.phone}
          portalUrl={portalUrl}
          stats={stats}
          onSendMessage={onSendMessage}
        />
      </div>

      <div className="divide-y">
        {/* Properties Section */}
        <CollapsibleSection title="Properties">
          <div className="space-y-1">
            <PropertyRow
              label="Company"
              value={client.company?.name}
              icon={<Building2 className="h-3.5 w-3.5" />}
              editable
              onSave={
                onPropertyChange
                  ? (value) => onPropertyChange("company", value)
                  : undefined
              }
            />
            <PropertyRow
              label="Created"
              value={formatDate(client.createdAt)}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <PropertyRow
              label="Status"
              value={client.status}
              icon={<Clock className="h-3.5 w-3.5" />}
            />
          </div>
        </CollapsibleSection>

        {/* Tags Section */}
        <CollapsibleSection
          title="Tags"
          action={
            onAddTag && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onAddTag}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {client.tags.length > 0 ? (
              client.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}15`,
                  }}
                  onClick={() => onRemoveTag?.(tag.id)}
                >
                  <Tag className="h-3 w-3 mr-1" style={{ color: tag.color }} />
                  {tag.label}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
          </div>
        </CollapsibleSection>

        {/* Payment Section */}
        {payment && (
          <CollapsibleSection title="Payment">
            <div className="space-y-1">
              <PropertyRow
                label="Total paid"
                value={formatCurrency(payment.totalPaid)}
                icon={<CreditCard className="h-3.5 w-3.5" />}
              />
              <PropertyRow
                label="Outstanding"
                value={formatCurrency(payment.outstandingBalance)}
                icon={<FileText className="h-3.5 w-3.5" />}
              />
              {payment.lastPaymentDate && (
                <PropertyRow
                  label="Last payment"
                  value={formatDate(payment.lastPaymentDate)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Subscriptions Section */}
        {subscriptions && subscriptions.length > 0 && (
          <CollapsibleSection title="Subscriptions">
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{sub.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      sub.status === "active"
                        ? "bg-success/10 text-success border-success/20"
                        : sub.status === "past_due"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Notes Section */}
        <CollapsibleSection title="Notes" defaultOpen={false}>
          <div className="text-sm text-muted-foreground">
            {client.notes || "No notes yet"}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
