/**
 * Note Extractor — Extract entity learnings from capture content
 *
 * Analyzes emails, meetings, and other capture sources to identify
 * note-worthy facts, preferences, context, and flags about entities.
 * Creates notes via the keeper-entity-notes playbook.
 */

import { z } from "zod";
import type { EntityType } from "@/app/_features/memory/queries/entity-notes";
import type { NoteKind, EntityNoteKind } from "@/app/_features/memory/utils/note-classification";
import {
  classifyTags,
  classifyRoute,
  shouldAutoPin,
} from "@/app/_features/memory/utils/note-classification";

export const NOTE_KIND_VALUES = [
  "fact",
  "preference",
  "context",
  "relationship",
  "flag",
] as const satisfies readonly EntityNoteKind[];

export const ExtractedNoteSchema = z.object({
  content: z.string().min(1).max(500),
  note_kind: z.enum(NOTE_KIND_VALUES),
  confidence: z.number().min(0).max(100),
  evidence_quote: z.string().optional(),
});

export type ExtractedNote = z.infer<typeof ExtractedNoteSchema>;

export interface NoteExtractionInput {
  sourceType: "email" | "meeting" | "call" | "document";
  sourceId: string;
  content: string;
  subject?: string;
  anchorEntity: {
    type: EntityType;
    id: string;
    name: string;
  };
  relatedEntities?: {
    meetingId?: string;
    workId?: string;
    billingId?: string;
    orgId?: string;
  };
}

export interface NoteExtractionResult {
  notes: Array<{
    content: string;
    noteKind: EntityNoteKind;
    confidence: number;
    evidenceQuote?: string;
    targetEntityType: EntityType;
    targetEntityId: string;
    tags: string[];
    shouldPin: boolean;
  }>;
}

