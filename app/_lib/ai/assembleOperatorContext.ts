import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

/**
 * assembleOperatorContext — the single assembly point (Exo shared-pipeline) that
 * builds the operator context block injected into every AI surface so Salt
 * thinks, acts, and sounds like the user.
 *
 * Rules baked in:
 * - Only CONFIRMED facts enter context (proposed facts never leak).
 * - Voice precedence: explicit personal style > learned style > workspace brand
 *   voice > humanized default.
 * - Emitted as a labeled, fenced block with explicit precedence.
 */

export interface OperatorContextOptions {
  workspaceId: string;
  userId: string;
  /** Cap on confirmed facts to control token budget. */
  maxFacts?: number;
}

const DEFAULT_MAX_FACTS = 40;

const HUMANIZED_DEFAULT_STYLE =
  "Write like a real person. Use contractions, vary sentence rhythm, have an opinion. " +
  'No em-dash tics, no corporate filler, never open with "I hope this finds you well."';

function resolveVoiceStyle(input: {
  personalStyle: string | null;
  learnedStyle: string | null;
  workspaceStyle: string | null;
}): { style: string; precedence: string } {
  if (input.personalStyle) return { style: input.personalStyle, precedence: "personal" };
  if (input.learnedStyle) return { style: input.learnedStyle, precedence: "learned" };
  if (input.workspaceStyle) return { style: input.workspaceStyle, precedence: "workspace" };
  return { style: HUMANIZED_DEFAULT_STYLE, precedence: "humanized-default" };
}

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

/**
 * Returns a fenced operator-context block, or an empty string when there's
 * nothing meaningful to inject (so callers can `.filter(Boolean)` it out).
 */
export async function assembleOperatorContext(
  options: OperatorContextOptions,
): Promise<string> {
  const { workspaceId, userId, maxFacts = DEFAULT_MAX_FACTS } = options;
  const admin = createAdminClient();

  const [profileRes, voiceRes, brandRes, factsRes, workspaceRes, servicesRes] =
    await Promise.all([
      admin
        .from("profiles")
        .select("full_name, display_name, role_title, job_title, timezone, location, working_hours, email_signature, current_focus")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("operator_voice_profile")
        .select("voice_tone, voice_style_guide, learned_style, voice_terminology, inherits_workspace")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("workspace_brand_config")
        .select("voice_tone, voice_style_guide")
        .eq("workspace_id", workspaceId)
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
  const voice = voiceRes.data;
  const brand = brandRes.data;

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

  // Voice (precedence resolved)
  const { style, precedence } = resolveVoiceStyle({
    personalStyle: voice?.voice_style_guide ?? null,
    learnedStyle: voice?.learned_style ?? null,
    workspaceStyle: brand?.voice_style_guide ?? null,
  });
  const tone: string[] = Array.isArray(voice?.voice_tone) && voice!.voice_tone.length > 0
    ? voice!.voice_tone.map(String)
    : Array.isArray(brand?.voice_tone)
      ? (brand!.voice_tone as unknown[]).map(String)
      : [];
  const terminology = voice?.voice_terminology as
    | { preferred?: string[]; avoid?: string[] }
    | null
    | undefined;
  const voiceLines: string[] = [`Style (source: ${precedence}): ${style}`];
  if (tone.length > 0) voiceLines.push(`Tone: ${tone.join(", ")}`);
  if (terminology?.preferred?.length) voiceLines.push(`Prefer words: ${terminology.preferred.join(", ")}`);
  if (terminology?.avoid?.length) voiceLines.push(`Avoid words/phrases: ${terminology.avoid.join(", ")}`);
  if (profile?.email_signature) voiceLines.push(`Email signature:\n${profile.email_signature}`);
  sections.push(`<voice>\n${voiceLines.join("\n")}\n</voice>`);

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
    "This is who you are acting and writing as. Match this voice and respect these facts. Voice precedence: explicit personal style > learned style > workspace voice > default.",
    sections.join("\n"),
    "</operator-context>",
  ].join("\n");
}
