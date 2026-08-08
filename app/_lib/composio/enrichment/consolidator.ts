import type {
  ConnectionCandidate,
  EnrichableEntityType,
  EnrichmentResult,
  ExtractedNote,
  ExtractorResult,
  ScanSummaryItem,
  SourcedField,
} from "./types";
import { getCaptureCategoryMap } from "../capture-categories";

export async function consolidateResults(
  entityType: EnrichableEntityType,
  results: ExtractorResult[]
): Promise<EnrichmentResult> {
  const fields: Record<string, SourcedField> = {};
  const orgs: ConnectionCandidate[] = [];
  const work: ConnectionCandidate[] = [];
  const people: ConnectionCandidate[] = [];
  const notes: ExtractedNote[] = [];
  const sourcesQueried: string[] = [];
  const sourcesWithData: string[] = [];
  const scanSummary: ScanSummaryItem[] = [];
  const categoryMap = await getCaptureCategoryMap();

  for (const result of results) {
    sourcesQueried.push(result.source);

    const providerKey = result.source.split(":")[0];
    const connectionCount =
      (result.connections?.orgs?.length ?? 0) +
      (result.connections?.work?.length ?? 0) +
      (result.connections?.people?.length ?? 0) +
      (result.connections?.billing?.length ?? 0) +
      (result.connections?.meetings?.length ?? 0) +
      (result.connections?.files?.length ?? 0);

    scanSummary.push({
      provider: providerKey,
      category: categoryMap.get(providerKey) ?? "unknown",
      fieldsExtracted: Object.keys(result.fields).length,
      connectionsFound: connectionCount,
      notesFound: result.notes?.length ?? 0,
      hadData: result.hasData,
    });

    if (!result.hasData) continue;
    sourcesWithData.push(result.source);

    for (const [fieldName, fieldData] of Object.entries(result.fields)) {
      const existing = fields[fieldName];
      const newField: SourcedField = {
        ...fieldData,
        source: result.source,
      };

      if (!existing || newField.confidence > existing.confidence) {
        fields[fieldName] = newField;
      }
    }

    if (result.connections?.orgs) {
      for (const org of result.connections.orgs) {
        if (!orgs.some((o) => o.name === org.name || (org.domain && o.domain === org.domain))) {
          orgs.push({ ...org, source: result.source });
        }
      }
    }

    if (result.connections?.work) {
      for (const w of result.connections.work) {
        if (!work.some((existing) => existing.name === w.name)) {
          work.push({ ...w, source: result.source });
        }
      }
    }

    if (result.connections?.people) {
      for (const p of result.connections.people) {
        if (!people.some((existing) => existing.email === p.email || existing.name === p.name)) {
          people.push({ ...p, source: result.source });
        }
      }
    }

    if (result.notes) {
      for (const note of result.notes) {
        notes.push({ ...note, source: result.source });
      }
    }
  }

  return {
    entityType,
    fields,
    connections: {
      ...(orgs.length > 0 && { orgs }),
      ...(work.length > 0 && { work }),
      ...(people.length > 0 && { people }),
    },
    notes,
    sourcesQueried,
    sourcesWithData,
    scanSummary,
  };
}
