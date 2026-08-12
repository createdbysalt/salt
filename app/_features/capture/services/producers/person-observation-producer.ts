import { z } from "zod";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { sendLlm, backgroundSpend } from "@/app/_lib/ai/gpt";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import { insertSaltNote } from "@/app/_features/memory/services/salt-notes";
import type { CaptureEnvelope } from "../../adapters/types";

/**
 * Track F: observation detection for person notes. Reads the text a capture
 * already carries (email snippet, meeting summary + action items), judges
 * whether anything is note-worthy for a resolved person, and appends a Salt
 * note with the capture as its source. The person_notes field is
 * entity-notes-backed (no column), so the note insert IS the write;
 * runCareForSignal records the signal for the evidence chain.
 */

const MIN_TEXT_CHARS = 40;
const MAX_OBSERVATIONS_PER_CAPTURE = 3;

const ObservationSchema = z.object({
  observations: z
    .array(
      z.object({
        personEmail: z.string().nullish(),
        content: z.string().min(10).max(300),
        noteKind: z.enum(["fact", "preference", "context", "relationship", "flag"]),
        confidence: z.number().int().min(0).max(100),
      }),
    )
    .max(MAX_OBSERVATIONS_PER_CAPTURE),
});

const OBSERVATION_PROMPT = `You are reading a business email excerpt or meeting summary for a solo professional.
Decide what is worth a dated note on a person's record.

Worth a note: decisions in their own words, commitments with dates, role or company changes, relationship milestones, life context they volunteered, how they prefer to work.
Never worth a note: scheduling logistics, small talk, pleasantries, anything stale within a month.

Known participants (only attribute observations to these people):
{{ROSTER}}

Return ONLY valid JSON:
{ "observations": [ { "personEmail": "jane@example.com", "content": "...", "noteKind": "fact", "confidence": 88 } ] }

Rules:
- content: one sentence, dated context included when known (e.g. "said 2026-08-10"). Never quote more than a phrase.
- noteKind: fact | preference | context | relationship | flag.
- confidence: 90+ only if they said it themselves, plainly. Below 70, omit the observation.
- Return an empty observations array when nothing clears the bar. At most ${MAX_OBSERVATIONS_PER_CAPTURE} observations.`;

function observationText(envelope: CaptureEnvelope): string | null {
  const parts: string[] = [];
  if (envelope.title) parts.push(`Subject/title: ${envelope.title}`);
  const snippet = envelope.extracted.snippet;
  const summary = envelope.extracted.summary;
  const actionItems = envelope.extracted.action_items;
  if (typeof snippet === "string" && snippet.trim()) {
    parts.push(`Email excerpt: ${snippet.trim()}`);
  }
  if (typeof summary === "string" && summary.trim()) {
    parts.push(`Meeting summary: ${summary.trim()}`);
  }
  if (Array.isArray(actionItems) && actionItems.length > 0) {
    parts.push(`Action items: ${actionItems.join("; ")}`);
  }
  if (envelope.occurredAt) parts.push(`Date: ${envelope.occurredAt.slice(0, 10)}`);
  const text = parts.join("\n");
  return text.length >= MIN_TEXT_CHARS ? text : null;
}

interface PersonRow {
  id: string;
  name: string;
  email: string | null;
}

export async function producePersonObservations(input: {
  workspaceId: string;
  captureId: string;
  envelope: CaptureEnvelope;
  source: string;
  actorUserId?: string;
}): Promise<{ noted: number; reason?: string }> {
  const text = observationText(input.envelope);
  if (!text) return { noted: 0, reason: "no-text" };

  const admin = createAdminClient();

  // One pass per capture: any note carrying this capture ref means we ran.
  const { data: existing } = await admin
    .from("notes")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_ref", input.captureId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { noted: 0, reason: "already-processed" };
  }

  // Observations only land on persons that already exist (admission-gated,
  // same bar as the field producers — detection never creates records).
  const emails = [
    ...new Set(
      input.envelope.participants
        .map((p) => p.email?.toLowerCase())
        .filter((e): e is string => !!e),
    ),
  ];
  if (emails.length === 0) return { noted: 0, reason: "no-participants" };

  const { data: peopleData } = await admin
    .from("people")
    .select("id, name, email")
    .eq("workspace_id", input.workspaceId)
    .in("email", emails)
    .is("deleted_at", null);
  const people = (peopleData as PersonRow[] | null) ?? [];
  if (people.length === 0) return { noted: 0, reason: "no-resolved-persons" };

  const roster = people.map((p) => `${p.name} <${p.email}>`).join(", ");
  const response = await sendLlm(
    [
      {
        role: "user",
        content: `${OBSERVATION_PROMPT.replace("{{ROSTER}}", roster)}\n\nCapture:\n${text}`,
      },
    ],
    backgroundSpend(input.workspaceId, input.actorUserId),
    { routingKey: "extraction", maxTokens: 800, temperature: 0.2 },
  );
  if (!response) return { noted: 0, reason: "llm-unavailable" };

  let parsed: z.infer<typeof ObservationSchema>;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { noted: 0, reason: "llm-unparseable" };
    parsed = ObservationSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    return { noted: 0, reason: "llm-unparseable" };
  }

  let noted = 0;
  for (const observation of parsed.observations) {
    const byEmail = people.find(
      (p) => p.email?.toLowerCase() === observation.personEmail?.toLowerCase(),
    );
    // Fall back to the only resolved person only when the model left the
    // observation unattributed — never override an explicit attribution.
    const person =
      byEmail ??
      (!observation.personEmail && people.length === 1 ? people[0] : undefined);
    if (!person) continue;

    const result = await insertSaltNote(input.workspaceId, {
      entityType: "person",
      entityId: person.id,
      entityName: person.name,
      content: observation.content,
      noteKind: observation.noteKind,
      source: "ai_capture",
      sourceRef: input.captureId,
      confidence: observation.confidence,
    });
    if (!result.noteId) continue;

    noted++;
    await runCareForSignal({
      workspaceId: input.workspaceId,
      signalKey: "person_observation_detected",
      entityType: "person",
      entityId: person.id,
      entityLabel: person.name,
      evidence: {
        signalValues: { person_observation_detected: observation.content },
        captureId: input.captureId,
        noteId: result.noteId,
        noteKind: observation.noteKind,
        producer: input.source,
      },
    });
  }

  return { noted };
}
