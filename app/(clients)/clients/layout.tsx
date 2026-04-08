import { triggerBackgroundBookingSync } from "@/app/_features/meetings/calcom-sync";

interface ClientsLayoutProps {
  children: React.ReactNode;
}

/**
 * Clients Layout - Container for clients routes
 * Each child route (list, detail) provides its own header
 *
 * Also triggers a background Cal.com booking sync to capture new leads.
 */
export default async function ClientsLayout({ children }: ClientsLayoutProps) {
  // Trigger background sync for Cal.com bookings (non-blocking, debounced)
  triggerBackgroundBookingSync();

  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
