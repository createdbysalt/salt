"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Clock, Mail, PenTool, Receipt, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, Switch } from "@repo/ui";
import {
  AccountRow,
  InlineDatePicker,
  InlineEditableText,
  InlineMoney,
  InlineSelect,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { TagEditor } from "@/app/_features/memory/components/TagEditor";
import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";
import type { FileDetailViewModel, FileDocumentType, FileLifecycleStatus, FileCTAType } from "../detail-types";
import { ASSET_KIND_LABEL, FILE_CATEGORY_LABEL, relativeDays, type AssetKind, type FileCategory } from "../data";
import { fileLinkHref } from "../utils/link-display";
import {
  FILE_DOCUMENT_TYPE_LABEL,
  FILE_LIFECYCLE_STATUS_LABEL,
} from "../utils/detail-mapper";

function cleanSummary(raw: string | undefined): string | null {
  if (!raw) return null;

  // Strip markdown: bold, italic, bullets, headers
  let clean = raw
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/\*([^*]+)\*/g, "$1") // *italic*
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/_([^_]+)_/g, "$1") // _italic_
    .replace(/^[-*•]\s+/gm, "") // bullet points
    .replace(/^#+\s+/gm, "") // headers
    .replace(/\n+/g, " ") // newlines to spaces
    .trim();

  // Limit to ~200 chars, end at sentence if possible
  if (clean.length > 200) {
    const truncated = clean.slice(0, 200);
    const lastPeriod = truncated.lastIndexOf(".");
    if (lastPeriod > 100) {
      clean = truncated.slice(0, lastPeriod + 1);
    } else {
      clean = truncated.trim() + "…";
    }
  }

  return clean || null;
}

type FileOverviewTabProps = {
  file: FileDetailViewModel;
  onFieldUpdate?: (field: string, value: unknown) => Promise<void>;
};

const DOCUMENT_TYPE_OPTIONS = (
  Object.entries(FILE_DOCUMENT_TYPE_LABEL) as [FileDocumentType, string][]
).map(([value, label]) => ({ value, label }));

const LIFECYCLE_STATUS_OPTIONS = (
  Object.entries(FILE_LIFECYCLE_STATUS_LABEL) as [FileLifecycleStatus, string][]
).map(([value, label]) => ({ value, label }));

const CATEGORY_OPTIONS = (
  Object.entries(FILE_CATEGORY_LABEL) as [FileCategory, string][]
).map(([value, label]) => ({ value, label }));

const KIND_OPTIONS = (
  Object.entries(ASSET_KIND_LABEL) as [AssetKind, string][]
).map(([value, label]) => ({ value, label }));

// files.currency CHECK is the uppercase ISO-4217 canon
// (20260703180000) — options come straight from the registry vocabulary,
// labeled with the code itself.
const CURRENCY_OPTIONS = getVocabularyOptions("currency").map((o) => ({
  value: o.value,
  label: o.value,
}));

const CTA_ICONS: Record<FileCTAType, React.ComponentType<{ className?: string }>> = {
  send: Send,
  request_signature: PenTool,
  follow_up: Bell,
  create_invoice: Receipt,
  link_person: Mail,
  link_org: Mail,
  link_work: Mail,
};