const NOTE_EXTRACTION_PATTERNS: Array<{
  pattern: RegExp;
  noteKind: EntityNoteKind;
  confidence: number;
}> = [
  // Preferences
  { pattern: /\b(prefers?|rather|likes? to|always wants?|never wants?)\b/i, noteKind: "preference", confidence: 80 },
  { pattern: /\b(don'?t like|avoid|hate|can'?t stand)\b/i, noteKind: "preference", confidence: 75 },
  { pattern: /\b(morning person|night owl|early bird)\b/i, noteKind: "preference", confidence: 85 },

  // Facts
  { pattern: /\b(works? at|employed by|joined|started at)\b/i, noteKind: "fact", confidence: 85 },
  { pattern: /\b(lives? in|based in|located in|moved to)\b/i, noteKind: "fact", confidence: 80 },
  { pattern: /\b(birthday|born on|turns? \d+|anniversary)\b/i, noteKind: "fact", confidence: 90 },
  { pattern: /\b(graduated|studied|degree in|alumni)\b/i, noteKind: "fact", confidence: 80 },

  // Context
  { pattern: /\b(first (payment|invoice|project|meeting)|started working)\b/i, noteKind: "context", confidence: 85 },
  { pattern: /\b(been (working|collaborating) (with|on))\b/i, noteKind: "context", confidence: 75 },
  { pattern: /\b(history with|background on|context:)\b/i, noteKind: "context", confidence: 70 },

  // Relationship
  { pattern: /\b(referred by|introduced by|got your name from|recommended by)\b/i, noteKind: "relationship", confidence: 90 },
  { pattern: /\b(knows?|connected to|friends? with|colleagues? with)\b/i, noteKind: "relationship", confidence: 75 },
  { pattern: /\b(spouse|partner|wife|husband|family)\b/i, noteKind: "relationship", confidence: 80 },

  // Flags
  { pattern: /\b(no contact|haven'?t heard|ghosted|radio silence)\b/i, noteKind: "flag", confidence: 85 },
  { pattern: /\b(frustrated|upset|unhappy|disappointed|concerned)\b/i, noteKind: "flag", confidence: 70 },
  { pattern: /\b(risk|warning|heads up|careful|watch out)\b/i, noteKind: "flag", confidence: 75 },
  { pattern: /\b(overdue|late|missed deadline|behind schedule)\b/i, noteKind: "flag", confidence: 80 },
];

/**
 * Extract sentences that contain note-worthy patterns.
 */
function extractNoteSentences(content: string): Array<{
  sentence: string;
  noteKind: EntityNoteKind;
  confidence: number;
}> {
  const sentences = content
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 300);

  const results: Array<{
    sentence: string;
    noteKind: EntityNoteKind;
    confidence: number;
  }> = [];

  for (const sentence of sentences) {
    for (const { pattern, noteKind, confidence } of NOTE_EXTRACTION_PATTERNS) {
      if (pattern.test(sentence)) {
        results.push({ sentence, noteKind, confidence });
        break; // One match per sentence
      }
    }
  }

  return results;
}

/**
 * Extract note-worthy learnings from capture content.
 * Uses heuristics to identify facts, preferences, context, relationships, and flags.
 */
export function extractNotes(input: NoteExtractionInput): NoteExtractionResult {
  const { sourceType, content, anchorEntity, relatedEntities } = input;

  const extracted = extractNoteSentences(content);
  const notes: NoteExtractionResult["notes"] = [];

  for (const { sentence, noteKind, confidence } of extracted) {
    // Classify which entity this note should be routed to
    const route = classifyRoute({
      content: sentence,
      sourceType,
      sourceMeetingId: relatedEntities?.meetingId,
      sourceWorkId: relatedEntities?.workId,
      sourceBillingId: relatedEntities?.billingId,
      anchorEntityType: anchorEntity.type,
      anchorEntityId: anchorEntity.id,
    });

    // Classify tags based on content
    const tags = classifyTags({
      content: sentence,
      sourceType,
    });

    // Determine if should auto-pin
    const shouldPin = shouldAutoPin({
      tags,
      noteKind,
      confidence,
      createdAt: new Date(),
    });

    notes.push({
      content: sentence,
      noteKind,
      confidence,
      targetEntityType: route.entityType,
      targetEntityId: route.entityId,
      tags,
      shouldPin,
    });
  }

  // Limit to top 3 notes per extraction (highest confidence first)
  return {
    notes: notes
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3),
  };
}

/**
 * LLM prompt for more sophisticated note extraction.
 * Used when heuristics find potential notes but need LLM refinement.
 */
export const NOTE_EXTRACTION_SYSTEM_PROMPT = `You are analyzing content to extract note-worthy learnings about people, organizations, or work.

Extract ONLY information that is:
1. **Durable** - Facts, preferences, or context that will still be relevant in 6 months
2. **Specific** - About a particular person, org, or project (not generic)
3. **Actionable** - Helps the user work better with this entity

Categories:
- **fact**: Objective information (job title, location, birthday, education)
- **preference**: How they prefer to work (communication style, meeting times, tool preferences)
- **context**: Background about the relationship (how you met, first project, history)
- **relationship**: How entities connect (referrals, family, colleagues)
- **flag**: Things needing attention (no contact, frustration, risk signals)

Do NOT extract:
- Generic pleasantries or filler
- Information about the email/message itself
- Anything about the operator (the user sending/receiving)
- Duplicate information already in profile fields

Return JSON array of notes, max 3:
[
  {
    "content": "Clear, concise note (1-2 sentences max)",
    "note_kind": "fact|preference|context|relationship|flag",
    "confidence": 70-100,
    "evidence_quote": "The exact quote from the content"
  }
]`;

export function parseExtractedNotes(raw: unknown): ExtractedNote[] {
  if (!Array.isArray(raw)) return [];
  const parsed: ExtractedNote[] = [];
  for (const item of raw) {
    const result = ExtractedNoteSchema.safeParse(item);
    if (result.success) {
      parsed.push(result.data);
    }
  }
  return parsed.slice(0, 3);
}
