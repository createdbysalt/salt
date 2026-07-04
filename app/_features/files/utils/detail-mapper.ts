import type { SourceKind } from "@/app/_lib/demo/people-demo-data";
import { relativeDays } from "../data";
import {
  FILE_CATEGORY_LABEL,
  ASSET_KIND_LABEL,
  type FileCategory,
  type AssetKind,
  type MemoryFile,
} from "../data";
import { resolveFileRecordUrl } from "./link-display";
import type {
  FileDetailRecord,
  FileDetailViewModel,
  FileDocumentType,
  FileLifecycleStatus,
  FileExtractionStatus,
  FileActivityEvent,
  FilePlaySummary,
  FileCTA,
} from "../detail-types";
import type { SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";
import { getProviderDisplay } from "@/app/_features/memory/utils/provider-display";

// ============================================================================
// Labels & Display
// ============================================================================

export const FILE_DOCUMENT_TYPE_LABEL: Record<FileDocumentType, string> = {
  proposal: "Proposal",
  contract: "Contract",
  invoice: "Invoice",
  sow: "Statement of Work",
  nda: "NDA",
  deliverable: "Deliverable",
  brief: "Brief",
  receipt: "Receipt",
  estimate: "Estimate",
  other: "Document",
};

export const FILE_LIFECYCLE_STATUS_LABEL: Record<FileLifecycleStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  awaiting_signature: "Awaiting Signature",
  signed: "Signed",
  expired: "Expired",
  archived: "Archived",
};

export const FILE_LIFECYCLE_STATUS_TONE: Record<FileLifecycleStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border/60",
  sent: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  viewed: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  awaiting_signature: "bg-flame/10 text-flame border-flame/30",
  signed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  expired: "bg-destructive/10 text-destructive border-destructive/30",
  archived: "bg-muted text-muted-foreground border-border/60",
};

