/**
 * ME — Salt's operator memory layer.
 * Live types for the operator identity, voice, goals, facts, and business context.
 */

import type { MemoryAddressFields } from "@/app/_features/memory/utils/address-fields";

export type OperatorFactCategory =
  | "identity"
  | "business"
  | "preference"
  | "goal"
  | "voice"
  | "relationship";

export type OperatorFactKind = "fact" | "preference" | "procedure";

export type OperatorFactScope = "global" | "person" | "org" | "topic";

export type OperatorFactStatus = "proposed" | "confirmed" | "dismissed";

export type OperatorFactSource = "manual" | "ai_capture" | "ask_salt" | "draft_edit";

export type OperatorGoalHorizon = "week" | "quarter" | "year";

export type OperatorGoalStatus = "active" | "paused" | "done" | "dropped";

export type OperatorGoalType =
  | "revenue_target"
  | "new_clients"
  | "project_minimum"
  | "work_hours"
  | "custom";

export type OperatorGoalUnit = "dollars" | "clients" | "projects" | "hours";

/**
 * Salt's derived goal progress (system_derived — written only by
 * me/goals/recompute.ts). The versioned fields (version 1) are the current
 * contract; the legacy narrative fields remain optional for old rows.
 */
export type OperatorGoalAIProgress = {
  // Versioned deterministic derivation (v1)
  version?: number;
  value?: number | null;
  target?: number | null;
  /** Clamped 0–100. */
  percent?: number | null;
  unit?: OperatorGoalUnit | null;
  computed_at?: string;
  /** Short description of what produced the value. */
  inputs?: string;
  unavailable?: true;
  reason?: string;
  // Legacy narrative fields (pre-v1 rows)
  summary?: string;
  onTrack?: boolean;
  projectedValue?: number;
  recommendation?: string;
};

export type OperatorMemoryFact = {
  id: string;
  category: OperatorFactCategory;
  kind: OperatorFactKind;
  scopeType: OperatorFactScope;
  scopeValue: string | null;
  label: string | null;
  value: string;
  status: OperatorFactStatus;
  source: OperatorFactSource;
  confidence: number | null;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  provenance?: Record<string, unknown> | null;
};

export type OperatorGoal = {
  id: string;
  goalType: OperatorGoalType;
  // Structured goal fields
  targetValue: number | null;
  targetUnit: OperatorGoalUnit | null;
  targetPeriod: string | null;
  currentValue: number;
  aiProgress: OperatorGoalAIProgress;
  // Custom goal fields (also used as display for structured)
  title: string;
  detail: string | null;
  horizon: OperatorGoalHorizon;
  progress: number;
  status: OperatorGoalStatus;
  createdAt: string;
  updatedAt: string;
};

/** Metadata for each goal type — labels, icons, default units. */
export const GOAL_TYPE_META: Record<
  OperatorGoalType,
  {
    label: string;
    shortLabel: string;
    icon: string;
    unit: OperatorGoalUnit | null;
    placeholder: string;
    hasPeriods: boolean;
  }
> = {
  revenue_target: {
    label: "Revenue Target",
    shortLabel: "Revenue",
    icon: "DollarSign",
    unit: "dollars",
    placeholder: "150000",
    hasPeriods: true,
  },
  new_clients: {
    label: "New Clients",
    shortLabel: "Clients",
    icon: "Users",
    unit: "clients",
    placeholder: "4",
    hasPeriods: true,
  },
  project_minimum: {
    label: "Project Minimum",
    shortLabel: "Min Project",
    icon: "TrendingUp",
    unit: "dollars",
    placeholder: "10000",
    hasPeriods: false,
  },
  work_hours: {
    label: "Work Hours",
    shortLabel: "Hours",
    icon: "Clock",
    unit: "hours",
    placeholder: "35",
    hasPeriods: false,
  },
  custom: {
    label: "Custom Goal",
    shortLabel: "Custom",
    icon: "Target",
    unit: null,
    placeholder: "",
    hasPeriods: false,
  },
};

export type VoiceSpectrums = {
  formality: number;
  complexity: number;
  warmth: number;
  brevity: number;
};

export type VoiceTerminology = {
  preferred: string[];
  avoid: string[];
};

export type OperatorVoiceProfile = {
  voiceTone: string[];
  voiceSpectrums: VoiceSpectrums | null;
  voiceArchetype: string | null;
  voiceStyleGuide: string | null;
  learnedStyle: string | null;
  voiceTerminology: VoiceTerminology;
  inheritsWorkspace: boolean;
};

/** Workspace brand voice the personal profile layers over. */
export type WorkspaceVoice = {
  voiceTone: string[];
  voiceSpectrums: VoiceSpectrums | null;
  voiceArchetype: string | null;
  voiceStyleGuide: string | null;
  voiceTerminology: VoiceTerminology;
};

