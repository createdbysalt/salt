import type { SourceKind } from "@/app/_lib/demo/people-demo-data";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import type { SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";
import type { AssetKind, FileCategory, MemoryFile } from "./data";

// ============================================================================
// Database Types (match migration schema)
// ============================================================================

export type FileDocumentType =
  | "proposal"
  | "contract"
  | "invoice"
  | "sow"
  | "nda"
  | "deliverable"
  | "brief"
  | "receipt"
  | "estimate"
  | "other";

export type FileLifecycleStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "awaiting_signature"
  | "signed"
  | "expired"
  | "archived";

export type FileExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "unsupported";

export type FileActivityType =
  | "uploaded"
  | "viewed"
  | "downloaded"
  | "shared"
  | "sent"
  | "signed"
  | "signature_requested"
  | "commented"
  | "revised"
  | "linked"
  | "unlinked"
  | "extraction_completed"
  | "metadata_updated"
  | "lifecycle_changed"
  | "follow_up_created"
  | "archived"
  | "restored";

// ============================================================================
// Extracted Data Structure
// ============================================================================

export type FileExtractedLineItem = {
  description: string;
  qty?: number;
  unitPrice?: number;
  total: number;
};

export type FileExtractedDate = {
  type: "due" | "expiry" | "start" | "signed" | "effective";
  date: string;
  label?: string;
};

export type FileExtractedPerson = {
  name: string;
  email?: string;
  role?: string;
};

export type FileExtractedOrg = {
  name: string;
  role?: string;
};

export type FileSignatureParty = {
  name: string;
  role: string;
  email?: string;
  signedAt?: string;
};

export type FileExtractedData = {
  // Revenue signals
  lineItems?: FileExtractedLineItem[];
  totalAmount?: { value: number; currency: string };

  // Key dates
  keyDates?: FileExtractedDate[];

  // Entities mentioned in document
  mentionedPeople?: FileExtractedPerson[];
  mentionedOrgs?: FileExtractedOrg[];

  // Content analysis
  topics?: string[];
  summary?: string;

  // Signature tracking
  requiresSignature?: boolean;
  signatureParties?: FileSignatureParty[];

  // Raw text excerpt (for search)
  textExcerpt?: string;

  // Confidence scores
  confidence?: {
    documentType?: number;
    lineItems?: number;
    dates?: number;
    entities?: number;
  };
};

// ============================================================================
// Activity Types
// ============================================================================

export type FileActivityMetadata = {
  // shared/sent
  toEmail?: string;
  via?: "email" | "link";
  subject?: string;
  message?: string;
  playId?: string;

  // signed
  role?: string;
  signatureMethod?: "docusign" | "pandadoc" | "manual";

  // linked/unlinked
  targetType?: "person" | "org" | "work";
  targetId?: string;
  targetLabel?: string;

  // lifecycle_changed
  fromStatus?: FileLifecycleStatus;
  toStatus?: FileLifecycleStatus;

  // extraction_completed
  version?: number;
  documentType?: FileDocumentType;
  extractionConfidence?: number;
};

export type FileActivityEvent = {
  id: string;
  fileId: string;
  activityType: FileActivityType;
  actorId?: string;
  actorLabel?: string;
  metadata: FileActivityMetadata;
  createdAt: string;
};

// ============================================================================
// Play/CTA Types
// ============================================================================

export type FilePlaySummary = {
  id: string;
  subject: string;
  recipient: string;
  channel: string;
  playerName: string;
  playerMonogram: string;
  state: "approval" | "scheduled" | "team";
};

export type FileCTAType =
  | "send"
  | "request_signature"
  | "follow_up"
  | "create_invoice"
  | "link_person"
  | "link_org"
  | "link_work";

export type FileCTA = {
  type: FileCTAType;
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Detail View Types
// ============================================================================

export type FileDetailData = {
  file: FileDetailRecord | null;
  activities?: FileActivityEvent[];
  plays?: FilePlaySummary[];
  ctas?: FileCTA[];
  lifecycleEvents?: LifecycleEventDisplay[];
  notes?: EntityNoteWithProvenance[];
};

export type FileDetailRecord = {
  id: string;
  workspaceId: string;

  // Basic metadata
  fileName: string;
  fileType: "file" | "folder" | "link";
  mimeType?: string;
  sizeBytes?: number;
  category?: FileCategory;
  description?: string;
  /** TRUE = the operator's own business asset (Me Files tab). */
  isOperatorAsset?: boolean;

  // Provenance
  provider?: SourceProvider;
  sourceOrigin?: SourceOrigin;
  externalUrl?: string;
  appUrl?: string;
  captureSourceUrl?: string;
  sourceExternalId?: string;
  sourceReclassifiedAsManual?: boolean;

  // AI extraction
  aiSummary?: string;
  aiStatus?: string;
  extractedData?: FileExtractedData;
  extractionStatus?: FileExtractionStatus;
  extractionVersion?: number;

  // Document classification
  documentType?: FileDocumentType;
  lifecycleStatus?: FileLifecycleStatus;

  // Key dates
  dueDate?: string;
  expiryDate?: string;
  signedDate?: string;

  // Revenue signals
  totalAmountCents?: number;
  currency?: string;

  // Follow-up signals
  followUpSuggested?: boolean;
  followUpDate?: string;
  followUpReason?: string;

  // Relationships
  projectId?: string;
  uploadedBy: string;

  // Linked entities
  linkedPeople?: Array<{ id: string; name: string }>;
  linkedOrgs?: Array<{ id: string; name: string }>;
  linkedWork?: Array<{ id: string; title: string }>;

  // Tags
  tags?: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type FileDetailViewModel = {
  id: string;

  // Display info
  title: string;
  description?: string;
  /** TRUE = the operator's own business asset (shown on the Me Files tab). */
  isOperatorAsset: boolean;
  kind: AssetKind;
  kindLabel: string;
  category: FileCategory;
  categoryLabel: string;
  mimeType?: string;
  sizeLabel?: string;
  sizeBytes?: number;

  // Document type
  documentType?: FileDocumentType;
  documentTypeLabel?: string;

  // Lifecycle
  lifecycleStatus?: FileLifecycleStatus;
  lifecycleStatusLabel?: string;
  lifecycleStatusTone?: string;

  // Source/provenance
  provider: SourceProvider;
  providerLabel: string;
  origin: SourceOrigin;
  originLabel: string;
  source: SourceKind;
  sourceExternalId?: string;
  appUrl?: string;
  captureSourceUrl?: string;
  sourceReclassifiedAsManual?: boolean;

  // AI summary
  summary?: string;
  worthAttention?: { reason: string };

  // Extracted data
  extractedData?: FileExtractedData;
  extractionStatus?: FileExtractionStatus;
  extractionStatusLabel?: string;

  // Revenue signals
  totalAmount?: string;
  totalAmountCents?: number;
  currency?: string;
  hasRevenueSignal: boolean;

  // Key dates
  dueDate?: string;
  dueDateLabel?: string;
  expiryDate?: string;
  expiryDateLabel?: string;
  signedDate?: string;
  signedDateLabel?: string;

  // Follow-up
  followUpSuggested: boolean;
  followUpDate?: string;
  followUpReason?: string;

  // Relationships
  linkedPerson?: { id: string; name: string };
  linkedOrg?: { id: string; name: string };
  linkedWork?: { id: string; title: string };

  // For backward compat with MemoryFile
  linkedTo: MemoryFile["linkedTo"];

  // From/sender info
  from?: string;

  // URL for external files
  url?: string;
  domain?: string;

  // Tags
  tags: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdAtLabel: string;
  updatedAtLabel: string;

  // Activity
  activities: FileActivityEvent[];

  // Plays/CTAs
  plays: FilePlaySummary[];
  ctas: FileCTA[];
};

// ============================================================================
// Provider Display (for source section)
// ============================================================================

export type FileProviderDisplay = {
  label: string;
  iconSrc?: string;
  color?: string;
};
