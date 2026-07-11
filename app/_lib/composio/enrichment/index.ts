import "server-only";

import type {
  ConnectorCategory,
  EnrichableEntityType,
  EnrichmentRequest,
  EnrichmentResult,
  ExtractorResult,
} from "./types";
import { getCategoriesForEntity, getCategoryForConnector } from "./registry";
import { consolidateResults } from "./consolidator";
import type { Extractor, ExtractorContext } from "./extractors/base";
import { emptyResult } from "./extractors/base";
import { gmailExtractor } from "./extractors/gmail";
import { calendarExtractor } from "./extractors/calendar";
import { stripeExtractor } from "./extractors/stripe";
import { driveExtractor } from "./extractors/drive";
import { createConfigBasedExtractor, isConfigBasedToolkit } from "./extractors/config-based";
import { getConnectionStatus } from "../connections";
import { ASK_SALT_CONNECTOR_MANIFEST } from "../connector-manifest";

const MAX_PARALLEL_EXTRACTORS = 5;
const EXTRACTOR_TIMEOUT_MS = 10_000;

const LEGACY_EXTRACTORS: Extractor[] = [
  gmailExtractor,
  calendarExtractor,
  stripeExtractor,
  driveExtractor,
];

function getExtractorForToolkit(toolkit: string, category: ConnectorCategory): Extractor | null {
  if (isConfigBasedToolkit(toolkit)) {
    return createConfigBasedExtractor(toolkit, category);
  }
  return LEGACY_EXTRACTORS.find((e) => e.category === category) ?? null;
}

async function getConnectedToolkits(workspaceId: string): Promise<string[]> {
  const connected: string[] = [];

  for (const entry of ASK_SALT_CONNECTOR_MANIFEST) {
    try {
      const status = await getConnectionStatus(entry.toolkit, workspaceId);
      if (status.connected) {
        connected.push(entry.toolkit);
      }
    } catch {
      // Skip failed connection checks
    }
  }

  return connected;
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

  const neededCategories = getCategoriesForEntity(entityType);
  console.log("[enrichEntity] Needed categories:", neededCategories);

  const connectedToolkits = await getConnectedToolkits(workspaceId);
  console.log("[enrichEntity] Connected toolkits:", connectedToolkits);

  const categoryToToolkit = new Map<ConnectorCategory, string>();
  for (const toolkit of connectedToolkits) {
    const category = getCategoryForConnector(toolkit);
    console.log("[enrichEntity] Toolkit", toolkit, "→ category:", category);
    if (category && neededCategories.includes(category) && !categoryToToolkit.has(category)) {
      categoryToToolkit.set(category, toolkit);
    }
  }

  console.log("[enrichEntity] Category→Toolkit map:", Object.fromEntries(categoryToToolkit));

  if (categoryToToolkit.size === 0) {
    console.log("[enrichEntity] No matching categories, returning empty");
    return {
      entityType,
      fields: {},
      connections: {},
      notes: [],
      sourcesQueried: [],
      sourcesWithData: [],
    };
  }

  const extractorTasks: Array<{ extractor: Extractor; toolkit: string }> = [];
  for (const [category, toolkit] of categoryToToolkit.entries()) {
    const extractor = getExtractorForToolkit(toolkit, category);
    const extractorType = isConfigBasedToolkit(toolkit) ? "config-based" : "legacy";
    console.log("[enrichEntity] Toolkit", toolkit, "→ extractor:", extractor?.category ?? "none", `(${extractorType})`);
    if (extractor) {
      extractorTasks.push({ extractor, toolkit });
    }
  }

  console.log("[enrichEntity] Running", extractorTasks.length, "extractors");
  const limitedTasks = extractorTasks.slice(0, MAX_PARALLEL_EXTRACTORS);

  const results = await Promise.all(
    limitedTasks.map(({ extractor, toolkit }) => {
      const ctx: ExtractorContext = {
        workspaceId,
        entityType,
        seed,
        connectorToolkit: toolkit,
      };
      return runExtractorWithTimeout(extractor, ctx);
    })
  );

  console.log("[enrichEntity] Results:", JSON.stringify(results, null, 2));
  return consolidateResults(entityType, results);
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
