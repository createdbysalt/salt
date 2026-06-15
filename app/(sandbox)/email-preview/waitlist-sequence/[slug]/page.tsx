import { notFound } from "next/navigation";
import Link from "next/link";
import {
  WAITLIST_SEQUENCE_EMAILS,
  buildWaitlistSequenceEmail,
  isWaitlistSequenceSlug,
} from "@/app/_lib/email/waitlist-sequence-emails";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(WAITLIST_SEQUENCE_EMAILS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (!isWaitlistSequenceSlug(slug)) {
    return { title: "Waitlist email preview" };
  }

  return {
    title: `${WAITLIST_SEQUENCE_EMAILS[slug].meta.label} preview`,
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistSequenceEmailPreviewPage({
  params,
}: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { slug } = await params;
  if (!isWaitlistSequenceSlug(slug)) {
    notFound();
  }

  const { meta } = WAITLIST_SEQUENCE_EMAILS[slug];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { html } = buildWaitlistSequenceEmail(slug, { siteUrl });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Email preview · dev only · Resend
        </p>
        <h1 className="mt-2 text-lg font-medium text-white">{meta.label}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          <Link
            href="/email-preview/waitlist-sequence"
            className="text-neutral-300 underline underline-offset-2 hover:text-white"
          >
            All sequence emails
          </Link>
          {" · "}
          {meta.trigger}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Subject</dt>
            <dd className="mt-1 text-white">{meta.subject}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Inbox preview</dt>
            <dd className="mt-1 text-neutral-300">{meta.previewText}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Hero headline</dt>
            <dd className="mt-1 text-white">{meta.heroHeadline}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Hero subtitle</dt>
            <dd className="mt-1 text-neutral-300">{meta.heroSubtitle}</dd>
          </div>
        </dl>
      </header>

      <div className="mx-auto max-w-[600px] px-4 py-8">
        <iframe
          title={meta.label}
          srcDoc={html}
          className="min-h-[1400px] w-full rounded-xl border border-neutral-800 bg-white shadow-2xl"
          sandbox="allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
