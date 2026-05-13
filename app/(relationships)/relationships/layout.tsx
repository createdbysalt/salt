import { triggerBackgroundBookingSync } from "@/app/_features/meetings/calcom-sync";

interface RelationshipsLayoutProps {
  children: React.ReactNode;
}

/**
 * Relationships Layout - Container for relationships routes
 * Each child route (list, detail) provides its own header
 *
 * Also triggers a background Cal.com booking sync to capture new leads.
 */
export default async function RelationshipsLayout({ children }: RelationshipsLayoutProps) {
  // Trigger background sync for Cal.com bookings (non-blocking, debounced)
  triggerBackgroundBookingSync();

  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
