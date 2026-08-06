/**
 * Capture stream pagination constants, shared between the server loader
 * (`load-plays-page-data.ts`), the load-more server action, and the
 * `CaptureStreamTab` client (which infers "has more" from the initial limit).
 */
export const CAPTURE_STREAM_INITIAL_LIMIT = 100;
export const CAPTURE_STREAM_PAGE_SIZE = 50;
