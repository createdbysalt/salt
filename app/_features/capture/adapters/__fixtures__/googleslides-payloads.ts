/**
 * Golden payload fixtures for the Google Slides capture adapter.
 *
 * PROVENANCE: derived 2026-08-05 from the live Composio trigger payload
 * schemas (composio-trigger-schemas.json). GOOGLESLIDES_SLIDE_ADDED_TRIGGER
 * wraps the slide in a `slide` envelope: { slide: {...}, event_type }. The
 * slide object is schemaless in Composio (additionalProperties: true) —
 * Slides API objects use `objectId`; presentation-level fields may appear.
 * Validate against a live event when the trigger first fires (Phase 8).
 */

/** GOOGLESLIDES_SLIDE_ADDED_TRIGGER — Slides API shape (objectId). */
export const GOOGLESLIDES_TRIGGER_SLIDE_ADDED = {
  event_type: "slide_added",
  slide: {
    objectId: "SLIDES_API1234567890",
    presentationId: "1PrEsEnTaTiOnId0123456789",
    presentationName: "Pitch Deck v3",
  },
};

/** Drive-file-style shape (id + name) — must also parse. */
export const GOOGLESLIDES_TRIGGER_DRIVE_SHAPE = {
  event_type: "slide_added",
  slide: {
    id: "1DrIvEfIlEsHaPeId",
    name: "Workshop Deck",
    modifiedTime: "2026-08-05T13:00:00.000Z",
    webViewLink: "https://docs.google.com/presentation/d/1DrIvEfIlEsHaPeId/edit",
  },
};

/** No usable id — decline. */
export const GOOGLESLIDES_MALFORMED = {
  event_type: "slide_added",
  slide: { somethingElse: true },
};
