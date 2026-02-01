"use client";

import { useEffect, useState } from "react";
import Cal from "@calcom/embed-react";
import type { MeetingType } from "../types";

/**
 * Configuration for the BookingEmbed component
 */
interface BookingEmbedProps {
  /** The Cal.com username or team slug */
  calUsername: string;
  /** Event type slug (e.g., "discovery-call", "kickoff", "check-in") */
  eventSlug?: string;
  /** Studio ID to pass as metadata */
  studioId: string;
  /** Client ID to pass as metadata */
  clientId: string;
  /** Optional project ID to pass as metadata */
  projectId?: string;
  /** Meeting type category */
  meetingType?: MeetingType;
  /** Custom styles for the container */
  className?: string;
  /** Height of the embed (default: "600px") */
  height?: string;
  /** Whether to hide event type details */
  hideEventTypeDetails?: boolean;
  /** Pre-fill guest name */
  guestName?: string;
  /** Pre-fill guest email */
  guestEmail?: string;
}

/**
 * Meeting type to Cal.com event slug mapping
 */
const MEETING_TYPE_SLUGS: Record<MeetingType, string> = {
  discovery: "discovery-call",
  kickoff: "kickoff-meeting",
  "check-in": "check-in",
  review: "project-review",
  other: "meeting",
};

/**
 * BookingEmbed - Embedded Cal.com booking widget
 *
 * Renders a Cal.com scheduling embed that passes client and studio metadata
 * for webhook processing. Supports different meeting types.
 *
 * @example
 * ```tsx
 * <BookingEmbed
 *   calUsername="studio-name"
 *   studioId="studio_123"
 *   clientId="client_456"
 *   meetingType="discovery"
 * />
 * ```
 */
export function BookingEmbed({
  calUsername,
  eventSlug,
  studioId,
  clientId,
  projectId,
  meetingType = "other",
  className,
  height = "600px",
  hideEventTypeDetails = false,
  guestName,
  guestEmail,
}: BookingEmbedProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Avoid SSR issues with Cal embed
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build the cal link with event type
  const resolvedEventSlug = eventSlug || MEETING_TYPE_SLUGS[meetingType];
  const calLink = `${calUsername}/${resolvedEventSlug}`;

  // Build config with metadata and prefill
  const config: Record<string, string | Record<string, string>> = {
    // Metadata for webhook processing
    metadata: {
      studioId,
      clientId,
      ...(projectId && { projectId }),
      meetingType,
    },
    // Layout options
    layout: "month_view",
    ...(hideEventTypeDetails && { hideEventTypeDetails: "true" }),
  };

  // Add guest prefill if provided
  if (guestName) {
    config.name = guestName;
  }
  if (guestEmail) {
    config.email = guestEmail;
  }

  // Don't render on server
  if (!isMounted) {
    return (
      <div
        className={className}
        style={{ height, minHeight: height }}
        aria-label="Loading booking calendar..."
      >
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Loading calendar...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, minHeight: height }}>
      <Cal
        calLink={calLink}
        config={config}
        style={{
          width: "100%",
          height: "100%",
          overflow: "scroll",
        }}
      />
    </div>
  );
}

export default BookingEmbed;
