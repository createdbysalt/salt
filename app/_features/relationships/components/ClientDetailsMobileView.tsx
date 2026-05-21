"use client";

import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import {
  Building2,
  Tag,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  MessageSquare,
  CircleDot,
} from "lucide-react";
import { cn } from "@repo/utils";

interface ClientCompany {
  id: string;
  name: string;
}

interface ClientTag {
  id: string;
  label: string;
  color: string;
}

interface ClientDetailsMobileViewProps {
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
  onSendMessage?: () => void;
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Get avatar background using semantic colors - Linear style */
function getAvatarColorClass(_name: string): string {
  // Linear-style: consistent muted monochrome avatars
  // This is more professional and avoids misleading color associations
  // (e.g., chart-4 is red/destructive which implies errors)
  return "salt-avatar-neutral";
}

/** Get status indicator color */
function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === "active") return "bg-success";
  if (statusLower === "inactive" || statusLower === "churned") return "bg-muted-foreground";
  if (statusLower === "pending" || statusLower === "invited") return "bg-warning";
  return "bg-primary";
}

export function ClientDetailsMobileView({
  client,
  tableUrl,
  payment,
  subscriptions,
  stats,
  onSendMessage,
}: ClientDetailsMobileViewProps) {
  const colorClass = getAvatarColorClass(client.name);

  return (
    <div className="p-4 sm:p-5 space-y-5">
      {/* Client Header Card */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <Avatar className="h-14 w-14 mb-3">
            <AvatarFallback className={cn(colorClass, "text-base font-semibold")}>
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-base font-semibold leading-tight">{client.name}</h2>
          {client.email && (
            <p className="text-[13px] text-muted-foreground mt-0.5">{client.email}</p>
          )}
        </div>

        {/* Primary Action */}
        {onSendMessage && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={onSendMessage}
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Button>
        )}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border/50">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-1">
                <div className="text-base font-semibold tabular-nums">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Secondary Actions */}
        <div className="flex gap-2 mt-4">
          {client.phone && (
            <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" asChild>
              <a href={`tel:${client.phone}`}>
                <Phone className="h-4 w-4" />
                Call
              </a>
            </Button>
          )}
          {tableUrl && (
            <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" asChild>
              <a href={tableUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Bridge
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Properties */}
      <div className="space-y-2.5">
        <h3 className="text-[13px] font-medium text-muted-foreground px-1">
          Properties
        </h3>
        <div className="rounded-xl border border-border/60 bg-card/50">
          <div className="divide-y divide-border/30">
            <MobilePropertyRow
              icon={<Building2 className="h-4 w-4" />}
              label="Company"
              value={client.company?.name}
              placeholder="Not set"
            />
            <MobilePropertyRow
              icon={<CircleDot className="h-4 w-4" />}
              label="Status"
              value={
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", getStatusColor(client.status))} />
                  <span className="capitalize">{client.status}</span>
                </span>
              }
            />
            <MobilePropertyRow
              icon={<Calendar className="h-4 w-4" />}
              label="Created"
              value={formatDate(client.createdAt)}
            />
            {client.email && (
              <MobilePropertyRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={client.email}
              />
            )}
            {client.phone && (
              <MobilePropertyRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={client.phone}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {client.tags.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-muted-foreground px-1">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2 px-1">
            {client.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: tag.color,
                  backgroundColor: `${tag.color}10`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full mr-1.5"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Payment */}
      {payment && (
        <div className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-muted-foreground px-1">
            Payment
          </h3>
          <div className="rounded-xl border border-border/60 bg-card/50">
            <div className="divide-y divide-border/30">
              <MobilePropertyRow
                icon={<CreditCard className="h-4 w-4" />}
                label="Total paid"
                value={formatCurrency(payment.totalPaid)}
              />
              <MobilePropertyRow
                icon={<FileText className="h-4 w-4" />}
                label="Outstanding"
                value={
                  <span className={cn(payment.outstandingBalance > 0 && "text-warning")}>
                    {formatCurrency(payment.outstandingBalance)}
                  </span>
                }
              />
              {payment.lastPaymentDate && (
                <MobilePropertyRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Last payment"
                  value={formatDate(payment.lastPaymentDate)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions */}
      {subscriptions && subscriptions.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-muted-foreground px-1">
            Subscriptions
          </h3>
          <div className="rounded-xl border border-border/60 bg-card/50">
            <div className="divide-y divide-border/30">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-[13px] text-foreground">{sub.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] capitalize",
                      sub.status === "active"
                        ? "bg-success/10 text-success border-success/20"
                        : sub.status === "past_due"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {sub.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-muted-foreground px-1">
            Notes
          </h3>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-[13px] text-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile-optimized property row */
function MobilePropertyRow({
  icon,
  label,
  value,
  placeholder = "Not set",
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  placeholder?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted-foreground/70 shrink-0">
        {icon}
      </span>
      <span className="text-[13px] text-muted-foreground min-w-[72px] shrink-0">
        {label}
      </span>
      <span className={cn(
        "text-[13px] flex-1 text-right",
        hasValue ? "text-foreground" : "text-muted-foreground/50 italic"
      )}>
        {hasValue ? value : placeholder}
      </span>
    </div>
  );
}
