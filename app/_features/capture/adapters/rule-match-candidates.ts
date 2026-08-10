import type { CaptureEnvelope, ConnectorRuleEntityType } from "./types";

/**
 * Rule match candidates (S5 vocabulary expansion): the per-capture strings
 * the pattern/people entity types match against — subjects, titles, message
 * text, file names, attendee/participant emails. Extracted once from the
 * normalized envelope so every category adapter participates without new
 * adapter code; a candidate is omitted when the envelope doesn't carry it.
 *
 * Pure module: no server-only imports, safe for client components.
 */

export type RuleMatchCandidates = Partial<
  Record<ConnectorRuleEntityType, string[]>
>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

export function ruleMatchCandidatesForEnvelope(
  envelope: CaptureEnvelope,
): RuleMatchCandidates {
  const extracted = envelope.extracted as Record<string, unknown>;
  const candidates: RuleMatchCandidates = {};

  const subject = asString(extracted.subject);
  if (subject) candidates.subject_pattern = [subject];

  const title =
    asString(extracted.title) ?? asString(extracted.summary) ?? envelope.title;
  if (title) candidates.title_pattern = [title];

  const text = asString(extracted.text);
  if (text) candidates.keyword = [text];

  const fileName = asString(extracted.file_name);
  if (fileName) candidates.name_pattern = [fileName];

  const people = new Set<string>();
  for (const participant of envelope.participants) {
    if (participant.email) people.add(participant.email.toLowerCase());
  }
  // Meetings payloads carry a names-or-emails list under
  // extracted.participants; only the emails are matchable keys.
  const extractedParticipants = extracted.participants;
  if (Array.isArray(extractedParticipants)) {
    for (const entry of extractedParticipants) {
      if (typeof entry === "string" && entry.includes("@")) {
        people.add(entry.toLowerCase());
      }
    }
  }
  if (people.size > 0) {
    const emails = [...people];
    candidates.attendee = emails;
    candidates.participant = emails;
  }

  return candidates;
}
