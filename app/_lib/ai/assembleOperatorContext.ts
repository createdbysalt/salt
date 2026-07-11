import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { mergeVoice, voiceToPrompt } from "@/app/_features/me/utils/merge-voice";
import type { VoiceSpectrums, VoiceTerminology } from "@/app/_features/me/types";

/**
 * Operator Context Assembly
 *
 * Two separate contexts for different use cases:
 *
 * 1. `assembleOperatorMemoryContext()` — WHO the user is
 *    - Identity, facts, business, services
 *    - Always injected so Salt understands the user
 *    - Used by: Ask Salt (conversation), plays (context)
 *
 * 2. `assembleOperatorVoice()` — HOW the user writes
 *    - Tone, spectrums, terminology, style guide
 *    - Only injected when drafting content FOR the user
 *    - Used by: Play execution (emails, proposals), draft tools
 *
 * Rules:
 * - Only CONFIRMED facts enter context (proposed facts never leak)
 * - Voice is for drafting, not for Salt's conversational responses
 * - Salt has its own personality; operator voice is for content Salt creates
 */

/** Content surface types for format rules. */
export type ContentSurface = "Gmail" | "Slack" | "Notion" | "Memory" | "Stripe" | "default";

export interface OperatorContextOptions {
  workspaceId: string;
  userId: string;
  /** Cap on confirmed facts to control token budget. */
  maxFacts?: number;
  /** Content surface for format rules (e.g., "Gmail", "Slack"). */
  surface?: ContentSurface;
}

const DEFAULT_MAX_FACTS = 40;

/** Anti-AI humanizing fallback when no voice profile is configured. */
const HUMANIZED_DEFAULT_STYLE =
  "Write like a real person. Use contractions, vary sentence rhythm, have an opinion. " +
  'No em-dash tics, no corporate filler, never open with "I hope this finds you well."';

// ---------------------------------------------------------------------------
// Services intelligence block
// ---------------------------------------------------------------------------

export interface ServiceContextRow {
  id: string;
  name: string | null;
  description: string | null;
  value_proposition: string | null;
  base_price_cents: number | null;
  typical_timeline: string | null;
  is_bundle: boolean | null;
  ai_sales_context: unknown;
  pricing_intelligence: unknown;
}

/** Whole-service truncation budget so services never crowd out voice/facts. */
const SERVICES_BLOCK_MAX_CHARS = 1500;

function formatCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function firstSentence(text: string): string {
  const idx = text.search(/[.!?]\s/);
  return idx > 0 ? text.slice(0, idx + 1) : text;
}

function readBuyingSignals(salesContext: unknown): string[] {
  if (!salesContext || typeof salesContext !== "object") return [];
  const timing = (salesContext as { idealTiming?: { buyingSignals?: unknown } }).idealTiming;
  if (!timing || !Array.isArray(timing.buyingSignals)) return [];
  return timing.buyingSignals.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
}

function readFloorPriceCents(pricingIntelligence: unknown): number | null {
  if (!pricingIntelligence || typeof pricingIntelligence !== "object") return null;
  const floor = (pricingIntelligence as { floorPriceCents?: unknown }).floorPriceCents;
  return typeof floor === "number" && floor > 0 ? floor : null;
}

/**
 * Compact one-line-per-service intelligence for the operator context.
 * Pure and exported for tests. Services arrive active-first (display order);
 * truncation drops whole trailing services, never mid-line.
 */
