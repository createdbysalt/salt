import type { Metadata } from "next";
import { WaitlistFlow } from "@/app/_features/marketing/landing2/WaitlistFlow";
import { isValidWaitlistEmail } from "@/app/_features/marketing/waitlist-qualification";

export const metadata: Metadata = {
  title: "Join the Salt waitlist",
  description: "Tell us a bit about your business and join the Salt waitlist.",
  robots: { index: false, follow: false },
};

type WaitlistPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    source?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const params = await searchParams;
  const email = firstParam(params.email);
  const source = firstParam(params.source);

  const resolvedEmail =
    email && isValidWaitlistEmail(email) ? email.trim() : undefined;

  return (
    <WaitlistFlow
      initialEmail={resolvedEmail}
      source={source?.trim() || "landing2"}
    />
  );
}
