/**
 * Propose Work Name
 *
 * Work records are named for the work, never the client. The deterministic
 * birth path copies the email subject, which produces person-flavored names
 * ("Barrett on the Studio") whenever the subject isn't an exact known-contact
 * match. This module adds one small LLM read at creation time: given the
 * email's subject, body excerpt, attachment filenames, and sender, propose
 * the project/engagement name ("Playground Website").
 *
 * Contract (mirrors content-analysis.ts): the name is NEVER a person's name;
 * agreement/SOW/proposal filenames outrank subject lines; null when no
 * project is identifiable. Every rejection falls back to the deterministic
 * naming in auto-create-record.ts — naming must never block a birth.
 *
 * Metered at the LLM primitive (sendLlm meters itself) as background spend:
 * nobody is waiting on this call, so budget pressure defers it rather than
 * refusing a record birth.
 */

import { z } from "zod";
import { sendLlm, backgroundSpend } from "@/app/_lib/ai/gpt";

/** Below this confidence the deterministic naming path keeps the pen. */
export const WORK_NAME_CONFIDENCE_THRESHOLD = 70;

const MAX_BODY_EXCERPT_CHARS = 3_000;

const WorkNameResponseSchema = z.object({
  projectName: z.string().max(120).nullish(),
  confidence: z.number().min(0).max(100).nullish(),
});

export interface WorkNamingContext {
  workspaceId: string;
  subject?: string;
  bodyExcerpt?: string;
  attachmentNames?: string[];
  senderName?: string | null;
  counterparty?: string;
  /** Known person/org names — a proposal matching one is a thread artifact. */
  knownEntityNames?: string[];
  actorUserId?: string;
}

export interface WorkNameProposal {
  name: string;
  confidence: number;
}

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * True when a proposed name is really a person/org — the sender, the
 * thread's counterparty, or a known entity. Exact normalized match only;
 * substantive names that merely contain a name ("Barrett on the Studio" is
 * filtered by the prompt contract, not here) pass through.
 */
export function isPersonNameCollision(
  name: string,
  context: Pick<
    WorkNamingContext,
    "senderName" | "counterparty" | "knownEntityNames"
  >,
): boolean {
  const normalized = normalizeName(name);
  if (!normalized) return true;
  const collisions = [
    context.senderName,
    context.counterparty,
    ...(context.knownEntityNames ?? []),
  ];
  return collisions.some(
    (entry) => entry && normalizeName(entry) === normalized,
  );
}

export function buildWorkNamingPrompt(context: WorkNamingContext): string {
  const sections: string[] = [];
  if (context.subject) sections.push(`Subject: ${context.subject}`);
  if (context.senderName) sections.push(`From: ${context.senderName}`);
  if (context.attachmentNames && context.attachmentNames.length > 0) {
    sections.push(`Attachments: ${context.attachmentNames.join(", ")}`);
  }
  if (context.bodyExcerpt) {
    sections.push(
      `Body excerpt:\n${context.bodyExcerpt.slice(0, MAX_BODY_EXCERPT_CHARS)}`,
    );
  }

  return `You are naming a new work record (a project or engagement) in a solo professional's workspace, based on an email that shows the work exists.

Return ONLY valid JSON with this exact structure:
{ "projectName": "...", "confidence": 0 }

Rules:
- projectName: the name of the project or engagement (e.g. "Playground Website", "Brand Refresh") — NEVER the client's or a person's name.
- Prefer names from attached document filenames (service agreements, SOWs, proposals, quotes) over the email subject — "Playground Website Service Agreement.pdf" means the project is "Playground Website". Drop the document-type suffix ("Service Agreement", "SOW", "Proposal") from the name.
- A subject that names a person ("Barrett on the Studio", "Call with Jane") is about someone, not the work — look to the attachments and body for the project.
- If the subject substantively names the project ("Website Redesign Kickoff"), use it.
- If no project can be identified, return { "projectName": null, "confidence": 0 }.
- confidence: 0-100, how sure you are this is the right project name.

Email context:
${sections.join("\n")}`;
}

/**
 * One cheap LLM read proposing a work name from email context. Returns null
 * on every failure mode (no context, LLM unavailable, unparseable, low
 * confidence, person-name collision) — callers fall back to deterministic
 * naming.
 */
export async function proposeWorkName(
  context: WorkNamingContext,
): Promise<WorkNameProposal | null> {
  const hasContext = Boolean(
    context.subject ||
      context.bodyExcerpt ||
      (context.attachmentNames && context.attachmentNames.length > 0),
  );
  if (!hasContext) return null;

  const response = await sendLlm(
    [{ role: "user", content: buildWorkNamingPrompt(context) }],
    backgroundSpend(context.workspaceId, context.actorUserId),
    { routingKey: "workNaming", maxTokens: 150, temperature: 0.1 },
  );
  if (!response) return null;

  let parsed: z.infer<typeof WorkNameResponseSchema>;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    parsed = WorkNameResponseSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    return null;
  }

  const name = parsed.projectName?.trim();
  if (!name) return null;
  const confidence = parsed.confidence ?? 0;
  if (confidence < WORK_NAME_CONFIDENCE_THRESHOLD) return null;
  if (isPersonNameCollision(name, context)) return null;

  return { name, confidence };
}

// =============================================================================
// WORK-CONTEXT SYNTHESIS (Memory Care periodic re-understanding)
// =============================================================================

const WorkSynthesisSchema = z.object({
  canonicalName: z.string().max(120).nullish(),
  summary: z.string().max(500).nullish(),
  confidence: z.number().min(0).max(100).nullish(),
});

