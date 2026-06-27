/**
 * ME — Salt's operator memory layer.
 * Live types for the operator identity, voice, goals, facts, and business context.
 */

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
};

export type OperatorGoal = {
  id: string;
  title: string;
  detail: string | null;
  horizon: OperatorGoalHorizon;
  progress: number;
  status: OperatorGoalStatus;
  createdAt: string;
  updatedAt: string;
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
  companyName: string;
  phone: string;
  gender: "male" | "female" | null;
  preferredName: string;
  professionalCredentials: string;
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
  legalAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  taxIdType: string | null;
  taxIdLast4: string | null;
  industry: string | null;
  defaultCurrency: string;
  paymentTerms: string | null;
  services: OperatorBusinessService[];
};

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
};

export type OperatorNote = {
  id: string;
  content: string;
  title: string | null;
  category: string;
  isPinned: boolean;
  createdAt: string;
};

export type MeData = {
  identity: OperatorIdentity;
  goals: OperatorGoal[];
  facts: OperatorMemoryFact[];
  voice: OperatorVoiceProfile;
  workspaceVoice: WorkspaceVoice;
  business: OperatorBusiness;
};

/** Anti-AI humanizing defaults pre-seeded on first load (Hermes Humanizer). */
export const HUMANIZED_VOICE_DEFAULTS: OperatorVoiceProfile = {
  voiceTone: ["direct", "warm", "low-ceremony"],
  voiceSpectrums: { formality: 35, complexity: 35, warmth: 70, brevity: 70 },
  voiceArchetype: "the-operator",
  voiceStyleGuide:
    "Write like a real person. Use contractions. Vary sentence rhythm. " +
    "Have an opinion. No em-dash tics, no corporate filler. " +
    'Never open with "I hope this finds you well." Get to the point.',
  learnedStyle: null,
  voiceTerminology: {
    preferred: [],
    avoid: ["I hope this finds you well", "delve", "leverage", "synergy", "—"],
  },
  inheritsWorkspace: true,
};
