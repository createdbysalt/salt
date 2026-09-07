/**
 * Play presentation contract — the single builder that turns a playbook run
 * into the metadata the play card + detail modal render (headline, "Prepared
 * for you" artifacts, "How Salt knew" evidence, per-run connector logos).
 *
 * Single source of truth: the executor (`schema/v2/executor.ts`) writes runs
 * through this, and `scripts/setup-demo-account.ts` seeds demo rows through
 * the same shape — demo data can never drift from what real runs produce.
 *
 * Connector-agnostic by construction: everything keys off per-step provenance
 * (which provider/tool actually ran), never off the playbook's app. A new
 * connector inherits the full UI treatment via the registry resolver.
 */

import type { PlayArtifact } from "../play-card/types";
import type { PlaybookOutputType } from "../playbooks/schema/v2/types";
import { buildPlayHeadline, type PlayEvidenceItem } from "./play-headline";
import { extractArtifactUrl } from "./artifact-links";
import { draftAddresseeLabel } from "./draft-preview";
import {
  collectPayLinksFromStepData,
  ensureDraftPaymentLink,
} from "./draft-payment-link";
import { attachEvidenceSourceLinks } from "./evidence-source-links";
import type { PlayPresentation } from "../types";

/** Evidence/artifacts Salt produced from its own data (Memory, captures). */
export const SALT_APP_ID = "salt";

const MAX_CONNECTOR_LOGOS = 3;

/**
 * Where a step's data came from — recorded by the executor per step so the
 * presentation layer never guesses.
 */
export interface StepProvenance {
  stepId: string;
  kind: "fetch" | "classify" | "draft" | "action" | "agent";
  /** connector = external app; memory/capture/salt = Salt's own data. */
  source: "connector" | "memory" | "capture" | "salt";
  /** Registry provider key (e.g. "stripe", "gmail") for connector steps. */
  provider?: string | null;
  /** Concrete tool that ran (e.g. "STRIPE_LIST_CHARGES"). */
  toolSlug?: string | null;
  /** Playbook requirement category (e.g. "billing") for connector fetches. */
  category?: string | null;
  /**
   * Agent steps only: every tool the model actually invoked (audit trail —
   * the evidence timeline doubles as the record of what the agent touched).
   */
  toolSlugs?: string[];
  /** Agent steps only: provider keys for the tools that ran, for logos. */
  providers?: string[];
}

/** What the presentation layer needs to know about a provider. */
export interface ProviderPresentation {
  /** Connector catalog id for glyphs ("stripe", "google", ...). */
  catalogId: string;
  /** Human label ("Stripe", "Gmail"). */
  label: string;
  /** Generic "Open in X" fallback from connector_catalog links. */
  dashboardUrl: string | null;
}

export type ProviderPresentationResolver = (
  provider: string
) => ProviderPresentation | null;

export interface BuildPlayPresentationInput {
  playbookName: string;
  playbookSlug?: string | null;
  section: string | null;
  layer: "learn" | "act";
  outputType: PlaybookOutputType;
  /** Provenance for each step that ran, in execution order. */
  steps: readonly StepProvenance[];
  /** Step outputs keyed by step id (Map or plain object). */
  stepData: ReadonlyMap<string, unknown> | Record<string, unknown>;
  /** Run title — headline fallback when no template applies. */
  subject: string;
  /** Signal that fired the run ("Payment received in Stripe"). */
  triggerLabel?: string | null;
  /** Entity the run is about ("Meridian Studio"). */
  targetLabel?: string | null;
  /** Display channel when known ("Gmail", "Slack"). */
  channel?: string | null;
  /** Provider key behind the channel ("gmail") — the app a prepared draft
   * will be sent through. Counts toward connector logos even though no tool
   * call ran against it yet: the run visibly involves that app. */
  channelProvider?: string | null;
  /** Recipient display label when known. */
  recipientLabel?: string | null;
  /** Memory entity this run is about — used to link "How Salt knew". */
  entitySurface?: string | null;
  entityId?: string | null;
  resolveProvider: ProviderPresentationResolver;
}

function lookupStepData(
  stepData: BuildPlayPresentationInput["stepData"],
  stepId: string
): unknown {
  if (stepData instanceof Map) return stepData.get(stepId);
  return (stepData as Record<string, unknown>)[stepId];
}