export type OperatorIdentity = {
  name: string;
  initials: string;
  fullName: string;
  roleTitle: string;
  tagline: string;
  timezone: string;
  location: string;
  workingHours: string;
  currentFocus: string;
  emailSignature: string;
  email: string;
  phone: string;
  gender: "male" | "female" | null;
  preferredName: string;
  professionalCredentials: string;
  address: MemoryAddressFields;
};

export type OperatorBusiness = {
  canEdit: boolean;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  websiteUrl: string | null;
  location: string | null;
  legalBusinessName: string | null;
  businessType: "sole_proprietor" | "llc" | "corporation" | "partnership" | "nonprofit" | null;
  legalAddress: MemoryAddressFields;
  businessPhone: string | null;
  businessEmail: string | null;
  taxIdType: string | null;
  taxIdLast4: string | null;
  industry: string | null;
  defaultCurrency: string;
  paymentTerms: string | null;
  services: OperatorBusinessService[];
};

export type AIContextSource = "manual" | "ai_proposed" | "ai_confirmed";

export type AILearnedSource = "manual" | "ai_proposed" | "ai_learned";

// ─── Service Relationships ──────────────────────────────────────────────────

export type ServiceRelationshipType =
  | "follow_on"        // "After Brand Identity, clients typically need Web Design"
  | "prerequisite"     // "Strategy must come before Brand Identity"
  | "substitute"       // "Web Refresh is an alternative to Full Redesign"
  | "complement"       // "SEO Audit enhances value of Web Design"
  | "bundle_component"; // "This service is part of the Brand Package bundle"

export type ServiceRelationship = {
  id: string;
  serviceId: string;
  relatedServiceId: string;
  relatedServiceName: string; // Denormalized for display
  relationshipType: ServiceRelationshipType;
  strength: number; // 0-100
  typicalGapDays: number | null;
  recommendationNote: string | null;
  source: AILearnedSource;
};

// ─── Sales Context (JSONB) ──────────────────────────────────────────────────

export type ServiceObjection = {
  objection: string;
  response: string;
  source: "operator" | "learned";
};

export type CompetitivePositioning = {
  vsDiy: string | null;
  vsAgencies: string | null;
  vsFreelancers: string | null;
  uniqueAdvantage: string | null;
};

export type IdealTiming = {
  triggers: string[];
  buyingSignals: string[];
  seasonalRelevance: string | null;
};

export type ServiceSalesContext = {
  objections: ServiceObjection[];
  competitivePositioning: CompetitivePositioning;
  idealTiming: IdealTiming;
};

// ─── Pricing Intelligence (JSONB) ───────────────────────────────────────────

export type ROIMetric = {
  metric: string;
  typicalResult: string;
  proofSource: string | null;
};

export type DiscountRule = {
  condition: string;
  discountPercent: number;
  approvalRequired: boolean;
};

export type PricingAnchors = {
  agencyEquivalentCents: number | null;
  diyCostEstimateCents: number | null;
  opportunityCost: string | null;
};

export type ServicePricingIntelligence = {
  roiMetrics: ROIMetric[];
  paybackPeriod: string | null;
  discountRules: DiscountRule[];
  floorPriceCents: number | null;
  anchors: PricingAnchors;
};

// ─── AI Generation Context (JSONB) ──────────────────────────────────────────

export type PitchVariants = {
  elevator: string | null;  // 30 seconds
  email: string | null;     // 2-3 sentences
  proposalIntro: string | null; // Opening paragraph
};

export type ServiceAIGenerationContext = {
  tone: "formal" | "conversational" | "consultative" | "persuasive" | null;
  personalityNotes: string | null;
  includeKeywords: string[];
  avoidKeywords: string[];
  primaryOutcomes: string[];
  proofPriority: ("metrics" | "testimonials" | "case_studies" | "awards")[];
  pitchVariants: PitchVariants;
};

// ─── Deliverables ───────────────────────────────────────────────────────────

export type ServiceDeliverable = {
  name: string;
  description: string | null;
  format: string | null;  // e.g., "AI, EPS, PNG, SVG" or "PDF" or "Figma"
  isRequired: boolean;    // Always included vs. optional add-on
};

// ─── Main Service Type ──────────────────────────────────────────────────────

export type OperatorBusinessService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricingType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  basePriceCents: number | null;
  currency: string;
  typicalTimeline: string | null;
  isActive: boolean;
  isBundle: boolean;
  activeWorkCount: number;
  // AI context fields (existing)
  valueProposition: string | null;
  valuePropositionSource: AIContextSource | null;
  differentiators: string[];
  differentiatorsSource: AIContextSource | null;
  prerequisites: string[];
  prerequisitesSource: AIContextSource | null;
  discoveryQuestions: string[];
  discoveryQuestionsSource: AIContextSource | null;
  aiPitch: string | null;
  aiPitchSource: AIContextSource | null;
  // Sales intelligence (new)
  salesContext: ServiceSalesContext;
  salesContextSource: AIContextSource | null;
  pricingIntelligence: ServicePricingIntelligence;
  pricingIntelligenceSource: AIContextSource | null;
  aiGenerationContext: ServiceAIGenerationContext;
  aiGenerationContextSource: AIContextSource | null;
  // Deliverables
  deliverables: ServiceDeliverable[];
  deliverablesSource: AIContextSource | null;
  // Relationships
  relationships: ServiceRelationship[];
  // ICP mappings
  icpMappings: ServiceICPMapping[];
};

