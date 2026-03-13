import { headers } from "next/headers";
import { BridgeLoginForm } from "../components/bridge-login-form";
import {
  getStudioBrandingForLogin,
  getDefaultLoginBranding,
} from "@/app/_lib/bridge/queries";

export const dynamic = "force-dynamic";

/**
 * Bridge login page (path: /login on bridge subdomain)
 *
 * This page exists as a fallback for direct navigation to /login.
 * The main bridge home page (/) shows the login form inline when not authenticated.
 *
 * For custom domains, this page shows studio branding immediately - no email
 * lookup needed since we know which studio owns the domain.
 */
export default async function BridgeLoginPage() {
  // Get studio branding for custom domain, or use defaults
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const studioBranding =
    (await getStudioBrandingForLogin(host)) || getDefaultLoginBranding();

  return (
    <BridgeLoginForm
      studioName={studioBranding.studioName}
      supportEmail={studioBranding.supportEmail}
      branding={studioBranding.branding}
    />
  );
}
