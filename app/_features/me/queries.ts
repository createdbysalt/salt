/**
 * ME queries — read the operator memory layer (identity, voice, goals, facts, business).
 * Profile reads use the admin client (server-only, scoped to session userId) because
 * profiles lacks authenticated GRANTs until 20260630190000_grant_profiles_table.sql
 * is applied. Other tables use the RLS-enforced server client.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { hasWorkspaceRole } from "@/app/_lib/utils/user-dashboard";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import {
  HUMANIZED_VOICE_DEFAULTS,
  type MeData,
  type OperatorBusiness,
  type OperatorBusinessService,
  type OperatorGoal,
  type OperatorGoalAIProgress,
  type OperatorIdentity,
  type OperatorMemoryFact,
  type OperatorNote,
  type OperatorVoiceProfile,
  type VoiceSpectrums,
  type VoiceTerminology,
  type WorkspaceVoice,
  type ICPSegment,
  type ServiceSalesContext,
  type ServicePricingIntelligence,
  type ServiceAIGenerationContext,
  type ServiceRelationship,
  type ServiceDeliverable,
} from "./types";
import { mergeVoice, type EffectiveVoice } from "./utils/merge-voice";
import {
  mapGoalAiProgressToActivityEntry,
  mapICPSegmentToActivityEntries,
  mapOperatorFactToActivityEntries,
  mapOperatorGoalToActivityEntries,
  mapOperatorNoteToActivityEntry,
  mapOperatorProvenanceToActivityEntry,
  mapOperatorVoiceToActivityEntries,
  mapServiceToActivityEntries,
  sortActivityEntriesDesc,
  type ICPSegmentActivityInput,
  type OperatorProvenanceActivityInput,
} from "./utils/activity";
import {
  EMPTY_MEMORY_ADDRESS,
  legalAddressFromRow,
  memoryAddressFromRow,
} from "@/app/_features/memory/utils/address-fields";
import {
  operatorDisplayName,
  operatorEditableFullName,
} from "@/app/_features/me/utils/profile-name";
import {
  isGoalAiProgressStale,
  scheduleGoalAiProgressRecompute,
} from "@/app/_features/me/goals/recompute";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function asTerminology(raw: unknown): VoiceTerminology {
  if (raw && typeof raw === "object") {
    const obj = raw as { preferred?: unknown; avoid?: unknown };
    return {
      preferred: Array.isArray(obj.preferred) ? obj.preferred.map(String) : [],
      avoid: Array.isArray(obj.avoid) ? obj.avoid.map(String) : [],
    };
  }
  return { preferred: [], avoid: [] };
}

function asSpectrums(raw: unknown): VoiceSpectrums | null {
  if (raw && typeof raw === "object") {
    const obj = raw as Partial<VoiceSpectrums>;
    if (
      typeof obj.formality === "number" &&
      typeof obj.complexity === "number" &&
      typeof obj.warmth === "number" &&
      typeof obj.brevity === "number"
    ) {
      return {
        formality: obj.formality,
        complexity: obj.complexity,
        warmth: obj.warmth,
        brevity: obj.brevity,
      };
    }
  }
  return null;
}

const EMPTY_SALES_CONTEXT: ServiceSalesContext = {
  objections: [],
  competitivePositioning: { vsDiy: null, vsAgencies: null, vsFreelancers: null, uniqueAdvantage: null },
  idealTiming: { triggers: [], buyingSignals: [], seasonalRelevance: null },
};

const EMPTY_PRICING_INTELLIGENCE: ServicePricingIntelligence = {
  roiMetrics: [],
  paybackPeriod: null,
  discountRules: [],
  floorPriceCents: null,
  anchors: { agencyEquivalentCents: null, diyCostEstimateCents: null, opportunityCost: null },
};

const EMPTY_AI_GENERATION_CONTEXT: ServiceAIGenerationContext = {
  tone: null,
  personalityNotes: null,
  includeKeywords: [],
  avoidKeywords: [],
  primaryOutcomes: [],
  proofPriority: [],
  pitchVariants: { elevator: null, email: null, proposalIntro: null },
};

function asSalesContext(raw: unknown): ServiceSalesContext {
  if (!raw || typeof raw !== "object") return EMPTY_SALES_CONTEXT;
  const obj = raw as Record<string, unknown>;
  return {
    objections: Array.isArray(obj.objections)
      ? obj.objections.map((o: Record<string, unknown>) => ({
          objection: String(o.objection ?? ""),
          response: String(o.response ?? ""),
          source: (o.source === "learned" ? "learned" : "operator") as "operator" | "learned",
        }))
      : [],
    competitivePositioning: {
      vsDiy: typeof obj.competitive_positioning === "object" && obj.competitive_positioning
        ? String((obj.competitive_positioning as Record<string, unknown>).vs_diy ?? "") || null
        : null,
      vsAgencies: typeof obj.competitive_positioning === "object" && obj.competitive_positioning
        ? String((obj.competitive_positioning as Record<string, unknown>).vs_agencies ?? "") || null
        : null,
      vsFreelancers: typeof obj.competitive_positioning === "object" && obj.competitive_positioning
        ? String((obj.competitive_positioning as Record<string, unknown>).vs_freelancers ?? "") || null
        : null,
      uniqueAdvantage: typeof obj.competitive_positioning === "object" && obj.competitive_positioning
        ? String((obj.competitive_positioning as Record<string, unknown>).unique_advantage ?? "") || null
        : null,
    },
    idealTiming: {
      triggers: typeof obj.ideal_timing === "object" && obj.ideal_timing
        ? (Array.isArray((obj.ideal_timing as Record<string, unknown>).triggers)
            ? ((obj.ideal_timing as Record<string, unknown>).triggers as unknown[]).map(String)
            : [])
        : [],
      buyingSignals: typeof obj.ideal_timing === "object" && obj.ideal_timing
        ? (Array.isArray((obj.ideal_timing as Record<string, unknown>).buying_signals)
            ? ((obj.ideal_timing as Record<string, unknown>).buying_signals as unknown[]).map(String)
            : [])
        : [],
      seasonalRelevance: typeof obj.ideal_timing === "object" && obj.ideal_timing
        ? String((obj.ideal_timing as Record<string, unknown>).seasonal_relevance ?? "") || null
        : null,
    },
  };
}

function asPricingIntelligence(raw: unknown): ServicePricingIntelligence {
  if (!raw || typeof raw !== "object") return EMPTY_PRICING_INTELLIGENCE;
  const obj = raw as Record<string, unknown>;
  return {
    roiMetrics: Array.isArray(obj.roi_metrics)
      ? obj.roi_metrics.map((m: Record<string, unknown>) => ({
          metric: String(m.metric ?? ""),
          typicalResult: String(m.typical_result ?? ""),
          proofSource: m.proof_source ? String(m.proof_source) : null,
        }))
      : [],
    paybackPeriod: obj.payback_period ? String(obj.payback_period) : null,
    discountRules: Array.isArray(obj.discount_rules)
      ? obj.discount_rules.map((r: Record<string, unknown>) => ({
          condition: String(r.condition ?? ""),
          discountPercent: Number(r.discount_percent ?? 0),
          approvalRequired: Boolean(r.approval_required),
        }))
      : [],
    floorPriceCents: typeof obj.floor_price_cents === "number" ? obj.floor_price_cents : null,
    anchors: {
      agencyEquivalentCents: typeof obj.anchors === "object" && obj.anchors
        ? (typeof (obj.anchors as Record<string, unknown>).agency_equivalent_cents === "number"
            ? (obj.anchors as Record<string, unknown>).agency_equivalent_cents as number
            : null)
        : null,
      diyCostEstimateCents: typeof obj.anchors === "object" && obj.anchors
        ? (typeof (obj.anchors as Record<string, unknown>).diy_cost_estimate_cents === "number"
            ? (obj.anchors as Record<string, unknown>).diy_cost_estimate_cents as number
            : null)
        : null,
      opportunityCost: typeof obj.anchors === "object" && obj.anchors
        ? String((obj.anchors as Record<string, unknown>).opportunity_cost ?? "") || null
        : null,
    },
  };
}

function asAIGenerationContext(raw: unknown): ServiceAIGenerationContext {
  if (!raw || typeof raw !== "object") return EMPTY_AI_GENERATION_CONTEXT;
  const obj = raw as Record<string, unknown>;
  const validTones = ["formal", "conversational", "consultative", "persuasive"] as const;
  const rawTone = obj.tone;
  return {
    tone: typeof rawTone === "string" && validTones.includes(rawTone as typeof validTones[number])
      ? (rawTone as typeof validTones[number])
      : null,
    personalityNotes: obj.personality_notes ? String(obj.personality_notes) : null,
    includeKeywords: Array.isArray(obj.include_keywords) ? obj.include_keywords.map(String) : [],
    avoidKeywords: Array.isArray(obj.avoid_keywords) ? obj.avoid_keywords.map(String) : [],
    primaryOutcomes: Array.isArray(obj.primary_outcomes) ? obj.primary_outcomes.map(String) : [],
    proofPriority: Array.isArray(obj.proof_priority)
      ? obj.proof_priority.filter((p): p is "metrics" | "testimonials" | "case_studies" | "awards" =>
          ["metrics", "testimonials", "case_studies", "awards"].includes(String(p)))
      : [],
    pitchVariants: {
      elevator: typeof obj.pitch_variants === "object" && obj.pitch_variants
        ? String((obj.pitch_variants as Record<string, unknown>).elevator ?? "") || null
        : null,
      email: typeof obj.pitch_variants === "object" && obj.pitch_variants
        ? String((obj.pitch_variants as Record<string, unknown>).email ?? "") || null
        : null,
      proposalIntro: typeof obj.pitch_variants === "object" && obj.pitch_variants
        ? String((obj.pitch_variants as Record<string, unknown>).proposal_intro ?? "") || null
        : null,
    },
  };
}

function asDeliverables(raw: unknown): ServiceDeliverable[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d: unknown): ServiceDeliverable => {
    if (!d || typeof d !== "object") {
      return { name: "", description: null, format: null, isRequired: false };
    }
    const obj = d as Record<string, unknown>;
    return {
      name: String(obj.name ?? ""),
      description: obj.description ? String(obj.description) : null,
      format: obj.format ? String(obj.format) : null,
      isRequired: Boolean(obj.is_required),
    };
  }).filter((d) => d.name.trim() !== "");
}

const OPERATOR_PROFILE_BASE_SELECT =
  "full_name, display_name, first_name, last_name, email, job_title, role_title, tagline, timezone, location, working_hours, email_signature, current_focus, avatar_url, phone, gender, preferred_name, professional_credentials";

const OPERATOR_PROFILE_ADDRESS_SELECT =
  "address_line_1, address_line_2, city, state, postal_code, country";

const WORKSPACE_BUSINESS_BASE_SELECT =
  "name, slug, tagline, description, website_url, location, legal_business_name, business_type, legal_address, business_phone, business_email, tax_id_type, tax_id_last4, industry, default_currency, payment_terms";

const WORKSPACE_BUSINESS_LEGAL_ADDRESS_SELECT =
  "legal_address_line_1, legal_address_line_2, legal_city, legal_state, legal_postal_code, legal_country";

async function loadOperatorProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const withAddress = await admin
    .from("profiles")
    .select(`${OPERATOR_PROFILE_BASE_SELECT}, ${OPERATOR_PROFILE_ADDRESS_SELECT}`)
    .eq("id", userId)
    .maybeSingle();

  if (!withAddress.error) {
    return withAddress.data;
  }

  const base = await admin
    .from("profiles")
    .select(OPERATOR_PROFILE_BASE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  return base.data;
}

async function loadWorkspaceBusiness(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  workspaceId: string,
) {
  const withStructured = await supabase
    .from("workspaces")
    .select(`${WORKSPACE_BUSINESS_BASE_SELECT}, ${WORKSPACE_BUSINESS_LEGAL_ADDRESS_SELECT}`)
    .eq("id", workspaceId)
    .maybeSingle();

  if (!withStructured.error) {
    return withStructured.data;
  }

  const base = await supabase
    .from("workspaces")
    .select(WORKSPACE_BUSINESS_BASE_SELECT)
    .eq("id", workspaceId)
    .maybeSingle();

  return base.data;
}

export async function getMeData(): Promise<MeData> {
  const { workspace, supabase, userId, context } = await getWorkspaceContext();
  const admin = createAdminClient();

  const [
    profile,
    workspaceData,
    brandRes,
    voiceRes,
    goalsRes,
    factsRes,
    servicesRes,
    serviceWorkRes,
  ] = await Promise.all([
    loadOperatorProfile(admin, userId),
    loadWorkspaceBusiness(supabase, workspace.id),
    supabase
      .from("workspace_brand_config")
      .select(
        "voice_tone, voice_spectrums, voice_archetype, voice_style_guide, voice_terminology",
      )
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("operator_voice_profile")
      .select(
        "voice_tone, voice_spectrums, voice_archetype, voice_style_guide, learned_style, voice_terminology, inherits_workspace",
      )
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("operator_goals")
      .select(
        "id, goal_type, target_value, target_unit, target_period, current_value, ai_progress, title, detail, horizon, progress, status, created_at, updated_at",
      )
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .neq("status", "dropped")
      .order("created_at", { ascending: false }),
    supabase
      .from("operator_memory_facts")
      .select(
        "id, category, kind, scope_type, scope_value, label, value, status, source, confidence, vote_count, created_at, updated_at, confirmed_at",
      )
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false }),
    supabase
      .from("workspace_services")
      .select(
        `id, name, description, category, pricing_type, price_min, price_max, base_price_cents, currency, typical_timeline, is_active, is_bundle, display_order,
         value_proposition, value_proposition_source, differentiators, differentiators_source,
         prerequisites, prerequisites_source, discovery_questions, discovery_questions_source,
         ai_pitch, ai_pitch_source,
         ai_sales_context, ai_sales_context_source,
         pricing_intelligence, pricing_intelligence_source,
         ai_generation_context, ai_generation_context_source,
         deliverables, deliverables_source`,
      )
      .eq("workspace_id", workspace.id)
      .order("display_order", { ascending: true }),
    supabase
      .from("projects")
      .select("service_id")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .in("status", ["signed", "active"]),
  ]);

  // Fetch ICP mappings and relationships after services to avoid nested await in Promise.all
  const serviceIds = (servicesRes.data ?? []).map((s) => s.id);
  const [icpMappingsRes, relationshipsRes] = await Promise.all([
    serviceIds.length > 0
      ? supabase
          .from("service_icp_mappings")
          .select("id, service_id, icp_segment_id, fit_score, source, workspace_icp_segments(id, name)")
          .in("service_id", serviceIds)
      : Promise.resolve({ data: [] }),
    serviceIds.length > 0
      ? supabase
          .from("service_relationships")
          .select("id, service_id, related_service_id, relationship_type, strength, typical_gap_days, recommendation_note, source, display_order")
          .in("service_id", serviceIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const name = operatorDisplayName(profile);

  const identity: OperatorIdentity = {
    name,
    initials: initialsFrom(name),
    fullName: operatorEditableFullName(profile),
    roleTitle: profile?.role_title || profile?.job_title || "",
    tagline: profile?.tagline || "",
    timezone: profile?.timezone || "",
    location: profile?.location || "",
    workingHours: profile?.working_hours || "",
    currentFocus: profile?.current_focus || "",
    emailSignature: profile?.email_signature || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    gender: profile?.gender as "male" | "female" | null,
    preferredName: profile?.preferred_name || "",
    professionalCredentials: profile?.professional_credentials || "",
    address: profile
      ? memoryAddressFromRow(profile as Parameters<typeof memoryAddressFromRow>[0])
      : EMPTY_MEMORY_ADDRESS,
  };

  const workspaceVoice: WorkspaceVoice = {
    voiceTone: Array.isArray(brandRes.data?.voice_tone)
      ? brandRes.data!.voice_tone.map(String)
      : [],
    voiceSpectrums: asSpectrums(brandRes.data?.voice_spectrums),
    voiceArchetype: brandRes.data?.voice_archetype ?? null,
    voiceStyleGuide: brandRes.data?.voice_style_guide ?? null,
    voiceTerminology: asTerminology(brandRes.data?.voice_terminology),
  };

  const voice: OperatorVoiceProfile = voiceRes.data
    ? {
        voiceTone: Array.isArray(voiceRes.data.voice_tone)
          ? voiceRes.data.voice_tone.map(String)
          : [],
        voiceSpectrums: asSpectrums(voiceRes.data.voice_spectrums),
        voiceArchetype: voiceRes.data.voice_archetype ?? null,
        voiceStyleGuide: voiceRes.data.voice_style_guide ?? null,
        learnedStyle: voiceRes.data.learned_style ?? null,
        voiceTerminology: asTerminology(voiceRes.data.voice_terminology),
        inheritsWorkspace: voiceRes.data.inherits_workspace ?? true,
      }
    : HUMANIZED_VOICE_DEFAULTS;

  // Stale-recompute gate (mirrors work-health): if any active goal's
  // ai_progress is missing/older than 6h, refresh in the background.
  // The stale value still renders on this request.
  const hasStaleGoalProgress = (goalsRes.data ?? []).some(
    (g) => g.status === "active" && isGoalAiProgressStale(g.ai_progress),
  );
  if (hasStaleGoalProgress) {
    scheduleGoalAiProgressRecompute(workspace.id);
  }

  const goals: OperatorGoal[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id,
    goalType: g.goal_type ?? "custom",
    targetValue: g.target_value ?? null,
    targetUnit: g.target_unit ?? null,
    targetPeriod: g.target_period ?? null,
    currentValue: g.current_value ?? 0,
    aiProgress: (g.ai_progress as OperatorGoalAIProgress) ?? {},
    title: g.title,
    detail: g.detail,
    horizon: g.horizon,
    progress: g.progress,
    status: g.status,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }));

  const facts: OperatorMemoryFact[] = (factsRes.data ?? []).map((f) => ({
    id: f.id,
    category: f.category,
    kind: f.kind,
    scopeType: f.scope_type,
    scopeValue: f.scope_value,
    label: f.label,
    value: f.value,
    status: f.status,
    source: f.source,
    confidence: f.confidence,
    voteCount: f.vote_count,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    confirmedAt: f.confirmed_at,
  }));

  const activeWorkByService = new Map<string, number>();
  for (const project of serviceWorkRes.data ?? []) {
    if (!project.service_id) continue;
    activeWorkByService.set(project.service_id, (activeWorkByService.get(project.service_id) ?? 0) + 1);
  }

  // Group ICP mappings by service
  const icpMappingsByService = new Map<string, typeof icpMappingsRes.data>();
  for (const mapping of icpMappingsRes.data ?? []) {
    const existing = icpMappingsByService.get(mapping.service_id) ?? [];
    existing.push(mapping);
    icpMappingsByService.set(mapping.service_id, existing);
  }

  // Build service name lookup for relationships
  const serviceNameById = new Map<string, string>();
  for (const s of servicesRes.data ?? []) {
    serviceNameById.set(s.id, s.name);
  }

  // Group relationships by service
  const relationshipsByService = new Map<string, typeof relationshipsRes.data>();
  for (const rel of relationshipsRes.data ?? []) {
    const existing = relationshipsByService.get(rel.service_id) ?? [];
    existing.push(rel);
    relationshipsByService.set(rel.service_id, existing);
  }

  const services: OperatorBusinessService[] = (servicesRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    pricingType: s.pricing_type,
    priceMin: s.price_min,
    priceMax: s.price_max,
    basePriceCents: s.base_price_cents,
    currency: s.currency ?? "USD",
    typicalTimeline: s.typical_timeline,
    isActive: s.is_active ?? true,
    isBundle: s.is_bundle ?? false,
    activeWorkCount: activeWorkByService.get(s.id) ?? 0,
    // AI context fields (existing)
    valueProposition: s.value_proposition ?? null,
    valuePropositionSource: s.value_proposition_source as OperatorBusinessService["valuePropositionSource"],
    differentiators: s.differentiators ?? [],
    differentiatorsSource: s.differentiators_source as OperatorBusinessService["differentiatorsSource"],
    prerequisites: s.prerequisites ?? [],
    prerequisitesSource: s.prerequisites_source as OperatorBusinessService["prerequisitesSource"],
    discoveryQuestions: s.discovery_questions ?? [],
    discoveryQuestionsSource: s.discovery_questions_source as OperatorBusinessService["discoveryQuestionsSource"],
    aiPitch: s.ai_pitch ?? null,
    aiPitchSource: s.ai_pitch_source as OperatorBusinessService["aiPitchSource"],
    // Sales intelligence (new)
    salesContext: asSalesContext(s.ai_sales_context),
    salesContextSource: s.ai_sales_context_source as OperatorBusinessService["salesContextSource"],
    pricingIntelligence: asPricingIntelligence(s.pricing_intelligence),
    pricingIntelligenceSource: s.pricing_intelligence_source as OperatorBusinessService["pricingIntelligenceSource"],
    aiGenerationContext: asAIGenerationContext(s.ai_generation_context),
    aiGenerationContextSource: s.ai_generation_context_source as OperatorBusinessService["aiGenerationContextSource"],
    // Deliverables
    deliverables: asDeliverables(s.deliverables),
    deliverablesSource: s.deliverables_source as OperatorBusinessService["deliverablesSource"],
    // Relationships
    relationships: (relationshipsByService.get(s.id) ?? []).map((r): ServiceRelationship => ({
      id: r.id,
      serviceId: r.service_id,
      relatedServiceId: r.related_service_id,
      relatedServiceName: serviceNameById.get(r.related_service_id) ?? "",
      relationshipType: r.relationship_type as ServiceRelationship["relationshipType"],
      strength: r.strength,
      typicalGapDays: r.typical_gap_days,
      recommendationNote: r.recommendation_note,
      source: r.source as ServiceRelationship["source"],
    })),
    // ICP mappings
    icpMappings: (icpMappingsByService.get(s.id) ?? []).map((m) => {
      const icpSegment = m.workspace_icp_segments as unknown as { id: string; name: string } | null;
      return {
        id: m.id,
        serviceId: m.service_id,
        icpSegmentId: m.icp_segment_id,
        icpSegmentName: icpSegment?.name ?? "",
        fitScore: m.fit_score,
        source: m.source as "manual" | "ai_proposed",
      };
    }),
  }));

  const business: OperatorBusiness = {
    canEdit: hasWorkspaceRole(context, "admin"),
    name: workspaceData?.name ?? "",
    slug: workspaceData?.slug ?? "",
    tagline: workspaceData?.tagline ?? null,
    description: workspaceData?.description ?? null,
    websiteUrl: workspaceData?.website_url ?? null,
    location: workspaceData?.location ?? null,
    legalBusinessName: workspaceData?.legal_business_name ?? null,
    businessType: workspaceData?.business_type as OperatorBusiness["businessType"],
    legalAddress: legalAddressFromRow(workspaceData ?? {}),
    businessPhone: workspaceData?.business_phone ?? null,
    businessEmail: workspaceData?.business_email ?? null,
    taxIdType: workspaceData?.tax_id_type ?? null,
    taxIdLast4: workspaceData?.tax_id_last4 ?? null,
    industry: workspaceData?.industry ?? null,
    defaultCurrency: workspaceData?.default_currency ?? "USD",
    paymentTerms: workspaceData?.payment_terms ?? null,
    services,
  };

  const effectiveVoice = mergeVoice(workspaceVoice, voice);

  return { identity, goals, facts, voice, workspaceVoice, effectiveVoice, business };
}

/** Personal notes the operator wrote (user-scoped, newest first). */
export async function getOperatorNotes(): Promise<OperatorNote[]> {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const { data } = await supabase
    .from("notes")
    .select("id, content, title, category, is_pinned, tags, created_at")
    .eq("workspace_id", workspace.id)
    .eq("created_by", userId)
    .eq("author_type", "user")
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((n) => ({
    id: n.id,
    content: n.content ?? "",
    title: n.title ?? null,
    category: n.category ?? "note",
    isPinned: n.is_pinned ?? false,
    tags: n.tags ?? [],
    createdAt: n.created_at,
  }));
}

