/**
 * ME queries — read the operator memory layer (identity, voice, goals, facts, business).
 * All reads go through the RLS-enforced server client. Facts/voice/goals are
 * user-scoped; business context is workspace-scoped (all members can view).
 */

import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { hasWorkspaceRole } from "@/app/_lib/utils/user-dashboard";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import {
  HUMANIZED_VOICE_DEFAULTS,
  type MeData,
  type OperatorBusiness,
  type OperatorBusinessService,
  type OperatorGoal,
  type OperatorIdentity,
  type OperatorMemoryFact,
  type OperatorNote,
  type OperatorVoiceProfile,
  type VoiceSpectrums,
  type VoiceTerminology,
  type WorkspaceVoice,
} from "./types";

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

export async function getMeData(): Promise<MeData> {
  const { workspace, supabase, userId, context } = await getWorkspaceContext();

  const [
    profileRes,
    workspaceRes,
    brandRes,
    voiceRes,
    goalsRes,
    factsRes,
    servicesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, display_name, first_name, email, company_name, job_title, role_title, tagline, timezone, location, working_hours, email_signature, current_focus, avatar_url, phone, gender, preferred_name, professional_credentials",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("name, slug, tagline, description, website_url, location, legal_business_name, business_type, legal_address, business_phone, business_email, tax_id_type, tax_id_last4, industry, default_currency, payment_terms")
      .eq("id", workspace.id)
      .maybeSingle(),
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
      .select("id, title, detail, horizon, progress, status, created_at, updated_at")
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
        "id, name, description, category, pricing_type, price_min, price_max, base_price_cents, currency, typical_timeline, is_active, display_order",
      )
      .eq("workspace_id", workspace.id)
      .order("display_order", { ascending: true }),
  ]);

  const profile = profileRes.data;
  const name =
    profile?.full_name ||
    profile?.display_name ||
    profile?.first_name ||
    profile?.email?.split("@")[0] ||
    "You";

  const identity: OperatorIdentity = {
    name,
    initials: initialsFrom(name),
    fullName: profile?.full_name || "",
    roleTitle: profile?.role_title || profile?.job_title || "",
    tagline: profile?.tagline || "",
    timezone: profile?.timezone || "",
    location: profile?.location || "",
    workingHours: profile?.working_hours || "",
    currentFocus: profile?.current_focus || "",
    emailSignature: profile?.email_signature || "",
    email: profile?.email || "",
    companyName: profile?.company_name || "",
    phone: profile?.phone || "",
    gender: profile?.gender as "male" | "female" | null,
    preferredName: profile?.preferred_name || "",
    professionalCredentials: profile?.professional_credentials || "",
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

  const goals: OperatorGoal[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id,
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
  }));

  const business: OperatorBusiness = {
    canEdit: hasWorkspaceRole(context, "admin"),
    name: workspaceRes.data?.name ?? "",
    slug: workspaceRes.data?.slug ?? "",
    tagline: workspaceRes.data?.tagline ?? null,
    description: workspaceRes.data?.description ?? null,
    websiteUrl: workspaceRes.data?.website_url ?? null,
    location: workspaceRes.data?.location ?? null,
    legalBusinessName: workspaceRes.data?.legal_business_name ?? null,
    businessType: workspaceRes.data?.business_type as OperatorBusiness["businessType"],
    legalAddress: workspaceRes.data?.legal_address ?? null,
    businessPhone: workspaceRes.data?.business_phone ?? null,
    businessEmail: workspaceRes.data?.business_email ?? null,
    taxIdType: workspaceRes.data?.tax_id_type ?? null,
    taxIdLast4: workspaceRes.data?.tax_id_last4 ?? null,
    industry: workspaceRes.data?.industry ?? null,
    defaultCurrency: workspaceRes.data?.default_currency ?? "USD",
    paymentTerms: workspaceRes.data?.payment_terms ?? null,
    services,
  };

  return { identity, goals, facts, voice, workspaceVoice, business };
}

/** Personal notes the operator wrote (user-scoped, newest first). */
export async function getOperatorNotes(): Promise<OperatorNote[]> {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const { data } = await supabase
    .from("notes")
    .select("id, content, title, category, is_pinned, created_at")
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
    createdAt: n.created_at,
  }));
}

/**
 * Build a real activity feed for ME from operator memory events: facts Salt
 * learned/confirmed and goals. Feeds the shared ProfileActivityTimeline.
 */
export async function getOperatorActivity(): Promise<ProfileActivityTimelineEntry[]> {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const [factsRes, goalsRes] = await Promise.all([
    supabase
      .from("operator_memory_facts")
      .select("id, value, status, source, created_at, confirmed_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("operator_goals")
      .select("id, title, status, created_at, updated_at")
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const entries: ProfileActivityTimelineEntry[] = [];

  for (const f of factsRes.data ?? []) {
    const fromAi = f.source === "ai_capture";
    entries.push({
      id: `fact-${f.id}`,
      at: f.created_at,
      kind: fromAi ? "ai" : "user",
      label:
        f.status === "proposed"
          ? "Salt proposed a new memory"
          : "Memory added",
      detail: f.value,
      source: fromAi ? "ai_fallback" : "manual",
      status: f.status === "proposed" ? "pending" : "applied",
    });
  }

  for (const g of goalsRes.data ?? []) {
    entries.push({
      id: `goal-${g.id}`,
      at: g.created_at,
      kind: "user",
      label: g.status === "done" ? "Goal completed" : "Goal set",
      detail: g.title,
      source: "manual",
      status: "applied",
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