/** "payment_details" → "payment details" */
function humanizeStepId(stepId: string): string {
  return stepId.replace(/[-_]+/g, " ").trim();
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** Draft step data is a string, or a forEach list of { item, draft }. */
function extractDraftText(data: unknown): string | null {
  if (typeof data === "string" && data.trim().length > 0) return data;
  if (Array.isArray(data)) {
    for (const entry of data) {
      const draft =
        entry !== null && typeof entry === "object"
          ? (entry as { draft?: unknown }).draft
          : null;
      if (typeof draft === "string" && draft.trim().length > 0) return draft;
    }
  }
  return null;
}

function findClientNameInStepData(
  stepData: BuildPlayPresentationInput["stepData"]
): string | null {
  const values =
    stepData instanceof Map ? [...stepData.values()] : Object.values(stepData);
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const client = (value as { client?: unknown }).client;
    if (!client || typeof client !== "object") continue;
    const name = (client as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

function resolveRecipientLabel(
  input: BuildPlayPresentationInput,
  draftBody: string | null
): string | null {
  if (input.outputType !== "email_draft") {
    return input.recipientLabel ?? null;
  }
  const client = findClientNameInStepData(input.stepData);
  if (client) return client;
  return draftAddresseeLabel({
    recipientLabel: input.recipientLabel,
    draftText: draftBody,
  });
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function buildEvidenceItem(
  step: StepProvenance,
  input: BuildPlayPresentationInput
): PlayEvidenceItem | null {
  const human = humanizeStepId(step.stepId);

  if (step.kind === "classify") {
    return { label: `Classified the ${human} results`, appId: SALT_APP_ID };
  }

  if (step.kind === "agent") {
    const used = step.toolSlugs ?? [];
    if (used.length === 0) {
      return { label: `Ran an agent step for ${human}`, appId: SALT_APP_ID };
    }
    const labels = (step.providers ?? [])
      .map((key) => input.resolveProvider(key)?.label)
      .filter((label): label is string => Boolean(label));
    return {
      label:
        labels.length > 0
          ? `Researched ${[...new Set(labels)].join(", ")} for ${human}`
          : `Ran ${used.length} tool ${used.length === 1 ? "call" : "calls"} for ${human}`,
      appId: SALT_APP_ID,
    };
  }

  if (step.kind !== "fetch") return null;

  if (step.source === "memory") {
    return { label: `Read ${human} from Memory`, appId: SALT_APP_ID };
  }

  if (step.source === "capture") {
    return {
      label: `Looked at ${human} in your captured activity`,
      appId: SALT_APP_ID,
    };
  }

  // Connector fetch — glyph + deep link to what Salt read.
  const provider = step.provider ? input.resolveProvider(step.provider) : null;
  const data = lookupStepData(input.stepData, step.stepId);
  const url =
    (step.toolSlug ? extractArtifactUrl(step.toolSlug, data) : null) ??
    provider?.dashboardUrl ??
    null;

  return {
    label: provider
      ? `Checked ${provider.label} for ${human}`
      : `Checked a connected app for ${human}`,
    url,
    appLabel: provider?.label ?? null,
    appId: provider?.catalogId ?? null,
  };
}

function buildArtifact(
  step: StepProvenance,
  input: BuildPlayPresentationInput
): PlayArtifact | null {
  const data = lookupStepData(input.stepData, step.stepId);

  if (step.kind === "draft") {
    // email_draft drafts render as the card's acting body — duplicating them
    // as artifacts would show the same text twice.
    if (input.outputType === "email_draft") return null;
    const text = extractDraftText(data);
    if (!text) return null;
    return {
      appId: SALT_APP_ID,
      label: `${input.playbookName} draft`,
      draftBody: splitParagraphs(text),
    };
  }

  if (step.kind !== "action") return null;

  // Only executed actions produced something linkable.
  const wrapper =
    data !== null && typeof data === "object"
      ? (data as { executed?: unknown; result?: unknown })
      : null;
  if (wrapper?.executed !== true) return null;

  const provider = step.provider ? input.resolveProvider(step.provider) : null;
  const url =
    (step.toolSlug ? extractArtifactUrl(step.toolSlug, wrapper.result) : null) ??
    provider?.dashboardUrl ??
    null;

  return {
    appId: provider?.catalogId ?? SALT_APP_ID,
    label: capitalize(humanizeStepId(step.stepId)),
    url,
  };
}

/**
 * Build the full presentation for a run. Pure: the executor supplies a
 * provider resolver backed by the connector registry; tests supply stubs.
 */
export function buildPlayPresentation(
  input: BuildPlayPresentationInput
): PlayPresentation {
  const evidence: PlayEvidenceItem[] = [];
  const artifacts: PlayArtifact[] = [];
  const connectorIds: string[] = [];
  let draftBody: string | null = null;

  if (input.triggerLabel?.trim()) {
    evidence.push({ label: input.triggerLabel.trim(), appId: SALT_APP_ID });
  }

  for (const step of input.steps) {
    const evidenceItem = buildEvidenceItem(step, input);
    if (evidenceItem) evidence.push(evidenceItem);

    const artifact = buildArtifact(step, input);
    if (artifact) artifacts.push(artifact);

    if (step.kind === "draft" && draftBody === null) {
      draftBody = extractDraftText(lookupStepData(input.stepData, step.stepId));
    }

    if (step.source === "connector" && step.provider) {
      const provider = input.resolveProvider(step.provider);
      if (
        provider &&
        !connectorIds.includes(provider.catalogId) &&
        connectorIds.length < MAX_CONNECTOR_LOGOS
      ) {
        connectorIds.push(provider.catalogId);
      }
    }

    // Agent steps touch several apps in one step — every one counts toward
    // the run's logos (apps actually used, never section defaults).
    for (const providerKey of step.providers ?? []) {
      const provider = input.resolveProvider(providerKey);
      if (
        provider &&
        !connectorIds.includes(provider.catalogId) &&
        connectorIds.length < MAX_CONNECTOR_LOGOS
      ) {
        connectorIds.push(provider.catalogId);
      }
    }
  }

  // The delivery channel's app is part of the run even when no tool executed
  // against it yet (a Gmail draft prepared for approval involves Gmail).
  if (input.channelProvider) {
    const provider = input.resolveProvider(input.channelProvider);
    if (
      provider &&
      !connectorIds.includes(provider.catalogId) &&
      connectorIds.length < MAX_CONNECTOR_LOGOS
    ) {
      connectorIds.push(provider.catalogId);
    }
  }

  if (draftBody) {
    draftBody = ensureDraftPaymentLink(
      draftBody,
      collectPayLinksFromStepData(input.stepData)
    );
  }

  const linkedEvidence = attachEvidenceSourceLinks(evidence, {
    targetType: input.entitySurface,
    targetId: input.entityId,
    invoiceContext: lookupStepData(input.stepData, "invoice_context"),
    verifyText: lookupStepData(input.stepData, "verify_unpaid"),
    artifacts,
    extraUrls: collectPayLinksFromStepData(input.stepData).map((link) => link.url),
  });

  return {
    section: input.section,
    layer: input.layer,
    outputType: input.outputType,
    playbookName: input.playbookName,
    headline: buildPlayHeadline({
      subject: input.subject,
      targetLabel: input.targetLabel,
      recipientLabel: resolveRecipientLabel(input, draftBody),
      draftText: draftBody,
      playbookName: input.playbookName,
      playbookSlug: input.playbookSlug,
      outputType: input.outputType,
    }),
    artifacts,
    evidence: linkedEvidence,
    connectorIds,
    draftBody,
    recipientLabel: resolveRecipientLabel(input, draftBody),
    channel: input.channel ?? null,
  };
}

/**
 * Shape a presentation into the `play_runs.metadata` JSON the card mapper
 * (`resolveV2PlaybookFromMetadata`) and the detail modal read. Key names are
 * the contract — the demo seed uses this same builder so seeded rows and
 * real runs can never drift apart.
 */
export function buildPlayRunMetadata(
  presentation: PlayPresentation
): Record<string, unknown> {
  return {
    section: presentation.section,
    layer: presentation.layer,
    output_type: presentation.outputType,
    playbook_name: presentation.playbookName,
    headline: presentation.headline,
    evidence: presentation.evidence,
    artifacts: presentation.artifacts,
    connector_ids: presentation.connectorIds,
  };
}
