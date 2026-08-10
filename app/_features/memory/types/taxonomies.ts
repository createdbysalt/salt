/**
 * Memory Taxonomies — Controlled vocabularies for People, Orgs, Work
 *
 * These enums define the allowed values for categorization fields.
 * Memory Care uses these to infer values; UI uses them for dropdowns.
 */

// ============================================================================
// INDUSTRY TAXONOMY (Hierarchical: Parent + Child)
// ============================================================================

export const INDUSTRY_PARENTS = [
  "technology",
  "creative",
  "professional_services",
  "healthcare",
  "real_estate",
  "retail_hospitality",
  "other",
] as const;

export type IndustryParent = (typeof INDUSTRY_PARENTS)[number];

export const INDUSTRY_CHILDREN: Record<IndustryParent, readonly string[]> = {
  technology: ["saas", "devtools", "hardware", "ai_ml", "infrastructure"],
  creative: ["design", "photography", "video", "branding", "writing"],
  professional_services: ["legal", "accounting", "consulting", "coaching"],
  healthcare: ["medical_practice", "wellness", "mental_health"],
  real_estate: ["commercial", "residential", "property_management"],
  retail_hospitality: ["restaurant", "ecommerce", "retail"],
  other: ["nonprofit", "government", "education"],
};

export type IndustryChild<P extends IndustryParent = IndustryParent> =
  (typeof INDUSTRY_CHILDREN)[P][number];

export const INDUSTRY_PARENT_LABELS: Record<IndustryParent, string> = {
  technology: "Technology",
  creative: "Creative",
  professional_services: "Professional Services",
  healthcare: "Healthcare",
  real_estate: "Real Estate",
  retail_hospitality: "Retail & Hospitality",
  other: "Other",
};

export const INDUSTRY_CHILD_LABELS: Record<string, string> = {
  // Technology
  saas: "SaaS",
  devtools: "Developer Tools",
  hardware: "Hardware",
  ai_ml: "AI / Machine Learning",
  infrastructure: "Infrastructure",
  // Creative
  design: "Design",
  photography: "Photography",
  video: "Video Production",
  branding: "Branding",
  writing: "Writing & Content",
  // Professional Services
  legal: "Legal",
  accounting: "Accounting",
  consulting: "Consulting",
  coaching: "Coaching",
  // Healthcare
  medical_practice: "Medical Practice",
  wellness: "Wellness",
  mental_health: "Mental Health",
  // Real Estate
  commercial: "Commercial",
  residential: "Residential",
  property_management: "Property Management",
  // Retail & Hospitality
  restaurant: "Restaurant",
  ecommerce: "E-commerce",
  retail: "Retail",
  // Other
  nonprofit: "Non-profit",
  government: "Government",
  education: "Education",
};

export function formatIndustry(
  parent: IndustryParent | null,
  child: string | null
): string {
  if (!parent) return "—";
  const parentLabel = INDUSTRY_PARENT_LABELS[parent] ?? parent;
  if (!child) return parentLabel;
  const childLabel = INDUSTRY_CHILD_LABELS[child] ?? child;
  return `${parentLabel} / ${childLabel}`;
}

export function isValidIndustryParent(value: string): value is IndustryParent {
  return INDUSTRY_PARENTS.includes(value as IndustryParent);
}

export function isValidIndustryChild(
  parent: IndustryParent,
  child: string
): boolean {
  return INDUSTRY_CHILDREN[parent].includes(child);
}

// ============================================================================
// ENTITY NOTE KINDS (For Salt-authored learnings)
// ============================================================================

export const ENTITY_NOTE_KINDS = [
  "fact", // "Works at Acme as VP Engineering"
  "preference", // "Prefers email over calls"
  "context", // "First payment received June 15"
  "relationship", // "Referred by Jane Smith"
  "flag", // "No contact in 45 days"
] as const;

export type EntityNoteKind = (typeof ENTITY_NOTE_KINDS)[number];

export const ENTITY_NOTE_KIND_LABELS: Record<EntityNoteKind, string> = {
  fact: "Fact",
  preference: "Preference",
  context: "Context",
  relationship: "Relationship",
  flag: "Flag",
};

export const ENTITY_NOTE_KIND_DESCRIPTIONS: Record<EntityNoteKind, string> = {
  fact: "Something Salt learned that's objectively true",
  preference: "How this person/org prefers to work",
  context: "Background context about the relationship",
  relationship: "How this entity connects to others",
  flag: "Something that needs attention",
};

