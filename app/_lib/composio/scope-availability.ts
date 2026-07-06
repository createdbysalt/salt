/**
 * Scope-aware tool availability (launch checklist 2.4, decided 2026-07-06).
 *
 * A connector's OAuth grant is a hard provider-side wall: no classification
 * or toggle can exceed it. This module decides whether a tool is PROVABLY
 * unavailable under the grant, so the Tools UI can hide it.
 *
 * Certainty rules (founder: "make 100% certain before you take anything
 * out") — Composio's per-tool scope lists are known to be incomplete for
 * some read endpoints (e.g. GMAIL_LIST_LABELS lists only gmail.labels while
 * Google's endpoint also accepts gmail.readonly), so:
 *   - hide ONLY write-class tools (mutating) whose accepted scopes share
 *     nothing with the expanded grant — a write cannot run under read-only
 *     scopes, so the emptiness is conclusive
 *   - read-class tools are NEVER hidden by scope data (incomplete lists
 *     could hide a working tool)
 *   - tools with no scope data, or providers with no known grant, are never
 *     filtered
 * The grant is expanded through Google's scope-superset hierarchy before
 * comparison so broad grants (e.g. full drive) satisfy narrow requirements.
 */

/** Broad scope → the narrower scopes it fully covers. */
const SCOPE_SUPERSETS: Record<string, readonly string[]> = {
  "https://mail.google.com/": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.metadata",
    "https://www.googleapis.com/auth/gmail.insert",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/gmail.settings.sharing",
  ],
  "https://www.googleapis.com/auth/gmail.modify": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.metadata",
    "https://www.googleapis.com/auth/gmail.insert",
  ],
  "https://www.googleapis.com/auth/gmail.readonly": [
    "https://www.googleapis.com/auth/gmail.metadata",
  ],
  "https://www.googleapis.com/auth/drive": [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.photos.readonly",
  ],
  "https://www.googleapis.com/auth/drive.readonly": [
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ],
  "https://www.googleapis.com/auth/calendar": [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/calendar.settings.readonly",
  ],
  "https://www.googleapis.com/auth/calendar.events": [
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ],
  "https://www.googleapis.com/auth/spreadsheets": [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
  "https://www.googleapis.com/auth/documents": [
    "https://www.googleapis.com/auth/documents.readonly",
  ],
  "https://www.googleapis.com/auth/presentations": [
    "https://www.googleapis.com/auth/presentations.readonly",
  ],
};

/** Grant scopes expanded to everything they cover. */
export function expandGrantScopes(grantScopes: readonly string[]): Set<string> {
  const expanded = new Set<string>();
  for (const scope of grantScopes) {
    expanded.add(scope);
    for (const covered of SCOPE_SUPERSETS[scope] ?? []) {
      expanded.add(covered);
    }
  }
  return expanded;
}

/**
 * True when the tool is PROVABLY not executable under the grant. Anything
 * uncertain returns false (visible).
 */
export function isToolProvablyUnavailable(input: {
  /** Provider-accepted scopes for the tool (any-of). Null/empty = unknown. */
  toolScopes: readonly string[] | null;
  /** Scopes the connector's auth config requests. Null/empty = unknown. */
  grantScopes: readonly string[] | null;
  risk: "read" | "mutating" | "destructive";
}): boolean {
  const { toolScopes, grantScopes, risk } = input;
  // Read-class scope lists are incomplete upstream — never certain enough.
  if (risk === "read") return false;
  if (!toolScopes || toolScopes.length === 0) return false;
  if (!grantScopes || grantScopes.length === 0) return false;

  const granted = expandGrantScopes(grantScopes);
  return !toolScopes.some((scope) => granted.has(scope));
}
