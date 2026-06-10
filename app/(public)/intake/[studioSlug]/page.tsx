import { notFound } from "next/navigation";
import { getSEOTags } from "@/app/_lib/seo";
import { getStudioBySlug } from "@/app/_features/intake/queries";
import { IntakeForm } from "@/app/_features/intake/components/IntakeForm";

interface IntakePageProps {
  params: Promise<{ studioSlug: string }>;
}

export async function generateMetadata({ params }: IntakePageProps) {
  const { studioSlug } = await params;
  const studio = await getStudioBySlug(studioSlug);

  if (!studio) {
    return getSEOTags({ title: "Workspace Not Found" });
  }

  return getSEOTags({
    title: `Start Your Project | ${studio.name}`,
    description: `Share your project details with ${studio.name}. Complete our quick intake form to get started.`,
    canonicalUrlRelative: `/intake/${studio.slug}`,
  });
}

export default async function IntakePage({ params }: IntakePageProps) {
  const { studioSlug } = await params;
  const studio = await getStudioBySlug(studioSlug);

  if (!studio) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tell us about your project
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Share a few details and we&apos;ll prepare a personalized snapshot
            of your brand.
          </p>
        </div>

        {/* Intake Form */}
        <IntakeForm studioId={studio.id} studioName={studio.name} />
      </div>
    </main>
  );
}