function mapMeProvenanceRow(row: Record<string, unknown>): OperatorProvenanceActivityInput {
  const valueObj = row.value as { text?: string } | null;
  return {
    entityType: row.entity_type as OperatorProvenanceActivityInput["entityType"],
    field: row.field as string,
    value: valueObj?.text ?? null,
    source: row.source as OperatorProvenanceActivityInput["source"],
    because:
      typeof row.evidence === "object" && row.evidence && "because" in (row.evidence as object)
        ? String((row.evidence as { because?: string }).because)
        : null,
    confidence: (row.confidence as number | null) ?? null,
    status: row.status as OperatorProvenanceActivityInput["status"],
    setAt: row.set_at as string,
  };
}

/**
 * Build a real activity feed for ME from every operator memory stream: facts,
 * goals, identity/business provenance, voice, ICP segments, services, and
 * Me-scoped notes. Mappers live in ./utils/activity.ts — see the event
 * taxonomy in the keeper-field-contracts plan and
 * docs/guides/memory-activity-parity.md. Feeds the shared
 * ProfileActivityTimeline.
 */
export async function getOperatorActivity(): Promise<ProfileActivityTimelineEntry[]> {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const [factsRes, goalsRes, provenanceRes, voiceRes, icpRes, servicesRes, notesRes] =
    await Promise.all([
      // Families 1–5: includes dismissed facts — forgetting is itself an event.
      supabase
        .from("operator_memory_facts")
        .select("id, value, status, source, created_at, updated_at, confirmed_at")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      // Families 6–7 (7 = Salt-derived ai_progress refreshes)
      supabase
        .from("operator_goals")
        .select("id, title, status, ai_progress, created_at, updated_at")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      // Families 8–9: identity (operator) + business (workspace) field writes.
      supabase
        .from("profile_field_provenance")
        .select("entity_type, entity_id, field, value, source, confidence, evidence, status, set_at")
        .eq("workspace_id", workspace.id)
        .or(
          `and(entity_type.eq.operator,entity_id.eq.${userId}),and(entity_type.eq.workspace,entity_id.eq.${workspace.id})`,
        )
        .order("set_at", { ascending: false })
        .limit(60),
      // Families 10–11
      supabase
        .from("operator_voice_profile")
        .select("learned_style, created_at, updated_at")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .maybeSingle(),
      // Family 12: includes dismissed segments — dismissal is an event.
      supabase
        .from("workspace_icp_segments")
        .select("id, name, status, source, created_at, updated_at")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(40),
      // Family 13
      supabase
        .from("workspace_services")
        .select(
          `id, name, created_at, updated_at,
           value_proposition_source, differentiators_source, prerequisites_source,
           discovery_questions_source, ai_pitch_source, ai_sales_context_source,
           pricing_intelligence_source, ai_generation_context_source, deliverables_source`,
        )
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(40),
      // Family 14: same scope as getOperatorNotes (the Me notes tab).
      supabase
        .from("notes")
        .select("id, title, content, tags, created_at")
        .eq("workspace_id", workspace.id)
        .eq("created_by", userId)
        .eq("author_type", "user")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const factEntries = (factsRes.data ?? []).flatMap((f) =>
    mapOperatorFactToActivityEntries({
      id: f.id,
      value: f.value,
      status: f.status,
      source: f.source,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      confirmedAt: f.confirmed_at,
    }),
  );

  const goalEntries = (goalsRes.data ?? []).flatMap((g) =>
    mapOperatorGoalToActivityEntries({
      id: g.id,
      title: g.title,
      status: g.status,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }),
  );

  // Family 7: Salt updated goal progress (only when the derived ai_progress
  // carries a computed_at timestamp).
  const goalAiProgressEntries = (goalsRes.data ?? []).flatMap((g) => {
    const entry = mapGoalAiProgressToActivityEntry({
      id: g.id,
      title: g.title,
      aiProgress: g.ai_progress,
    });
    return entry ? [entry] : [];
  });

  const provenanceEntries = (provenanceRes.data ?? []).map((row) =>
    mapOperatorProvenanceToActivityEntry(mapMeProvenanceRow(row as Record<string, unknown>)),
  );

  const voiceEntries = voiceRes.data
    ? mapOperatorVoiceToActivityEntries({
        learnedStyle: voiceRes.data.learned_style ?? null,
        createdAt: voiceRes.data.created_at,
        updatedAt: voiceRes.data.updated_at,
      })
    : [];

  const icpEntries = (icpRes.data ?? []).flatMap((s) =>
    mapICPSegmentToActivityEntries({
      id: s.id,
      name: s.name,
      status: s.status as ICPSegmentActivityInput["status"],
      source: s.source as ICPSegmentActivityInput["source"],
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }),
  );

  const serviceEntries = (servicesRes.data ?? []).flatMap((s) =>
    mapServiceToActivityEntries({
      id: s.id,
      name: s.name,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      fieldSources: [
        s.value_proposition_source,
        s.differentiators_source,
        s.prerequisites_source,
        s.discovery_questions_source,
        s.ai_pitch_source,
        s.ai_sales_context_source,
        s.pricing_intelligence_source,
        s.ai_generation_context_source,
        s.deliverables_source,
      ],
    }),
  );

  const noteEntries = (notesRes.data ?? []).map((n) =>
    mapOperatorNoteToActivityEntry({
      id: n.id,
      title: n.title ?? null,
      content: n.content ?? "",
      tags: n.tags ?? [],
      createdAt: n.created_at,
    }),
  );

  return sortActivityEntriesDesc([
    ...factEntries,
    ...goalEntries,
    ...goalAiProgressEntries,
    ...provenanceEntries,
    ...voiceEntries,
    ...icpEntries,
    ...serviceEntries,
    ...noteEntries,
  ]);
}

// ─── ICP Segment Queries ────────────────────────────────────────────────────

/** Get all ICP segments for the workspace (active and proposed). */
export async function getICPSegments(): Promise<ICPSegment[]> {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data } = await supabase
    .from("workspace_icp_segments")
    .select(
      `id, workspace_id, name, description, pain_points, desired_outcomes,
       budget_signal, target_company_size, min_project_value_cents, target_industry,
       qualifying_signals, disqualifying_signals, status, source, confidence,
       display_order, created_at, updated_at`,
    )
    .eq("workspace_id", workspace.id)
    .neq("status", "dismissed")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => ({
    id: s.id,
    workspaceId: s.workspace_id,
    name: s.name,
    description: s.description,
    painPoints: s.pain_points ?? [],
    desiredOutcomes: s.desired_outcomes ?? [],
    budgetSignal: s.budget_signal,
    targetCompanySize: s.target_company_size as ICPSegment["targetCompanySize"],
    minProjectValueCents: s.min_project_value_cents,
    targetIndustry: s.target_industry,
    qualifyingSignals: s.qualifying_signals ?? [],
    disqualifyingSignals: s.disqualifying_signals ?? [],
    status: s.status as ICPSegment["status"],
    source: s.source as ICPSegment["source"],
    confidence: s.confidence,
    displayOrder: s.display_order ?? 0,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

/** Get a single ICP segment by ID. */
export async function getICPSegment(id: string): Promise<ICPSegment | null> {
  const { supabase } = await getWorkspaceContext();

  const { data } = await supabase
    .from("workspace_icp_segments")
    .select(
      `id, workspace_id, name, description, pain_points, desired_outcomes,
       budget_signal, target_company_size, min_project_value_cents, target_industry,
       qualifying_signals, disqualifying_signals, status, source, confidence,
       display_order, created_at, updated_at`,
    )
    .eq("id", id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    description: data.description,
    painPoints: data.pain_points ?? [],
    desiredOutcomes: data.desired_outcomes ?? [],
    budgetSignal: data.budget_signal,
    targetCompanySize: data.target_company_size as ICPSegment["targetCompanySize"],
    minProjectValueCents: data.min_project_value_cents,
    targetIndustry: data.target_industry,
    qualifyingSignals: data.qualifying_signals ?? [],
    disqualifyingSignals: data.disqualifying_signals ?? [],
    status: data.status as ICPSegment["status"],
    source: data.source as ICPSegment["source"],
    confidence: data.confidence,
    displayOrder: data.display_order ?? 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
