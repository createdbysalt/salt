/**
 * Plays Activity is act-layer only. Memory Care (and retired Keeper) learn-layer
 * runs belong on Memory → Filter / record Activity.
 */

/**
 * True when an activity row is Memory Care / retired Keeper learn-layer work.
 */
export function isMemoryCareActivityMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata) return false;
  const source = metadata.source;
  if (source === "memory-care") return true;
  const player = metadata.player_slug ?? metadata.playerSlug;
  return player === "memory-care" || player === "keeper";
}

/** Retired `_meta` playbook slugs now owned by Memory Care. */
const RETIRED_CARE_PLAYBOOK_SLUGS = new Set([
  "memory-records",
  "memory-hygiene",
  "connections",
  "notes",
]);

/**
 * True when a play run is learn-layer work: atomic system memory ops
 * (source "system") or runs attributed to retired Care playbooks.
 */
export function isMemoryCarePlayRun(row: {
  source_context?: {
    source?: string;
    playbook_slug?: string;
  } | null;
}): boolean {
  const context = row.source_context;
  if (!context) return false;
  if (context.source === "system") return true;
  return (
    typeof context.playbook_slug === "string" &&
    RETIRED_CARE_PLAYBOOK_SLUGS.has(context.playbook_slug)
  );
}

/**
 * Resolves a playbook slug to its layer — null when the slug is not a live
 * YAML playbook (retired Care slugs, legacy keeper-* slugs, deleted customs).
 */
export type PlaybookLayerResolver = (slug: string) => "learn" | "act" | null;

/**
 * Plays Activity visibility, as an allowlist rather than a blocklist: a run
 * belongs here only when it is act-layer work —
 *   - an Ask Salt or manual action (no playbook attribution), or
 *   - a run attributed to a live act-layer playbook.
 *
 * Everything else — retired Memory Care playbooks, legacy keeper-* slugs,
 * system runs, and historical rows with empty source_context — is learn-layer
 * audit history and belongs on Memory surfaces, not here. The blocklist
 * approach leaked every legacy slug variant; the allowlist cannot.
 */
export function isActLayerPlayRun(
  row: {
    source_context?: {
      source?: string;
      playbook_slug?: string;
      user_approved_at?: string;
    } | null;
  },
  resolveLayer: PlaybookLayerResolver,
): boolean {
  const context = row.source_context;
  const source = context?.source;
  if (source === "ask_salt" || source === "manual") return true;
  const slug = context?.playbook_slug;
  if (!slug) return false;
  return resolveLayer(slug) === "act";
}
