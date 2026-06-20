export const SEGMENT_LANDING_SLUGS = [
  "photographers",
  "coaches",
  "consultants",
  "real-estate-agents",
] as const;

export type SegmentLandingSlug = (typeof SEGMENT_LANDING_SLUGS)[number];

export function isSegmentLandingSlug(slug: string): slug is SegmentLandingSlug {
  return (SEGMENT_LANDING_SLUGS as readonly string[]).includes(slug);
}

export function segmentLandingPath(slug: SegmentLandingSlug): string {
  return `/for/${slug}`;
}
