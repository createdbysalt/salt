import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BridgeLoginForm } from "../components/table-login-form";
import { getStudioBrandingBySlug } from "@/app/_lib/table/queries";
import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ studioSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioSlug } = await params;
  const studioBranding = await getStudioBrandingBySlug(studioSlug);

  if (!studioBranding) {
    return { title: "Not Found | The Bridge" };
  }

  return {
    title: `Sign In | ${studioBranding.studioName}`,
    description: `Access your client portal for ${studioBranding.studioName}`,
  };
}

/**
 * Studio-branded Bridge login page.
 *
 * URLs like table.usesalt.io/saltstudio show that studio's branding.
 * If the studio has no custom branding configured, uses SALT defaults
 * but still shows the studio name for personalization.
 * If the slug doesn't match any studio, returns 404.
 */
export default async function StudioBridgePage({ params }: Props) {
  const { studioSlug } = await params;

  // Look up studio by slug
  const studioBranding = await getStudioBrandingBySlug(studioSlug);

  // If slug doesn't match any studio, 404
  if (!studioBranding) {
    notFound();
  }

  // Check if user is already authenticated
  const { context } = await getTenantContext();

  if (context.userId) {
    // If authenticated, redirect to main Bridge (tenant routing handles the rest)
    redirect("/table");
  }

  // Pass studio branding to login form
  // If studio hasn't configured branding, resolveBrandingConfig() already
  // provides SALT defaults - we just use the studio name for personalization
  return (
    <BridgeLoginForm
      studioName={studioBranding.studioName}
      supportEmail={studioBranding.supportEmail}
      branding={studioBranding.branding}
    />
  );
}
