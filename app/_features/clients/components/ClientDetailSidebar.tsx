"use client";

import * as React from "react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { UserInfoCard } from "./UserInfoCard";
import { CollapsibleSection } from "./CollapsibleSection";
import { PropertyRow } from "./PropertyRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Building2,
  Tag,
  Calendar,
  Plus,
  CreditCard,
  FileText,
  Clock,
  CircleDot,
  StickyNote,
  ArrowRight,
  Pencil,
  Check,
  X,
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

/** Client lifecycle stages matching the database constraint */
export type ClientLifecycleStage =
  | "lead"
  | "discovery"
  | "pitch"
  | "close"
  | "onboard"
  | "active"
  | "complete"
  | "archived";

export const LIFECYCLE_STAGES: { value: ClientLifecycleStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "discovery", label: "Discovery" },
  { value: "pitch", label: "Pitch" },
  { value: "close", label: "Close" },
  { value: "onboard", label: "Onboard" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

interface ClientDetailSidebarProps {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: ClientCompany | null;
    tags: ClientTag[];
    status: string;
    lifecycleStage?: ClientLifecycleStage | null;
    createdAt: string;
    notes?: string | null;
  };
  bridgeUrl?: string;
  payment?: ClientPayment;
  subscriptions?: ClientSubscription[];
  stats?: { label: string; value: string | number }[];
  onSendMessage?: () => void;
  onPropertyChange?: (property: string, value: string) => Promise<void>;
  onLifecycleStageChange?: (stage: ClientLifecycleStage) => Promise<void>;
  onNotesChange?: (notes: string) => Promise<void>;
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

/** Get status indicator color */
function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === "active") return "bg-success";
  if (statusLower === "inactive" || statusLower === "churned") return "bg-muted-foreground";
  if (statusLower === "pending" || statusLower === "invited") return "bg-warning";
  return "bg-primary";
}

export function ClientDetailSidebar({
  client,
  bridgeUrl,
  payment,
  subscriptions,
  stats,
  onSendMessage,
  onPropertyChange,
  onLifecycleStageChange,
  onNotesChange,
  onAddTag,
  onRemoveTag,
}: ClientDetailSidebarProps) {
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notesValue, setNotesValue] = React.useState(client.notes || "");
  const [isSavingNotes, setIsSavingNotes] = React.useState(false);
  const [isChangingStage, setIsChangingStage] = React.useState(false);

  const handleSaveNotes = async () => {
    if (!onNotesChange) return;
    setIsSavingNotes(true);
    try {
      await onNotesChange(notesValue);
      setIsEditingNotes(false);
    } catch (error) {
      setNotesValue(client.notes || "");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    setNotesValue(client.notes || "");
    setIsEditingNotes(false);
  };

  const handleLifecycleChange = async (value: string) => {
    if (!onLifecycleStageChange) return;
    setIsChangingStage(true);
    try {
      await onLifecycleStageChange(value as ClientLifecycleStage);
    } finally {
      setIsChangingStage(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Section - User Info with generous padding */}
      <div className="px-5 pt-5 pb-4">
        <UserInfoCard
          name={client.name}
          email={client.email}
          phone={client.phone}
          bridgeUrl={bridgeUrl}
          stats={stats}
          onSendMessage={onSendMessage}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 mx-5" />

      {/* Collapsible Sections */}
      <div className="px-5 py-3 space-y-1">
        {/* Properties Section */}
        <CollapsibleSection
          title="Properties"
          icon={<Building2 className="h-4 w-4" />}
        >
          <div className="space-y-0">
            <PropertyRow
              label="Company"
              value={client.company?.name}
              placeholder="Add company"
              icon={<Building2 className="h-4 w-4" />}
              editable
              onSave={
                onPropertyChange
                  ? (value) => onPropertyChange("company", value)
                  : undefined
              }
            />
            <PropertyRow
              label="Status"
              value={
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", getStatusColor(client.status))} />
                  <span className="capitalize">{client.status}</span>
                </span>
              }
              icon={<CircleDot className="h-4 w-4" />}
            />
            {/* Lifecycle Stage */}
            <div className="flex items-center gap-3 py-2 min-h-[36px]">
              <span className="text-muted-foreground/70 shrink-0">
                <ArrowRight className="h-4 w-4" />
              </span>
              <span className="text-[13px] text-muted-foreground min-w-[72px] shrink-0">
                Stage
              </span>
              {onLifecycleStageChange ? (
                <Select
                  value={client.lifecycleStage || "lead"}
                  onValueChange={handleLifecycleChange}
                  disabled={isChangingStage}
                >
                  <SelectTrigger className="h-7 text-[13px] flex-1 border-none bg-transparent hover:bg-muted/50 transition-colors px-2 -ml-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-[13px] text-foreground capitalize">
                  {client.lifecycleStage || "Lead"}
                </span>
              )}
            </div>
            <PropertyRow
              label="Created"
              value={formatDate(client.createdAt)}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </CollapsibleSection>

        {/* Tags Section */}
        <CollapsibleSection
          title="Tags"
          icon={<Tag className="h-4 w-4" />}
          action={
            onAddTag && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onAddTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )
          }
        >
          <div className="flex flex-wrap gap-1.5 py-1">
            {client.tags.length > 0 ? (
              client.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted transition-colors"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}10`,
                  }}
                  onClick={() => onRemoveTag?.(tag.id)}
                >
                  <span
                    className="h-2 w-2 rounded-full mr-1.5"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.label}
                </Badge>
              ))
            ) : (
              <span className="text-[13px] text-muted-foreground/50 italic py-1">No tags</span>
            )}
          </div>
        </CollapsibleSection>

        {/* Payment Section */}
        {payment && (
          <CollapsibleSection
            title="Payment"
            icon={<CreditCard className="h-4 w-4" />}
          >
            <div className="space-y-0">
              <PropertyRow
                label="Total paid"
                value={formatCurrency(payment.totalPaid)}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <PropertyRow
                label="Outstanding"
                value={
                  <span className={cn(
                    payment.outstandingBalance > 0 && "text-warning"
                  )}>
                    {formatCurrency(payment.outstandingBalance)}
                  </span>
                }
                icon={<FileText className="h-4 w-4" />}
              />
              {payment.lastPaymentDate && (
                <PropertyRow
                  label="Last paid"
                  value={formatDate(payment.lastPaymentDate)}
                  icon={<Calendar className="h-4 w-4" />}
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Subscriptions Section */}
        {subscriptions && subscriptions.length > 0 && (
          <CollapsibleSection
            title="Subscriptions"
            icon={<Clock className="h-4 w-4" />}
          >
            <div className="space-y-2 py-1">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between text-[13px] py-1"
                >
                  <span className="text-foreground">{sub.name}</span>
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
          </CollapsibleSection>
        )}

        {/* Notes Section */}
        <CollapsibleSection
          title="Notes"
          icon={<StickyNote className="h-4 w-4" />}
          defaultOpen={false}
          action={
            onNotesChange && !isEditingNotes && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditingNotes(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )
          }
        >
          <div className="py-1">
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this client..."
                  className="min-h-[80px] text-[13px] resize-none"
                  disabled={isSavingNotes}
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelNotes}
                    disabled={isSavingNotes}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isSavingNotes ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  "text-[13px] whitespace-pre-wrap cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 transition-colors",
                  client.notes ? "text-foreground" : "text-muted-foreground/50 italic"
                )}
                onClick={() => onNotesChange && setIsEditingNotes(true)}
              >
                {client.notes || "Click to add notes..."}
              </p>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
