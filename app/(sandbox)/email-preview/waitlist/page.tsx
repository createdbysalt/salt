import { notFound } from "next/navigation";
import {
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
        </dl>
      </header>

      <div className="mx-auto max-w-[600px] px-4 py-8">
        <iframe
          title="Waitlist confirmation email"
          srcDoc={html}
          className="min-h-[1400px] w-full rounded-xl border border-neutral-800 bg-[#f6f3ec] shadow-2xl"
          sandbox="allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
