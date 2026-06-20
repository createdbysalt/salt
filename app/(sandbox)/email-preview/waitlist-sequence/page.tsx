import { notFound } from "next/navigation";
import Link from "next/link";
import {
  WAITLIST_SEQUENCE_EMAILS,
  WAITLIST_SEQUENCE_SLUGS,
} from "@/app/_lib/email/waitlist-sequence-emails";
import {
  WAITLIST_CONFIRMATION_SUBJECT,
} from "@/app/_lib/email/waitlist-emails";

export const metadata = {
  title: "Waitlist email sequence previews",
  robots: { index: false, follow: false },
};

export default function WaitlistSequenceIndexPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 px-6 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Email preview · dev only · Resend
        </p>
        <h1 className="mt-2 text-lg font-medium text-white">
          Waitlist email sequence
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Based on{" "}
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
            waitlist-sequence.md
          </code>
          . Pure white outer background on all templates.
        </p>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <ul className="space-y-3">
          <li>
            <Link
              href="/email-preview/waitlist"
              className="block rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 transition hover:border-neutral-600 hover:bg-neutral-900"
            >
              <p className="font-medium text-white">Email 1 · Confirmation</p>
              <p className="mt-1 text-sm text-neutral-400">
                {WAITLIST_CONFIRMATION_SUBJECT}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Immediate on signup
              </p>
            </Link>
          </li>

          {WAITLIST_SEQUENCE_SLUGS.map((slug) => {
            const { meta } = WAITLIST_SEQUENCE_EMAILS[slug];
            return (
              <li key={slug}>
                <Link
                  href={`/email-preview/waitlist-sequence/${slug}`}
                  className="block rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 transition hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <p className="font-medium text-white">{meta.label}</p>
                  <p className="mt-1 text-sm text-neutral-400">{meta.subject}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Hero: {meta.heroHeadline} · {meta.trigger}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
