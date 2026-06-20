import type { Metadata } from "next";
import { WaitlistFlow } from "@/app/_features/marketing/landing2/WaitlistFlow";
import { fetchResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import { isValidWaitlistEmail } from "@/app/_features/marketing/waitlist-qualification";

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

export async function generateMetadata(): Promise<Metadata> {
  const form = await fetchResolvedWaitlistForm();

  return {
    title: form.heading,
    description: form.subheading ?? "Tell us a bit about your business and join the Salt waitlist.",
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const [params, form] = await Promise.all([
    searchParams,
    fetchResolvedWaitlistForm(),
  ]);

  const email = firstParam(params.email);
  const source = firstParam(params.source);

  const resolvedEmail =
    email && isValidWaitlistEmail(email) ? email.trim() : undefined;

  return (
    <WaitlistFlow
      form={form}
      initialEmail={resolvedEmail}
      source={source?.trim()}
    />
  );
}