export interface WorkSynthesisContext {
  workspaceId: string;
  currentName: string;
  /** Subjects of captures linked to the work. */
  subjects?: string[];
  /** Body excerpts from linked captures and resources. */
  bodyExcerpts?: string[];
  /** Document evidence: resource filenames and attachment names. */
  documentNames?: string[];
  /** Linked person/org names — a proposal matching one is rejected. */
  knownEntityNames?: string[];
  actorUserId?: string;
}

export interface WorkSynthesisProposal {
  canonicalName: string | null;
  summary: string | null;
  confidence: number;
}

export function buildWorkSynthesisPrompt(context: WorkSynthesisContext): string {
  const sections: string[] = [`Current name: ${context.currentName}`];
  if (context.subjects && context.subjects.length > 0) {
    sections.push(`Email subjects:\n${context.subjects.map((s) => `- ${s}`).join("\n")}`);
  }
  if (context.documentNames && context.documentNames.length > 0) {
    sections.push(`Documents:\n${context.documentNames.map((d) => `- ${d}`).join("\n")}`);
  }
  if (context.knownEntityNames && context.knownEntityNames.length > 0) {
    sections.push(`People/organizations involved: ${context.knownEntityNames.join(", ")}`);
  }
  if (context.bodyExcerpts && context.bodyExcerpts.length > 0) {
    sections.push(
      `Excerpts:\n${context.bodyExcerpts
        .map((e) => `- ${e.slice(0, MAX_BODY_EXCERPT_CHARS)}`)
        .join("\n")}`,
    );
  }

  return `You are re-understanding a work record (a project or engagement) in a solo professional's workspace, from every email and document linked to it.

Return ONLY valid JSON with this exact structure:
{ "canonicalName": "...", "summary": "...", "confidence": 0 }

Rules:
- canonicalName: the name of the project or engagement (e.g. "Playground Website", "Brand Refresh") — NEVER a person's or client's name. When the current name is already a good project name, return it unchanged. When no project is identifiable, return null.
- Prefer names from agreement/SOW/proposal/quote documents over email subjects. Drop document-type suffixes ("Service Agreement", "SOW").
- summary: one sentence a busy owner would skim — what the work is and who it is for. null when unclear.
- confidence: 0-100, how sure you are the canonicalName is right. Low confidence when the evidence is thin.

Evidence:
${sections.join("\n\n")}`;
}

/**
 * Periodic re-understanding of a work record from its accumulated evidence.
 * Unlike proposeWorkName (birth, single email), this reads the whole linked
 * context. A canonicalName colliding with a known person/org is stripped —
 * the summary can still be useful. Confidence gating happens at the caller
 * (the care decision pipeline bar), not here.
 */
export async function proposeWorkSynthesis(
  context: WorkSynthesisContext,
): Promise<WorkSynthesisProposal | null> {
  const hasContext = Boolean(
    (context.subjects && context.subjects.length > 0) ||
      (context.bodyExcerpts && context.bodyExcerpts.length > 0) ||
      (context.documentNames && context.documentNames.length > 0),
  );
  if (!hasContext) return null;

  const response = await sendLlm(
    [{ role: "user", content: buildWorkSynthesisPrompt(context) }],
    backgroundSpend(context.workspaceId, context.actorUserId),
    { routingKey: "workNaming", maxTokens: 300, temperature: 0.1 },
  );
  if (!response) return null;

  let parsed: z.infer<typeof WorkSynthesisSchema>;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    parsed = WorkSynthesisSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    return null;
  }

  const confidence = parsed.confidence ?? 0;
  let canonicalName = parsed.canonicalName?.trim() || null;
  if (
    canonicalName &&
    isPersonNameCollision(canonicalName, {
      knownEntityNames: context.knownEntityNames,
    })
  ) {
    canonicalName = null;
  }
  const summary = parsed.summary?.trim() || null;

  if (!canonicalName && !summary) return null;
  return { canonicalName, summary, confidence };
}

// =============================================================================
// CAPTURE CONTEXT EXTRACTION
// =============================================================================

export interface CaptureNamingContext {
  subject?: string;
  bodyExcerpt?: string;
  attachmentNames: string[];
  senderName: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Display name from a "Name <email>" header; null for bare addresses. */
function displayNameFromHeader(from: string | undefined): string | null {
  if (!from) return null;
  const match = from.match(/^([^<]+)<[^>]+>$/);
  return match?.[1]?.trim() || null;
}

/**
 * Pull the naming context out of a capture row's extracted_data/raw_payload.
 * Local to the naming flow (rather than reusing process-capture's
 * extractEmailData) to keep auto-create-record free of the
 * process-capture → add-signal → auto-create-record import cycle.
 */
export function extractNamingContextFromCapture(
  extracted: unknown,
  raw: unknown,
): CaptureNamingContext {
  const ex = asRecord(extracted);
  const rw = asRecord(raw);

  const from =
    (ex.from as string) ||
    (ex.sender as string) ||
    (ex.sender_email as string) ||
    (rw.from as string) ||
    (rw.sender as string) ||
    (rw.sender_email as string) ||
    undefined;

  const attachmentNames: string[] = [];
  const attachments = ex.attachments ?? rw.attachments;
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      if (typeof item === "string" && item.trim()) {
        attachmentNames.push(item.trim());
      } else if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const name =
          (record.name as string) || (record.filename as string) || "";
        if (name.trim()) attachmentNames.push(name.trim());
      }
    }
  }

  return {
    subject: (ex.subject as string) || (rw.subject as string) || undefined,
    bodyExcerpt:
      (ex.body as string) ||
      (ex.snippet as string) ||
      (rw.body as string) ||
      (rw.snippet as string) ||
      undefined,
    attachmentNames,
    senderName: displayNameFromHeader(from),
  };
}