export const FILE_EXTRACTION_STATUS_LABEL: Record<FileExtractionStatus, string> = {
  pending: "Pending extraction",
  processing: "Extracting...",
  completed: "Extracted",
  failed: "Extraction failed",
  unsupported: "Not supported",
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number | undefined | null): string | undefined {
  if (bytes == null || bytes === 0) return undefined;

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatMoney(cents: number | undefined | null, currency: string): string | undefined {
  if (cents == null) return undefined;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function originLabel(origin: SourceOrigin | undefined, providerLabel: string): string {
  switch (origin) {
    case "found":
      return `Found in ${providerLabel}`;
    case "extracted":
      return "Extracted by Salt";
    case "imported":
      return `Imported from ${providerLabel}`;
    case "created":
    default:
      return "Added to Salt";
  }
}

function resolveKind(mimeType: string | undefined, fileType: string | undefined): AssetKind {
  if (fileType === "link") return "link";

  if (!mimeType) return "document";

  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  return "document";
}

function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// ============================================================================
// Detail Mapper
// ============================================================================

export function mapFileToDetailViewModel(
  record: FileDetailRecord,
  activities: FileActivityEvent[] = [],
  plays: FilePlaySummary[] = [],
  ctas: FileCTA[] = [],
): FileDetailViewModel {
  const kind = resolveKind(record.mimeType, record.fileType);
  const provider = (record.provider ?? "manual") as SourceProvider;
  const providerDisplay = getProviderDisplay(provider);
  const origin = (record.sourceOrigin ?? "created") as SourceOrigin;

  const linkedTo: MemoryFile["linkedTo"] = record.linkedWork?.[0]
    ? { kind: "work", id: record.linkedWork[0].id, name: record.linkedWork[0].title }
    : record.linkedOrgs?.[0]
      ? { kind: "org", id: record.linkedOrgs[0].id, name: record.linkedOrgs[0].name }
      : record.linkedPeople?.[0]
        ? { kind: "person", id: record.linkedPeople[0].id, name: record.linkedPeople[0].name }
        : { kind: "work", id: "unknown", name: "Unlinked" };

  const hasRevenueSignal =
    (record.totalAmountCents != null && record.totalAmountCents > 0) ||
    (record.extractedData?.lineItems?.length ?? 0) > 0 ||
    (record.extractedData?.totalAmount?.value ?? 0) > 0;

  const worthAttention = buildWorthAttention(record);
  const summary = buildFileSummary(record, linkedTo);

  return {
    id: record.id,

    // Display info
    title: record.fileName,
    description: record.description,
    isOperatorAsset: record.isOperatorAsset ?? false,
    kind,
    kindLabel: ASSET_KIND_LABEL[kind],
    category: (record.category ?? "other") as FileCategory,
    categoryLabel: FILE_CATEGORY_LABEL[record.category ?? "other"],
    mimeType: record.mimeType,
    sizeLabel: formatFileSize(record.sizeBytes),
    sizeBytes: record.sizeBytes,

    // Document type
    documentType: record.documentType,
    documentTypeLabel: record.documentType
      ? FILE_DOCUMENT_TYPE_LABEL[record.documentType]
      : undefined,

    // Lifecycle
    lifecycleStatus: record.lifecycleStatus,
    lifecycleStatusLabel: record.lifecycleStatus
      ? FILE_LIFECYCLE_STATUS_LABEL[record.lifecycleStatus]
      : undefined,
    lifecycleStatusTone: record.lifecycleStatus
      ? FILE_LIFECYCLE_STATUS_TONE[record.lifecycleStatus]
      : undefined,

    // Source/provenance
    provider,
    providerLabel: providerDisplay.label,
    origin,
    originLabel: originLabel(origin, providerDisplay.label),
    source: (origin === "found" ? "synced" : origin === "extracted" ? "salt_inferred" : "user") as SourceKind,
    sourceExternalId: record.sourceExternalId,
    appUrl: record.appUrl,
    captureSourceUrl: record.captureSourceUrl,
    sourceReclassifiedAsManual: record.sourceReclassifiedAsManual,

    // AI summary
    summary,
    worthAttention,

    // Extracted data
    extractedData: record.extractedData,
    extractionStatus: record.extractionStatus,
    extractionStatusLabel: record.extractionStatus
      ? FILE_EXTRACTION_STATUS_LABEL[record.extractionStatus]
      : undefined,

    // Revenue signals
    totalAmount: formatMoney(record.totalAmountCents, record.currency ?? "USD"),
    totalAmountCents: record.totalAmountCents,
    currency: record.currency,
    hasRevenueSignal,

    // Key dates
    dueDate: record.dueDate,
    dueDateLabel: record.dueDate ? relativeDays(record.dueDate) : undefined,
    expiryDate: record.expiryDate,
    expiryDateLabel: record.expiryDate ? relativeDays(record.expiryDate) : undefined,
    signedDate: record.signedDate,
    signedDateLabel: record.signedDate ? relativeDays(record.signedDate) : undefined,

    // Follow-up
    followUpSuggested: record.followUpSuggested ?? false,
    followUpDate: record.followUpDate,
    followUpReason: record.followUpReason,

    // Relationships
    linkedPerson: record.linkedPeople?.[0],
    linkedOrg: record.linkedOrgs?.[0],
    linkedWork: record.linkedWork?.[0],
    linkedTo,

    // From/sender
    from: record.extractedData?.mentionedPeople?.[0]?.name,

    // URL for external files
    url: resolveFileRecordUrl(record),
    domain: extractDomain(resolveFileRecordUrl(record)),

    // Tags
    tags: record.tags ?? [],

    // Timestamps
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdAtLabel: relativeDays(record.createdAt),
    updatedAtLabel: relativeDays(record.updatedAt),

    // Activity & Plays
    activities,
    plays,
    ctas,
  };
}

// ============================================================================
// Summary & Worth Attention
// ============================================================================

function buildFileSummary(record: FileDetailRecord, linkedTo: MemoryFile["linkedTo"]): string {
  const docType = record.documentType
    ? FILE_DOCUMENT_TYPE_LABEL[record.documentType]
    : "File";

  const linkedPhrase =
    linkedTo.name !== "Unlinked" && linkedTo.id !== "unknown"
      ? ` for ${linkedTo.name}`
      : "";

  if (record.aiSummary) {
    return record.aiSummary;
  }

  if (record.extractedData?.summary) {
    return record.extractedData.summary;
  }

  const sizePhrase = record.sizeBytes
    ? ` (${formatFileSize(record.sizeBytes)})`
    : "";

  const amountPhrase =
    record.totalAmountCents != null
      ? ` totaling ${formatMoney(record.totalAmountCents, record.currency ?? "USD")}`
      : "";

  return `${docType}${linkedPhrase}${amountPhrase}${sizePhrase}.`;
}

function buildWorthAttention(
  record: FileDetailRecord,
): { reason: string } | undefined {
  // Check for overdue follow-up
  if (record.followUpSuggested && record.followUpDate) {
    const followUpDate = new Date(record.followUpDate);
    const now = new Date();

    if (followUpDate < now) {
      return { reason: `Follow-up was due ${relativeDays(record.followUpDate)}` };
    }

    if (followUpDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000) {
      return { reason: `Follow-up due ${relativeDays(record.followUpDate)}` };
    }
  }

  // Check for awaiting signature
  if (record.lifecycleStatus === "awaiting_signature") {
    return { reason: "Awaiting signature" };
  }

  // Check for expiring soon
  if (record.expiryDate) {
    const expiryDate = new Date(record.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return { reason: "Document has expired" };
    }

    if (daysUntilExpiry <= 7) {
      return { reason: `Expires ${relativeDays(record.expiryDate)}` };
    }
  }

  // Check for extraction issues
  if (record.extractionStatus === "failed") {
    return { reason: "Content extraction failed — manual review needed" };
  }

  return undefined;
}

// ============================================================================
// CTA Generation
// ============================================================================

export function generateFileCTAs(record: FileDetailRecord): FileCTA[] {
  const ctas: FileCTA[] = [];

  // Unlinked file with detected entities
  if (
    (!record.linkedPeople?.length && !record.linkedOrgs?.length && !record.linkedWork?.length) &&
    (record.extractedData?.mentionedPeople?.length || record.extractedData?.mentionedOrgs?.length)
  ) {
    ctas.push({
      type: "link_person",
      label: "Link to person",
      description: "Salt detected people in this document",
      priority: "medium",
    });
  }

  // Contract/proposal awaiting signature
  if (
    (record.documentType === "contract" || record.documentType === "proposal") &&
    record.lifecycleStatus !== "signed"
  ) {
    ctas.push({
      type: "request_signature",
      label: "Request signature",
      description: "Send for e-signature",
      priority: record.lifecycleStatus === "awaiting_signature" ? "high" : "medium",
    });
  }

  // Proposal sent, suggest follow-up
  if (
    record.documentType === "proposal" &&
    record.lifecycleStatus === "sent" &&
    !record.followUpSuggested
  ) {
    ctas.push({
      type: "follow_up",
      label: "Follow up",
      description: "Check in on this proposal",
      priority: "medium",
    });
  }

  // SOW/deliverable ready, suggest invoice
  if (
    (record.documentType === "sow" || record.documentType === "deliverable") &&
    record.extractedData?.lineItems?.length
  ) {
    ctas.push({
      type: "create_invoice",
      label: "Create invoice",
      description: "Invoice from line items",
      priority: "low",
    });
  }

  // Always offer send
  ctas.push({
    type: "send",
    label: "Send file",
    description: "Email this file",
    priority: "low",
  });

  return ctas;
}
