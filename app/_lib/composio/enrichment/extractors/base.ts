import type { ConnectorCategory, EnrichableEntityType, EnrichmentSeed, ExtractorResult } from "../types";

export interface ExtractorContext {
  workspaceId: string;
  entityType: EnrichableEntityType;
  seed: EnrichmentSeed;
  connectorToolkit: string;
}

export interface Extractor {
  category: ConnectorCategory;
  supportedToolkits: string[];
  extract(ctx: ExtractorContext): Promise<ExtractorResult>;
}

export function emptyResult(source: string): ExtractorResult {
  return {
    source,
    fields: {},
    hasData: false,
  };
}