export function formatServicesForContext(
  services: ServiceContextRow[],
  followOnNamesByServiceId?: Map<string, string[]>,
): string[] {
  const lines: string[] = [];
  let used = 0;

  for (const service of services) {
    if (!service.name) continue;

    const parts: string[] = [];
    const meta: string[] = [];
    if (service.base_price_cents && service.base_price_cents > 0) {
      meta.push(formatCents(service.base_price_cents));
    }
    const floor = readFloorPriceCents(service.pricing_intelligence);
    if (floor) meta.push(`floor ${formatCents(floor)}`);
    if (service.typical_timeline) meta.push(service.typical_timeline);
    if (service.is_bundle) meta.push("bundle");

    parts.push(meta.length > 0 ? `${service.name} (${meta.join(", ")})` : service.name);

    const pitch = service.value_proposition?.trim() || service.description?.trim();
    if (pitch) parts.push(firstSentence(pitch));

    const signals = readBuyingSignals(service.ai_sales_context).slice(0, 2);
    if (signals.length > 0) parts.push(`Buying signals: ${signals.join("; ")}`);

    const followOns = followOnNamesByServiceId?.get(service.id) ?? [];
    if (followOns.length > 0) parts.push(`Often leads to: ${followOns.join(", ")}`);

    const line = `- ${parts.join(" — ")}`;
    if (used + line.length + 1 > SERVICES_BLOCK_MAX_CHARS) break;
    lines.push(line);
    used += line.length + 1;
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Operator Memory Context (WHO the user is)
// ---------------------------------------------------------------------------

/**
 * Assembles operator memory context: identity, facts, business, and services.
 * This is WHO the user is — always injected so Salt understands them.
 *
 * Does NOT include voice — use `assembleOperatorVoice()` for drafting content.
 */
export async function assembleOperatorMemoryContext(
  options: OperatorContextOptions,
): Promise<string> {
  const { workspaceId, userId, maxFacts = DEFAULT_MAX_FACTS } = options;
  const admin = createAdminClient();

  const [profileRes, factsRes, workspaceRes, servicesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, display_name, role_title, job_title, timezone, location, working_hours, current_focus")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("operator_memory_facts")
      .select("value, category")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .limit(maxFacts),
    admin
      .from("workspaces")
      .select("name, tagline, description")
      .eq("id", workspaceId)
      .maybeSingle(),
    admin
      .from("workspace_services")
      .select(
        "id, name, description, value_proposition, base_price_cents, typical_timeline, is_bundle, ai_sales_context, pricing_intelligence",
      )
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(12),
  ]);

  const profile = profileRes.data;
  const sections: string[] = [];

  // Identity
  const name = profile?.full_name || profile?.display_name || "";
  const identityLines: string[] = [];
  if (name) identityLines.push(`Name: ${name}`);
  if (profile?.role_title || profile?.job_title)
    identityLines.push(`Role: ${profile.role_title || profile.job_title}`);
  if (profile?.timezone) identityLines.push(`Time zone: ${profile.timezone}`);
  if (profile?.location) identityLines.push(`Location: ${profile.location}`);
  if (profile?.working_hours) identityLines.push(`Working hours: ${profile.working_hours}`);
  if (profile?.current_focus) identityLines.push(`Current focus: ${profile.current_focus}`);
  if (identityLines.length > 0) {
    sections.push(`<identity>\n${identityLines.join("\n")}\n</identity>`);
  }

  // Facts (confirmed only)
  const facts = factsRes.data ?? [];
  if (facts.length > 0) {
    const factLines = facts.map((f) => `- ${f.value}`).join("\n");
    sections.push(`<facts>\n${factLines}\n</facts>`);
  }

  // Business
  const workspace = workspaceRes.data;
  const services = (servicesRes.data ?? []) as ServiceContextRow[];
  const businessLines: string[] = [];
  if (workspace?.name) businessLines.push(`Business: ${workspace.name}`);
  if (workspace?.tagline) businessLines.push(`Tagline: ${workspace.tagline}`);
  if (workspace?.description) businessLines.push(`About: ${workspace.description}`);
  if (businessLines.length > 0) {
    sections.push(`<business>\n${businessLines.join("\n")}\n</business>`);
  }

  // Services (intelligence-aware, budgeted)
  if (services.length > 0) {
    const serviceIds = services.map((s) => s.id);
    const nameById = new Map(services.map((s) => [s.id, s.name] as const));
    const { data: relationships } = await admin
      .from("service_relationships")
      .select("service_id, related_service_id")
      .eq("relationship_type", "follow_on")
      .in("service_id", serviceIds)
      .order("display_order", { ascending: true });

    const followOnNamesByServiceId = new Map<string, string[]>();
    for (const rel of relationships ?? []) {
      const relatedName = nameById.get(rel.related_service_id);
      if (!relatedName) continue;
      const existing = followOnNamesByServiceId.get(rel.service_id) ?? [];
      followOnNamesByServiceId.set(rel.service_id, [...existing, relatedName]);
    }

    const serviceLines = formatServicesForContext(services, followOnNamesByServiceId);
    if (serviceLines.length > 0) {
      sections.push(`<services>\n${serviceLines.join("\n")}\n</services>`);
    }
  }

  if (sections.length === 0) return "";

  return [
    "<operator-context>",
    "This is who the operator is. Use this context to understand them and personalize responses.",
    sections.join("\n"),
    "</operator-context>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Operator Voice (HOW the user writes)
// ---------------------------------------------------------------------------

/**
 * Format rules per surface — structure and length guidance that varies by channel.
 * Voice (tone, terminology) stays constant; format adapts to the medium.
 */
const SURFACE_FORMAT_RULES: Record<ContentSurface, string> = {
  Gmail:
    "Format: Email. Include appropriate greeting. Keep concise unless detailed response warranted. " +
    "Use the email signature if provided.",
  Slack:
    "Format: Chat message. Conversational, no signature. Can use line breaks for readability. " +
    "Keep brief — this is messaging, not email.",
  Notion:
    "Format: Document. Can use markdown headers, bullets, and structure. " +
    "Thorough is okay here — documents can be longer.",
  Memory:
    "Format: Internal note. Brief, factual, no greeting or signature. " +
    "This is for the operator's reference, not external communication.",
  Stripe:
    "Format: Payment/billing communication. Professional, clear, factual. " +
    "Include relevant amounts and dates. No ambiguity on money matters.",
  default: "",
};

/**
 * Assembles operator voice context: tone, spectrums, terminology, style guide.
 * This is HOW the user writes — only inject when drafting content FOR them.
 *
 * Use cases:
 * - Play execution (emails, proposals, messages)
 * - Draft tools in Ask Salt ("draft an email to...")
 *
 * NOT for: Salt's conversational responses (Salt has its own voice)
 */
export async function assembleOperatorVoice(
  options: Pick<OperatorContextOptions, "workspaceId" | "userId" | "surface">,
): Promise<string> {
  const { workspaceId, userId, surface = "default" } = options;
  const admin = createAdminClient();

  const [profileRes, voiceRes, brandRes] = await Promise.all([
    admin
      .from("profiles")
      .select("email_signature")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("operator_voice_profile")
      .select("voice_tone, voice_spectrums, voice_style_guide, learned_style, voice_terminology, inherits_workspace")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("workspace_brand_config")
      .select("voice_tone, voice_style_guide")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const voice = voiceRes.data;
  const brand = brandRes.data;

  // Merge workspace + personal voice, then convert to behavioral prompt
  const effectiveVoice = mergeVoice(
    {
      voiceTone: Array.isArray(brand?.voice_tone) ? (brand.voice_tone as string[]) : [],
      voiceSpectrums: null, // workspace doesn't have spectrums yet
      voiceArchetype: null,
      voiceStyleGuide: brand?.voice_style_guide ?? null,
      voiceTerminology: { preferred: [], avoid: [] },
    },
    {
      voiceTone: Array.isArray(voice?.voice_tone) ? voice.voice_tone.map(String) : [],
      voiceSpectrums: (voice?.voice_spectrums as VoiceSpectrums) ?? null,
      voiceArchetype: null,
      voiceStyleGuide: voice?.voice_style_guide ?? null,
      learnedStyle: voice?.learned_style ?? null,
      voiceTerminology: (voice?.voice_terminology as VoiceTerminology) ?? { preferred: [], avoid: [] },
      inheritsWorkspace: voice?.inherits_workspace ?? true,
    },
  );

  // Convert to behavioral prompt; fall back to humanized default if empty
  const voiceBlock = voiceToPrompt(effectiveVoice) || HUMANIZED_DEFAULT_STYLE;
  const voiceParts = [voiceBlock];

  // Add format rules for the content surface
  const formatRules = SURFACE_FORMAT_RULES[surface];
  if (formatRules) {
    voiceParts.push(formatRules);
  }

  // Include email signature only for email-like surfaces
  if (profile?.email_signature && surface === "Gmail") {
    voiceParts.push(`Email signature:\n${profile.email_signature}`);
  }

  return [
    "<operator-voice>",
    "Use this voice when drafting content on behalf of the operator. Match their tone, style, and terminology.",
    voiceParts.join("\n\n"),
    "</operator-voice>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Legacy facade (deprecated)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `assembleOperatorMemoryContext()` for conversation context
 * and `assembleOperatorVoice()` for drafting content. This function combines
 * both, which is only appropriate for play execution.
 */
export async function assembleOperatorContext(
  options: OperatorContextOptions,
): Promise<string> {
  const [memoryContext, voiceContext] = await Promise.all([
    assembleOperatorMemoryContext(options),
    assembleOperatorVoice({
      workspaceId: options.workspaceId,
      userId: options.userId,
      surface: options.surface,
    }),
  ]);

  const sections = [memoryContext, voiceContext].filter(Boolean);
  if (sections.length === 0) return "";

  return sections.join("\n\n");
}