export type OperatorNote = {
  id: string;
  content: string;
  title: string | null;
  category: string;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
};

/** Source attribution for merged voice fields. */
export type VoiceSource = {
  spectrums: "personal" | "workspace" | "default";
  tone: "merged" | "personal" | "workspace";
  styleGuide: "merged" | "personal" | "workspace";
};

/** The computed effective voice after merging workspace + personal. */
export type EffectiveVoice = {
  spectrums: VoiceSpectrums;
  tone: string[];
  styleGuide: string;
  terminology: VoiceTerminology;
  archetype: string | null;
  source: VoiceSource;
};

export type MeData = {
  identity: OperatorIdentity;
  goals: OperatorGoal[];
  facts: OperatorMemoryFact[];
  voice: OperatorVoiceProfile;
  workspaceVoice: WorkspaceVoice;
  effectiveVoice: EffectiveVoice;
  business: OperatorBusiness;
};

/** Anti-AI humanizing defaults pre-seeded on first load (Hermes Humanizer). */
export const HUMANIZED_VOICE_DEFAULTS: OperatorVoiceProfile = {
  voiceTone: ["direct", "warm", "low-ceremony"],
  voiceSpectrums: { formality: 35, complexity: 35, warmth: 70, brevity: 70 },
  voiceArchetype: "the-operator",
  voiceStyleGuide:
    "Write like a real person. Use contractions. Vary sentence length: " +
    "short punchy ones, then longer explanatory ones. Have opinions. Say " +
    "'I recommend' not 'One option might be'. Use specific examples over " +
    "general principles. Starting with 'Look,' or 'Here's the thing:' is fine. " +
    "No em-dashes, no corporate filler. Get to the point.",
  learnedStyle: null,
  voiceTerminology: {
    preferred: [],
    avoid: [
      // Greetings & sign-offs
      "I hope this finds you well",
      "I hope this email finds you",
      "I wanted to reach out",
      "Just circling back",
      "Per my last email",
      // Corporate filler
      "delve",
      "leverage",
      "synergy",
      "utilize",
      "facilitate",
      "streamline",
      "optimize",
      "actionable",
      "circle back",
      "move the needle",
      "low-hanging fruit",
      // AI connector phrases
      "Furthermore",
      "Moreover",
      "Additionally",
      "In conclusion",
      "It's worth noting",
      "It's important to remember",
      "It's important to note",
      // Sycophantic openers
      "Allow me to",
      "I'd be happy to",
      "Let me explain",
      "Great question!",
      "That's a great question",
      "Absolutely!",
      // Wordiness
      "In order to",
      "Due to the fact that",
      "At this point in time",
      "In the event that",
      "With regard to",
      "In terms of",
      // Punctuation tics
      "—",
      "...",
    ],
  },
  inheritsWorkspace: true,
};

// ─── ICP Segment Types ──────────────────────────────────────────────────────

export type ICPSegmentStatus = "active" | "proposed" | "dismissed";

export type ICPSegmentSource = "manual" | "ai_capture";

export type CompanySizeEstimate = "solo" | "2-10" | "11-50" | "51-200" | "200+";

export type ICPSegment = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  painPoints: string[];
  desiredOutcomes: string[];
  budgetSignal: string | null;
  targetCompanySize: CompanySizeEstimate | null;
  minProjectValueCents: number | null;
  targetIndustry: string | null;
  qualifyingSignals: string[];
  disqualifyingSignals: string[];
  status: ICPSegmentStatus;
  source: ICPSegmentSource;
  confidence: number | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceICPMapping = {
  id: string;
  serviceId: string;
  icpSegmentId: string;
  icpSegmentName: string;
  fitScore: number;
  source: "manual" | "ai_proposed";
};

// ─── Contact ICP Match Types ────────────────────────────────────────────────

export type ICPMatchStatus = "proposed" | "confirmed" | "dismissed";

export type ICPFitStatus = "auto" | "confirmed" | "dismissed";

export type ICPMatchSignals = {
  industry?: number;
  budget?: number;
  engagement?: number;
  outcome?: number;
  response_time?: number;
  meeting?: number;
  success?: number;
  referral?: number;
  [key: string]: number | undefined;
};

export type ContactICPMatch = {
  id: string;
  workspaceId: string;
  entityType: "person" | "organization";
  entityId: string;
  icpSegmentId: string;
  icpSegmentName: string;
  matchScore: number;
  matchSignals: ICPMatchSignals;
  status: ICPMatchStatus;
  proposedAt: string;
  resolvedAt: string | null;
};
