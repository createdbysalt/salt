/**
 * Capture stream pagination constants, shared between the server loader
 * (`load-sources-page-data.ts`), the `get-capture-stream-page` server action,
 * and the `CaptureStreamTab` client.
 */
export const CAPTURE_STREAM_PAGE_SIZES = [25, 50, 100] as const;
export type CaptureStreamPageSize = (typeof CAPTURE_STREAM_PAGE_SIZES)[number];
export const DEFAULT_CAPTURE_STREAM_PAGE_SIZE: CaptureStreamPageSize = 50;
