import "server-only";

import type {
  ConnectorCategory,
  EnrichableEntityType,
  EnrichmentRequest,
  EnrichmentResult,
  ExtractorResult,
} from "./types";
import { getCategoryForConnector } from "./registry";
import { consolidateResults } from "./consolidator";
import type { Extractor, ExtractorContext } from "./extractors/base";
import { emptyResult } from "./extractors/base";
import { gmailExtractor } from "./extractors/gmail";
import { calendarExtractor } from "./extractors/calendar";
import { stripeExtractor } from "./extractors/stripe";
import { driveExtractor } from "./extractors/drive";
import { createConfigBasedExtractor, isConfigBasedToolkit } from "./extractors/config-based";
import {
  getConnectedProvidersForEnrichment,
  logDiscoverySummary,
  hasConnectorManifest,
  type EnrichmentProvider,
} from "./discovery";
import { enrichViaCapability } from "./capability-enricher";

const MAX_PARALLEL_EXTRACTORS = 5;
const EXTRACTOR_TIMEOUT_MS = 10_000;

const LEGACY_EXTRACTORS: Extractor[] = [
  gmailExtractor,
  calendarExtractor,
  stripeExtractor,
  driveExtractor,
];

const TOOLKIT_EXTRACTOR_OVERRIDES: Partial<Record<string, Extractor>> = {
  // Legacy Gmail performs full message fetch + signature parsing; config manifest
  // only searches message stubs and uses JSONPath headers lodash cannot resolve.
  gmail: gmailExtractor,
};

function getExtractorForToolkit(toolkit: string, category: ConnectorCategory): Extractor | null {
  const override = TOOLKIT_EXTRACTOR_OVERRIDES[toolkit];
  if (override) {
    return override;
  }
  if (isConfigBasedToolkit(toolkit)) {
    return createConfigBasedExtractor(toolkit, category);
  }
  return LEGACY_EXTRACTORS.find((e) => e.category === category) ?? null;
}

async function runExtractorWithTimeout(
  extractor: Extractor,
  ctx: ExtractorContext
): Promise<ExtractorResult> {
  const timeoutPromise = new Promise<ExtractorResult>((resolve) => {
    setTimeout(() => {
      resolve(emptyResult(`${extractor.category}:timeout`));
    }, EXTRACTOR_TIMEOUT_MS);
  });

  try {
    return await Promise.race([extractor.extract(ctx), timeoutPromise]);
  } catch (error) {
    console.error(`[enrichment] Extractor ${extractor.category} failed:`, error);
    return emptyResult(`${extractor.category}:error`);
  }
}

export async function enrichEntity(request: EnrichmentRequest): Promise<EnrichmentResult> {
  const { entityType, seed, workspaceId } = request;
  console.log("[enrichEntity] Starting enrichment for:", entityType, "seed:", seed);

  const connectedProviders = await getConnectedProvidersForEnrichment(workspaceId, entityType);
  logDiscoverySummary(entityType, connectedProviders);

  if (connectedProviders.length === 0) {
    console.log("[enrichEntity] No connected providers for", entityType);
    return {
      entityType,
      fields: {},
      connections: {},
      notes: [],
      sourcesQueried: [],
      sourcesWithData: [],
    };
  }

  const extractorTasks: Array<{ extractor: Extractor; provider: EnrichmentProvider }> = [];
  const capabilityFallbackProviders: EnrichmentProvider[] = [];

  for (const provider of connectedProviders) {
    const extractor = getExtractorForToolkit(provider.provider, provider.category);

    if (extractor) {
      const extractorType = TOOLKIT_EXTRACTOR_OVERRIDES[provider.provider]
        ? "legacy-override"
        : isConfigBasedToolkit(provider.provider)
          ? "config-based"
          : "legacy";
      console.log(
        "[enrichEntity] Provider",
        provider.provider,
        "→ extractor:",
        extractor.category,
        `(${extractorType})`
      );
      extractorTasks.push({ extractor, provider });
    } else if (hasConnectorManifest(provider.provider)) {
      console.log(
        "[enrichEntity] Provider",
        provider.provider,
        "→ manifest exists but no extractor (config-based may not be implemented)"
      );
    } else {
      console.log(
        "[enrichEntity] Provider",
        provider.provider,
        "→ no manifest, will try capability fallback"
      );
      capabilityFallbackProviders.push(provider);
    }
  }

  console.log("[enrichEntity] Running", extractorTasks.length, "extractors +", capabilityFallbackProviders.length, "capability fallbacks");

  const limitedExtractorTasks = extractorTasks.slice(0, MAX_PARALLEL_EXTRACTORS);
  const remainingSlots = MAX_PARALLEL_EXTRACTORS - limitedExtractorTasks.length;
  const limitedCapabilityTasks = capabilityFallbackProviders.slice(0, remainingSlots);

  const extractorResults = await Promise.all(
    limitedExtractorTasks.map(({ extractor, provider }) => {
      const ctx: ExtractorContext = {
        workspaceId,
        entityType,
        seed,
        connectorToolkit: provider.provider,
      };
      return runExtractorWithTimeout(extractor, ctx);
    })
  );

  const capabilityResults = await Promise.all(
    limitedCapabilityTasks.map(async (provider) => {
      const result = await enrichViaCapability(
        workspaceId,
        provider.provider,
        entityType,
        seed
      );

      if (!result.supported) {
        console.log(
          "[enrichEntity] Capability fallback skipped for",
          provider.provider,
          ":",
          result.reason
        );
        return emptyResult(provider.provider);
      }

      if (result.result) {
        console.log(
          "[enrichEntity] Capability fallback for",
          provider.provider,
          "via",
          result.capability,
          "→",
          result.result.hasData ? "found data" : "no data"
        );
        return result.result;
      }

      return emptyResult(provider.provider);
    })
  );

  const allResults = [...extractorResults, ...capabilityResults];
  console.log("[enrichEntity] Results:", JSON.stringify(allResults, null, 2));
  return consolidateResults(entityType, allResults);
}

export type { EnrichmentRequest, EnrichmentResult, EnrichableEntityType } from "./types";

export {
  logExtractionOutcome,
  logBatchOutcomes,
  getCalibrationReport,
  formatCalibrationReport,
  clearCalibrationData,
  getOutcomeCount,
  isWellCalibrated,
  getUnderperformingBuckets,
  type ExtractionOutcome,
  type CalibrationReport,
  type ConfidenceBucket,
} from "./calibration";
