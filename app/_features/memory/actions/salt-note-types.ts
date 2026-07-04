import type { EntityNoteKind, NoteSource, NoteStatus } from "@/app/_features/memory/types/taxonomies";

export const KEEPER_ENTITY_NOTES_SLUG = "keeper-entity-notes";

export interface CreateSaltNoteInput {
  entityType: "person" | "organization" | "work";
  entityId: string;
  entityName?: string;
  content: string;
  title?: string;
  noteKind: EntityNoteKind;
  source: Exclude<NoteSource, "manual">;
  sourceRef?: string;
  confidence: number;
}

export interface CreateSaltNoteResult {
  success: boolean;
  noteId?: string;
  status?: NoteStatus;
  error?: string;
}

export interface ConfirmSaltNoteInput {
  noteId: string;
}

export interface DismissSaltNoteInput {
  noteId: string;
}