// ============================================================================
// LIFECYCLE EVENT TYPES (For tracking relationship progression)
// ============================================================================

export const LIFECYCLE_EVENT_TYPES = [
  "status_change", // prospect → client
  "relationship_change", // relationship_type changed
  "health_change", // health band changed (good → watch)
  "first_contact", // first email/meeting
  "first_payment", // first payment received
  "became_inactive", // no contact 30+ days
  "reactivated", // contact after inactive period
  "merged", // entity was merged with another
  "created", // entity was created
] as const;

export type LifecycleEventType = (typeof LIFECYCLE_EVENT_TYPES)[number];

export const LIFECYCLE_EVENT_LABELS: Record<LifecycleEventType, string> = {
  status_change: "Status Changed",
  relationship_change: "Relationship Changed",
  health_change: "Health Changed",
  first_contact: "First Contact",
  first_payment: "First Payment",
  became_inactive: "Became Inactive",
  reactivated: "Reactivated",
  merged: "Merged",
  created: "Created",
};

// ============================================================================
// NOTE PROVENANCE SOURCES
// ============================================================================

export const NOTE_SOURCES = [
  "manual", // User wrote it
  "ai_capture", // Salt captured from email/meeting
  "ai_inference", // Salt inferred from signals
  "system", // System-generated (e.g., lifecycle event)
  "ask_salt", // User told Salt via Ask SALT chat
] as const;

export type NoteSource = (typeof NOTE_SOURCES)[number];

export const NOTE_SOURCE_LABELS: Record<NoteSource, string> = {
  manual: "You",
  ai_capture: "Salt (captured)",
  ai_inference: "Salt (inferred)",
  system: "System",
  ask_salt: "You (via Ask SALT)",
};

// ============================================================================
// NOTE STATUS (For review workflow)
// ============================================================================

export const NOTE_STATUSES = [
  "proposed", // Salt wrote it, waiting for review
  "confirmed", // User confirmed it's correct
  "dismissed", // User said it's wrong
] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

// ============================================================================
// ENTITY NOTE TYPE (For queries returning notes with provenance)
// ============================================================================

export type ContextBoundary = "billing" | "scheduling" | "work" | "personal";

export interface EntityNoteWithProvenance {
  id: string;
  title: string | null;
  content: string;
  noteKind: EntityNoteKind | "general";
  source: NoteSource;
  sourceRef: string | null;
  confidence: number | null;
  status: NoteStatus;
  authorType: "user" | "salt";
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  // Temporal modeling (Phase 7)
  occurredAt: string | null;
  lastAccessedAt: string | null;
  supersededBy: string | null;
  // Source tracking (Phase 7)
  evidenceSources: string[] | null;
  // Trust management (Phase 7)
  contextBoundary: ContextBoundary | null;
  extractionReasoning: string | null;
  // Legacy compatibility fields (derived from above)
  author: "you" | "salt";
  at: string;
  body: string;
  pinned: boolean;
}

export function mapNoteRow(row: Record<string, unknown>): EntityNoteWithProvenance {
  const authorType = (row.author_type as "user" | "salt") ?? "user";
  const createdAt = row.created_at as string;
  const content = row.content as string;
  const isPinned = (row.is_pinned as boolean) ?? false;
  const tags = (row.tags as string[] | null) ?? [];

  return {
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    content,
    noteKind: (row.note_kind as EntityNoteKind | "general") ?? "general",
    source: (row.source as NoteSource) ?? "manual",
    sourceRef: (row.source_ref as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    status: (row.status as NoteStatus) ?? "confirmed",
    authorType,
    isPinned,
    tags,
    createdAt,
    // Temporal modeling (Phase 7)
    occurredAt: (row.occurred_at as string | null) ?? null,
    lastAccessedAt: (row.last_accessed_at as string | null) ?? null,
    supersededBy: (row.superseded_by as string | null) ?? null,
    // Source tracking (Phase 7)
    evidenceSources: (row.evidence_sources as string[] | null) ?? null,
    // Trust management (Phase 7)
    contextBoundary: (row.context_boundary as ContextBoundary | null) ?? null,
    extractionReasoning: (row.extraction_reasoning as string | null) ?? null,
    // Legacy compatibility
    author: authorType === "salt" ? "salt" : "you",
    at: createdAt,
    body: content,
    pinned: isPinned,
  };
}
