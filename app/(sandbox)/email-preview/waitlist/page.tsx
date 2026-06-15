import { notFound } from "next/navigation";
import Link from "next/link";
import {
  WAITLIST_CONFIRMATION_HERO_HEADLINE,
  WAITLIST_CONFIRMATION_HERO_SUBTITLE,
  WAITLIST_CONFIRMATION_PREVIEW,
  WAITLIST_CONFIRMATION_SUBJECT,
  buildWaitlistConfirmationEmail,
} from "@/app/_lib/email/waitlist-emails";

export const metadata = {
  title: "Waitlist confirmation email preview",
  robots: { index: false, follow: false },
};

export default function WaitlistEmailPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { html } = buildWaitlistConfirmationEmail({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Email preview · dev only
        </p>
        <h1 className="mt-2 text-lg font-medium text-white">
          Waitlist confirmation
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          <Link
            href="/email-preview/waitlist-sequence"
            className="text-neutral-300 underline underline-offset-2 hover:text-white"
          >
            Full sequence (emails 2–8)
          </Link>
          {" · "}
          Sent via Resend after signup
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Subject</dt>
            <dd className="mt-1 text-white">{WAITLIST_CONFIRMATION_SUBJECT}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Inbox preview</dt>
            <dd className="mt-1 text-neutral-300">
              {WAITLIST_CONFIRMATION_PREVIEW}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Hero headline</dt>
            <dd className="mt-1 text-white">
              {WAITLIST_CONFIRMATION_HERO_HEADLINE}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Hero subtitle</dt>
            <dd className="mt-1 text-neutral-300">
              {WAITLIST_CONFIRMATION_HERO_SUBTITLE}
            </dd>
          </div>
        </dl>
      </header>

      <div className="mx-auto max-w-[600px] px-4 py-8">
        <iframe
          title="Waitlist confirmation email"
          srcDoc={html}
          className="min-h-[1400px] w-full rounded-xl border border-neutral-800 bg-white shadow-2xl"
          sandbox="allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