export function FileOverviewTab({ file, onFieldUpdate }: FileOverviewTabProps) {
  const [name, setName] = useState(file.title);
  const [description, setDescription] = useState(file.description ?? "");
  const [kind, setKind] = useState<AssetKind>(file.kind);
  const [linkUrl, setLinkUrl] = useState(file.url ?? "");
  const [category, setCategory] = useState<FileCategory>(file.category);
  const [documentType, setDocumentType] = useState<FileDocumentType | undefined>(
    file.documentType,
  );
  const [lifecycleStatus, setLifecycleStatus] = useState<FileLifecycleStatus | undefined>(
    file.lifecycleStatus,
  );
  const [dueDate, setDueDate] = useState<string | null>(file.dueDate ?? null);
  const [expiryDate, setExpiryDate] = useState<string | null>(file.expiryDate ?? null);
  const [signedDate, setSignedDate] = useState<string | null>(file.signedDate ?? null);
  const [followUpDate, setFollowUpDate] = useState<string | null>(file.followUpDate ?? null);
  const [totalAmountCents, setTotalAmountCents] = useState<number | null>(
    file.totalAmountCents ?? null,
  );
  const [currency, setCurrency] = useState(file.currency ?? "USD");
  const [isOperatorAsset, setIsOperatorAsset] = useState(file.isOperatorAsset);

  useEffect(() => {
    setName(file.title);
    setDescription(file.description ?? "");
    setKind(file.kind);
    setLinkUrl(file.url ?? "");
    setCategory(file.category);
    setDocumentType(file.documentType);
    setLifecycleStatus(file.lifecycleStatus);
    setDueDate(file.dueDate ?? null);
    setExpiryDate(file.expiryDate ?? null);
    setSignedDate(file.signedDate ?? null);
    setFollowUpDate(file.followUpDate ?? null);
    setTotalAmountCents(file.totalAmountCents ?? null);
    setCurrency(file.currency ?? "USD");
    setIsOperatorAsset(file.isOperatorAsset);
  }, [file]);

  async function saveField(field: string, value: unknown) {
    if (onFieldUpdate) {
      try {
        await onFieldUpdate(field, value);
        toast.success(`Updated ${field.replace(/_/g, " ")}`);
      } catch {
        toast.error(`Failed to update ${field}`);
      }
    } else {
      toast.success(`Updated ${field.replace(/_/g, " ")}`);
    }
  }

  // Document type only makes sense for documents (not links, emails, or media)
  const isDocumentKind = kind === "document";

  // Lifecycle status only for signable/approvable document types
  const SIGNABLE_DOC_TYPES: FileDocumentType[] = ["contract", "proposal", "nda", "sow"];
  const isSignableDocType =
    documentType && SIGNABLE_DOC_TYPES.includes(documentType);

  const hasMoneySection =
    file.hasRevenueSignal ||
    file.documentType === "proposal" ||
    file.documentType === "invoice" ||
    file.documentType === "estimate" ||
    file.documentType === "sow";

  const hasScheduleSection =
    file.dueDate ||
    file.expiryDate ||
    file.signedDate ||
    isSignableDocType;

  const highPriorityCTAs = file.ctas.filter((cta) => cta.priority === "high");

  return (
    <div className="space-y-6">
      {/* AI Summary - at the top with header */}
      {cleanSummary(file.summary) ? (
        <MemoryOverviewSection title="Summary" variant="heading" salt>
          <p className="text-sm leading-relaxed text-foreground/80">{cleanSummary(file.summary)}</p>
        </MemoryOverviewSection>
      ) : null}

      {/* Worth Attention - subtle inline alert */}
      {file.worthAttention ? (
        <p className="text-sm font-medium text-flame">{file.worthAttention.reason}</p>
      ) : null}

      {/* CTAs - High Priority */}
      {highPriorityCTAs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {highPriorityCTAs.map((cta) => {
            const Icon = CTA_ICONS[cta.type];
            return (
              <Button
                key={cta.type}
                variant="default"
                size="sm"
                className="gap-1.5"
              >
                <Icon className="size-3.5" />
                {cta.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      {/* Details */}
      <MemoryOverviewSection title="Details" variant="heading">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <AccountRow label="Name">
            <InlineEditableText
              value={name}
              onChange={(value) => {
                setName(value);
                void saveField("title", value);
              }}
              placeholder="Untitled"
            />
          </AccountRow>
          <AccountRow label="Kind">
            {/* Derived from the file's mime type — never stored or edited */}
            <span className="text-sm text-muted-foreground">{file.kindLabel}</span>
          </AccountRow>
          {kind === "link" ? (
            <AccountRow label="Link">
              <InlineEditableText
                value={linkUrl}
                onChange={(value) => {
                  setLinkUrl(value);
                  void saveField("url", value);
                }}
                placeholder="https://..."
                linkHref={fileLinkHref(linkUrl)}
              />
            </AccountRow>
          ) : null}
          <AccountRow label="Category">
            <InlineSelect
              value={category}
              onChange={(value) => {
                const newCategory = value as FileCategory;
                setCategory(newCategory);
                void saveField("category", newCategory);
              }}
              options={CATEGORY_OPTIONS}
            />
          </AccountRow>
          {isDocumentKind ? (
            <AccountRow label="Document type">
              <InlineSelect
                value={documentType ?? ""}
                onChange={(value) => {
                  const newType = value as FileDocumentType;
                  setDocumentType(newType);
                  void saveField("document_type", newType);
                }}
                options={DOCUMENT_TYPE_OPTIONS}
                placeholder="Select type"
              />
            </AccountRow>
          ) : null}
          {isSignableDocType ? (
            <AccountRow label="Status">
              <InlineSelect
                value={lifecycleStatus ?? ""}
                onChange={(value) => {
                  const newStatus = value as FileLifecycleStatus;
                  setLifecycleStatus(newStatus);
                  void saveField("lifecycle_status", newStatus);
                }}
                options={LIFECYCLE_STATUS_OPTIONS}
                placeholder="Select status"
              />
            </AccountRow>
          ) : null}
          {file.sizeLabel ? (
            <AccountRow label="Size">
              <span className="text-sm text-muted-foreground">{file.sizeLabel}</span>
            </AccountRow>
          ) : null}
          <AccountRow label="Created">
            <span className="text-sm text-muted-foreground">{file.createdAtLabel}</span>
          </AccountRow>
          <AccountRow label="Updated">
            <span className="text-sm text-muted-foreground">{file.updatedAtLabel}</span>
          </AccountRow>
          <AccountRow label="Description">
            <InlineEditableText
              value={description}
              onChange={(value) => {
                setDescription(value);
                void saveField("description", value);
              }}
              placeholder="Add description..."
            />
          </AccountRow>
          <AccountRow label="My business asset">
            <div className="flex items-center gap-2">
              <Switch
                checked={isOperatorAsset}
                onCheckedChange={(checked) => {
                  setIsOperatorAsset(checked);
                  void saveField("is_operator_asset", checked);
                }}
                aria-label="My business asset"
              />
              <span className="text-sm text-muted-foreground">
                {isOperatorAsset ? "Shown on your Me page" : "Belongs to a record"}
              </span>
            </div>
          </AccountRow>
        </dl>
      </MemoryOverviewSection>

      {/* Money (for revenue-related docs) */}
      {hasMoneySection ? (
        <MemoryOverviewSection title="Money" variant="heading">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <AccountRow label="Total">
              <InlineMoney
                valueCents={totalAmountCents}
                onChange={(value) => {
                  setTotalAmountCents(value);
                  void saveField("total_amount_cents", value);
                }}
                currency={currency}
              />
            </AccountRow>
            <AccountRow label="Currency">
              <InlineSelect
                value={currency}
                onChange={(value) => {
                  setCurrency(value);
                  void saveField("currency", value);
                }}
                options={CURRENCY_OPTIONS}
              />
            </AccountRow>
          </dl>

          {file.extractedData?.lineItems && file.extractedData.lineItems.length > 0 ? (
            <div className="mt-4 space-y-1.5">
              {file.extractedData.lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="text-foreground/80">{item.description}</span>
                  <span className="tabular-nums text-foreground">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currency,
                    }).format(item.total / 100)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </MemoryOverviewSection>
      ) : null}

      {/* Schedule */}
      {hasScheduleSection ? (
        <MemoryOverviewSection title="Schedule" variant="heading">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <AccountRow label="Due">
              <InlineDatePicker
                value={dueDate}
                onChange={(value) => {
                  setDueDate(value);
                  void saveField("due_date", value);
                }}
                placeholder="Add due date"
              />
            </AccountRow>
            <AccountRow label="Expires">
              <InlineDatePicker
                value={expiryDate}
                onChange={(value) => {
                  setExpiryDate(value);
                  void saveField("expiry_date", value);
                }}
                placeholder="Add expiry"
              />
            </AccountRow>
            <AccountRow label="Signed">
              <InlineDatePicker
                value={signedDate}
                onChange={(value) => {
                  setSignedDate(value);
                  void saveField("signed_date", value);
                }}
                placeholder="Add signed date"
              />
            </AccountRow>
          </dl>
        </MemoryOverviewSection>
      ) : null}

      {/* Signatures (contracts and SOWs only) */}
      {(file.documentType === "contract" || file.documentType === "sow" || file.documentType === "nda") &&
      (file.extractedData?.signatureParties?.length ?? 0) > 0 ? (
        <MemoryOverviewSection title="Signatures" variant="heading">
          <div className="space-y-2">
            {file.extractedData?.signatureParties?.map((party, idx) => {
              const hasSigned = Boolean(party.signedAt);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {hasSigned ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Clock className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-foreground">{party.name}</span>
                    {party.role ? (
                      <span className="text-muted-foreground">({party.role})</span>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">
                    {hasSigned
                      ? `Signed ${relativeDays(party.signedAt!)}`
                      : "Awaiting"}
                  </span>
                </div>
              );
            })}
          </div>
        </MemoryOverviewSection>
      ) : null}

      {/* Follow-up */}
      {file.followUpSuggested ? (
        <MemoryOverviewSection title="Follow-up" variant="heading">
          <div className="rounded-xl border border-flame/20 bg-flame/5 p-3">
            <p className="text-sm text-foreground/80">
              {file.followUpReason ?? "Salt suggests following up on this file."}
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <AccountRow label="Follow up by">
                <InlineDatePicker
                  value={followUpDate}
                  onChange={(value) => {
                    setFollowUpDate(value);
                    void saveField("follow_up_date", value);
                  }}
                  placeholder="Set date"
                />
              </AccountRow>
            </dl>
          </div>
        </MemoryOverviewSection>
      ) : null}

      {/* Mentioned Entities */}
      {(file.extractedData?.mentionedPeople?.length ?? 0) > 0 ||
      (file.extractedData?.mentionedOrgs?.length ?? 0) > 0 ? (
        <MemoryOverviewSection title="Mentioned" variant="heading">
          <div className="flex flex-wrap gap-2">
            {file.extractedData?.mentionedPeople?.map((person, idx) => (
              <span
                key={`person-${idx}`}
                className="inline-flex items-center rounded-full bg-sky/10 px-2.5 py-1 text-xs font-medium text-sky"
              >
                {person.name}
                {person.role ? ` (${person.role})` : ""}
              </span>
            ))}
            {file.extractedData?.mentionedOrgs?.map((org, idx) => (
              <span
                key={`org-${idx}`}
                className="inline-flex items-center rounded-full bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet"
              >
                {org.name}
              </span>
            ))}
          </div>
        </MemoryOverviewSection>
      ) : null}

      {/* Tags */}
      <MemoryOverviewSection title="Tags" variant="heading">
        <TagEditor entityType="resource" entityId={file.id} scope="resource" />
      </MemoryOverviewSection>
    </div>
  );
}
