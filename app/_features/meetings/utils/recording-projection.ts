/**
 * recording_url projection (Phase 7).
 *
 * meeting_transcripts.recording_url is being deprecated in favor of
 * recording-type artifact Resources attached to the meeting
 * (fireflies_transcript, otter_transcript, loom_video). While both exist,
 * the column wins (read-compat); the projection fills the gap for
 * artifact-first rows that never wrote the column.
 */

export type RecordingArtifact = {
  externalUrl?: string | null;
  resourceType?: string | null;
};

const RECORDING_RESOURCE_TYPES = new Set([
  "fireflies_transcript",
  "otter_transcript",
  "loom_video",
]);

export function projectRecordingUrl(
  columnUrl: string | null | undefined,
  artifacts: RecordingArtifact[] | undefined,
): string | undefined {
  if (columnUrl) return columnUrl;
  for (const artifact of artifacts ?? []) {
    if (
      artifact.externalUrl &&
      artifact.resourceType &&
      RECORDING_RESOURCE_TYPES.has(artifact.resourceType)
    ) {
      return artifact.externalUrl;
    }
  }
  return undefined;
}
