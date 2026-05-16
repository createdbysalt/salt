import { notFound } from "next/navigation";
import { getSEOTags } from "@/app/_lib/seo";
import { getStudioBookingInfoBySlug } from "@/app/_features/booking/queries";
import { PublicBookingEmbed } from "@/app/_features/booking/components/PublicBookingEmbed";
import { AlertCircle } from "lucide-react";

interface BookPageProps {
  params: Promise<{ studioSlug: string }>;
}

export async function generateMetadata({ params }: BookPageProps) {
  const { studioSlug } = await params;
  const studio = await getStudioBookingInfoBySlug(studioSlug);

  if (!studio) {
    return getSEOTags({ title: "Studio Not Found" });
  }

  return getSEOTags({
    title: `Book a Discovery Call | ${studio.name}`,
    description: `Schedule a discovery call with ${studio.name}. Let's discuss your project and see if we're a good fit.`,
    canonicalUrlRelative: `/book/${studio.slug}`,
  });
}

export default async function BookPage({ params }: BookPageProps) {
  const { studioSlug } = await params;
  const studio = await getStudioBookingInfoBySlug(studioSlug);

  if (!studio) {
    notFound();
  }

  // Studio exists but hasn't connected Cal.com
  if (!studio.calcomUsername) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Booking Unavailable
            </h1>
            <div className="mt-8 rounded-lg border border-warning/30 bg-warning/10 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    Calendar not configured
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {studio.name} hasn&apos;t set up their booking calendar yet.
                    Please contact them directly to schedule a meeting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Book a Discovery Call
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Let&apos;s chat about your project and see if {studio.name} is the
            right fit.
          </p>
        </div>

        {/* Booking Embed */}
        <div className="rounded-lg border bg-card shadow-sm">
          <PublicBookingEmbed
            calUsername={studio.calcomUsername}
            studioId={studio.id}
            eventSlug="discovery-call"
            height="700px"
            className="p-4"
          />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          After booking, you&apos;ll receive a confirmation email with meeting
          details.
        </p>
      </div>
    </main>
  );
}
