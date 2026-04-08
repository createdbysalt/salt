"use client";

import { useEffect, useState } from "react";
import Cal from "@calcom/embed-react";

/**
 * Configuration for the PublicBookingEmbed component
 * Used for lead capture where no client exists yet
 */
interface PublicBookingEmbedProps {
  /** The Cal.com username or team slug */
  calUsername: string;
  /** Event type slug (e.g., "discovery-call") */
  eventSlug?: string;
  /** Studio ID to pass as metadata */
  studioId: string;
  /** Custom styles for the container */
  className?: string;
  /** Height of the embed (default: "700px") */
  height?: string;
}

/**
 * PublicBookingEmbed - Lead capture booking widget
 *
 * Similar to BookingEmbed but designed for public pages where
 * no client exists yet. The webhook will auto-create a client
 * when the booking is confirmed.
 *
 * Key difference: No clientId required. The webhook handler
 * will create a new client with lifecycle_stage='lead'.
 *
 * @example
 * ```tsx
 * <PublicBookingEmbed
 *   calUsername="my-studio"
 *   studioId="studio_123"
 *   eventSlug="discovery-call"
 * />
 * ```
 */
export function PublicBookingEmbed({
  calUsername,
  eventSlug = "discovery-call",
  studioId,
  className,
  height = "700px",
}: PublicBookingEmbedProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Avoid SSR issues with Cal embed
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build the cal link with event type
  const calLink = `${calUsername}/${eventSlug}`;

  // Config with metadata - note: no clientId, just studioId
  // This signals to the webhook that a new client should be created
  const config: Record<string, string | Record<string, string>> = {
    metadata: {
      studioId,
      source: "public_booking", // Marker for lead capture
      meetingType: "discovery",
    },
    layout: "month_view",
  };

  // Loading state
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

export default PublicBookingEmbed;
